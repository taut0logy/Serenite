"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import type { FinalAssessmentResult } from "@/lib/assessment/assemble";
import type { DomainKey } from "@/lib/assessment/types";
import { setClaimOverride } from "@/lib/set-claim-override";
import { isReassessmentDue, computeTrend, type TrendVerdict } from "@/lib/assessment/reassessment";

const saveRateLimit = new Map<string, number>();
const SAVE_MIN_INTERVAL_MS = 1000;
const MAX_ENCRYPTED_PAYLOAD_BYTES = 20_000;

const THETA_FIELDS: Record<DomainKey, { theta: string; se: string }> = {
  depression: { theta: "thetaDepression", se: "seDepression" },
  anxiety: { theta: "thetaAnxiety", se: "seAnxiety" },
  trauma: { theta: "thetaTrauma", se: "seTrauma" },
  sleep: { theta: "thetaSleep", se: "seSleep" },
  social: { theta: "thetaSocial", se: "seSocial" },
  selfWorth: { theta: "thetaSelfWorth", se: "seSelfWorth" },
};

function thetaFieldsToPrisma(thetas: FinalAssessmentResult["thetas"]) {
  const data: Record<string, number> = {};
  for (const [domain, estimate] of Object.entries(thetas) as [DomainKey, { theta: number; se: number }][]) {
    const fields = THETA_FIELDS[domain];
    data[fields.theta] = estimate.theta;
    data[fields.se] = estimate.se;
  }
  return data;
}

/**
 * Save encrypted assessment responses. Encryption happens client-side; the
 * server only ever stores ciphertext and cannot read the responses.
 */
export async function saveEncryptedResponses(
  encryptedData: string,
  iv: string,
  salt: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "User not authenticated" };

    if (encryptedData.length > MAX_ENCRYPTED_PAYLOAD_BYTES) {
      return { success: false, error: "Payload too large" };
    }

    const userId = session.user.id;
    const lastSave = saveRateLimit.get(userId) ?? 0;
    if (Date.now() - lastSave < SAVE_MIN_INTERVAL_MS) {
      return { success: false, error: "Too many requests" };
    }
    saveRateLimit.set(userId, Date.now());

    const encryptedBuffer = Buffer.from(encryptedData, "base64");
    const ivBuffer = Buffer.from(iv, "base64");
    const saltBuffer = Buffer.from(salt, "base64");

    const existing = await prisma.assessment.findFirst({
      where: { userId, isComplete: false },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await prisma.assessment.update({
        where: { id: existing.id },
        data: { encryptedData: encryptedBuffer, iv: ivBuffer, salt: saltBuffer },
      });
    } else {
      await prisma.assessment.create({
        data: { userId, encryptedData: encryptedBuffer, iv: ivBuffer, salt: saltBuffer, parameterSetId: "" },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving encrypted assessment:", error);
    return { success: false, error: "Failed to save responses" };
  }
}

export async function getEncryptedResponses(): Promise<{
  success: boolean;
  data?: { id: string; encryptedData: string; iv: string; salt: string; isComplete: boolean };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "User not authenticated" };

    const record = await prisma.assessment.findFirst({
      where: { userId: session.user.id, isComplete: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record || !record.encryptedData) return { success: true, data: undefined };

    return {
      success: true,
      data: {
        id: record.id,
        encryptedData: Buffer.from(record.encryptedData as Uint8Array).toString("base64"),
        iv: record.iv ? Buffer.from(record.iv as Uint8Array).toString("base64") : "",
        salt: record.salt ? Buffer.from(record.salt as Uint8Array).toString("base64") : "",
        isComplete: record.isComplete,
      },
    };
  } catch (error) {
    console.error("Error getting encrypted assessment:", error);
    return { success: false, error: "Failed to load responses" };
  }
}

/**
 * Complete the assessment: write the plaintext matching vector and anchor
 * scores, and mark it complete. Raw responses stay encrypted.
 */
export async function completeAssessment(
  result: FinalAssessmentResult,
  encryptedData?: string,
  iv?: string,
  salt?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "User not authenticated" };
    const userId = session.user.id;

    const thetaData = thetaFieldsToPrisma(result.thetas);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.assessment.findFirst({
        where: { userId, isComplete: false },
        orderBy: { createdAt: "desc" },
      });

      const baseData = {
        parameterSetId: result.parameterSetId,
        ...thetaData,
        phq9Raw: result.phq9Raw,
        gad7Raw: result.gad7Raw,
        pcptsd5Raw: result.pcptsd5Raw,
        traumaExposed: result.traumaExposed,
        overallSeverity: result.overallSeverity,
        priorities: result.priorities,
        riskFlag: result.riskFlag,
        riskEscalated: result.riskEscalated,
        qualityFlagged: result.qualityFlagged,
        isComplete: true,
        completedAt: new Date(),
      };

      const encryptionData =
        encryptedData && iv && salt
          ? {
              encryptedData: Buffer.from(encryptedData, "base64"),
              iv: Buffer.from(iv, "base64"),
              salt: Buffer.from(salt, "base64"),
            }
          : {};

      if (existing) {
        await tx.assessment.update({ where: { id: existing.id }, data: { ...baseData, ...encryptionData } });
      } else {
        await tx.assessment.create({ data: { userId, ...baseData, ...encryptionData } });
      }
    });

    console.log("Assessment completed for user:", userId, {
      severity: result.overallSeverity,
      riskEscalated: result.riskEscalated,
    });

    await setClaimOverride({ questionnaireCompleted: true });

    // Cached match scores are now stale - next recommendations view rebuilds them.
    await prisma.userRecommendation.deleteMany({ where: { userId } });

    return { success: true };
  } catch (error) {
    console.error("Error completing assessment:", error);
    return { success: false, error: "Failed to complete assessment" };
  }
}

export async function hasCompletedAssessment(): Promise<{
  success: boolean;
  completed?: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "User not authenticated" };

    const completed = await prisma.assessment.findFirst({
      where: { userId: session.user.id, isComplete: true },
      select: { id: true },
    });

    return { success: true, completed: !!completed };
  } catch (error) {
    console.error("Error checking assessment completion:", error);
    return { success: false, error: "Failed to check completion status" };
  }
}

export async function getAssessmentProfile(): Promise<{
  success: boolean;
  profile?: {
    thetaDepression: number | null;
    thetaAnxiety: number | null;
    thetaTrauma: number | null;
    thetaSleep: number | null;
    thetaSocial: number | null;
    thetaSelfWorth: number | null;
    overallSeverity: string;
    riskEscalated: boolean;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "User not authenticated" };

    const record = await prisma.assessment.findFirst({
      where: { userId: session.user.id, isComplete: true },
      orderBy: { completedAt: "desc" },
    });

    if (!record) return { success: true, profile: undefined };

    return {
      success: true,
      profile: {
        thetaDepression: record.thetaDepression,
        thetaAnxiety: record.thetaAnxiety,
        thetaTrauma: record.thetaTrauma,
        thetaSleep: record.thetaSleep,
        thetaSocial: record.thetaSocial,
        thetaSelfWorth: record.thetaSelfWorth,
        overallSeverity: record.overallSeverity,
        riskEscalated: record.riskEscalated,
      },
    };
  } catch (error) {
    console.error("Error getting assessment profile:", error);
    return { success: false, error: "Failed to get profile" };
  }
}

export interface AssessmentHistoryEntry {
  id: string;
  createdAt: Date;
  completedAt: Date | null;
  isComplete: boolean;
  overallSeverity: string;
}

export async function getAssessmentHistory(): Promise<{
  success: boolean;
  assessments?: AssessmentHistoryEntry[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "User not authenticated" };

    const assessments = await prisma.assessment.findMany({
      where: { userId: session.user.id, isComplete: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, completedAt: true, isComplete: true, overallSeverity: true },
    });

    return { success: true, assessments };
  } catch (error) {
    console.error("Error getting assessment history:", error);
    return { success: false, error: "Failed to get history" };
  }
}

export async function getReassessmentStatus(): Promise<{
  success: boolean;
  due?: boolean;
  lastCompletedAt?: Date;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "User not authenticated" };

    const latest = await prisma.assessment.findFirst({
      where: { userId: session.user.id, isComplete: true },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true, riskEscalated: true },
    });

    if (!latest?.completedAt) return { success: true, due: false };

    return {
      success: true,
      due: isReassessmentDue(latest.completedAt, latest.riskEscalated, new Date()),
      lastCompletedAt: latest.completedAt,
    };
  } catch (error) {
    console.error("Error checking reassessment status:", error);
    return { success: false, error: "Failed to check reassessment status" };
  }
}

const DOMAIN_LABELS: Record<DomainKey, string> = {
  depression: "Mood",
  anxiety: "Anxiety",
  trauma: "Past Experiences",
  sleep: "Sleep",
  social: "Social Life",
  selfWorth: "Self-Perception",
};

export interface AssessmentComparison {
  domain: DomainKey;
  label: string;
  trend: TrendVerdict;
}

/**
 * Compares the two most recent completed assessments, domain by domain.
 * Returns undefined if there's no prior assessment to compare against.
 */
export async function getAssessmentComparison(): Promise<{
  success: boolean;
  comparison?: AssessmentComparison[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "User not authenticated" };

    const [current, previous] = await prisma.assessment.findMany({
      where: { userId: session.user.id, isComplete: true },
      orderBy: { completedAt: "desc" },
      take: 2,
    });

    if (!current || !previous) return { success: true, comparison: undefined };

    const comparison: AssessmentComparison[] = (Object.keys(THETA_FIELDS) as DomainKey[]).map((domain) => {
      const fields = THETA_FIELDS[domain];
      const currentTheta = current[fields.theta as keyof typeof current] as number | null;
      const previousTheta = previous[fields.theta as keyof typeof previous] as number | null;
      return { domain, label: DOMAIN_LABELS[domain], trend: computeTrend(previousTheta, currentTheta) };
    });

    return { success: true, comparison };
  } catch (error) {
    console.error("Error comparing assessments:", error);
    return { success: false, error: "Failed to compare assessments" };
  }
}
