import { pickNext } from "./cat";
import { POLICY_BY_DOMAIN } from "./policy";
import { estimateTheta } from "./grm";
import type { AdministeredResponse, BankItem, DomainKey, ThetaEstimate } from "./types";

export type PriorityKey = "mood" | "worry" | "sleep" | "connection" | "selfCriticism";

export const PRIORITY_TO_DOMAIN: Record<PriorityKey, DomainKey> = {
    mood: "depression",
    worry: "anxiety",
    sleep: "sleep",
    connection: "social",
    selfCriticism: "selfWorth",
};

const ALL_PRIORITIES: PriorityKey[] = ["mood", "worry", "sleep", "connection", "selfCriticism"];

export const DOMAIN_ORDER: DomainKey[] = ["depression", "anxiety", "trauma", "sleep", "social", "selfWorth"];

type HistoryEntry =
    | { kind: "item"; domain: DomainKey }
    | { kind: "traumaGate" }
    | { kind: "priorities" };

export interface SessionState {
    responses: Partial<Record<DomainKey, AdministeredResponse[]>>;
    traumaGateAnswered: boolean;
    traumaExposed: boolean;
    priorities: PriorityKey[] | null;
    history: HistoryEntry[];
    /**
     * Latched the moment free text matches a risk pattern, and never cleared
     * for the rest of the sitting. Undoing the answer that disclosed does not
     * undo the disclosure.
     */
    riskDetected: boolean;
}

export type SessionStep =
    | { type: "traumaGate" }
    | { type: "item"; domain: DomainKey; item: BankItem }
    | { type: "priorities" }
    | { type: "done" };

export function createSession(): SessionState {
    return {
        responses: {},
        traumaGateAnswered: false,
        traumaExposed: false,
        priorities: null,
        history: [],
        riskDetected: false,
    };
}

export function nextStep(banks: Record<DomainKey, BankItem[]>, session: SessionState): SessionStep {
    for (const domain of DOMAIN_ORDER) {
        if (domain === "trauma") {
            if (!session.traumaGateAnswered) return { type: "traumaGate" };
            if (!session.traumaExposed) continue;
        }
        const administered = session.responses[domain] ?? [];
        const item = pickNext(banks[domain], administered, POLICY_BY_DOMAIN[domain]);
        if (item) return { type: "item", domain, item };
    }

    if (!session.priorities) return { type: "priorities" };
    return { type: "done" };
}

export function recordResponse(
    session: SessionState,
    domain: DomainKey,
    response: AdministeredResponse
): SessionState {
    return {
        ...session,
        responses: {
            ...session.responses,
            [domain]: [...(session.responses[domain] ?? []), response],
        },
        history: [...session.history, { kind: "item", domain }],
    };
}

export function recordTraumaGate(session: SessionState, exposed: boolean): SessionState {
    return {
        ...session,
        traumaGateAnswered: true,
        traumaExposed: exposed,
        history: [...session.history, { kind: "traumaGate" }],
    };
}

export function recordPriorities(session: SessionState, ranking: PriorityKey[]): SessionState {
    return { ...session, priorities: ranking, history: [...session.history, { kind: "priorities" }] };
}

/**
 * Records a risk disclosure found in free text. Not part of `history`: this is
 * not an action the respondent can take back, and `undoLast` must not clear it.
 */
export function recordRiskDisclosure(session: SessionState): SessionState {
    if (session.riskDetected) return session;
    return { ...session, riskDetected: true };
}

// Reverts the single most recent action. Arbitrary backward navigation isn't
// coherent for an adaptive test (later item choices depend on earlier
// answers), but undoing the last answer and re-asking it is always safe.
export function undoLast(session: SessionState): SessionState {
    const last = session.history[session.history.length - 1];
    if (!last) return session;

    const history = session.history.slice(0, -1);

    if (last.kind === "priorities") {
        return { ...session, priorities: null, history };
    }
    if (last.kind === "traumaGate") {
        return { ...session, traumaGateAnswered: false, traumaExposed: false, history };
    }
    const domainResponses = session.responses[last.domain] ?? [];
    return {
        ...session,
        responses: { ...session.responses, [last.domain]: domainResponses.slice(0, -1) },
        history,
    };
}

export function isValidPriorityRanking(ranking: PriorityKey[]): boolean {
    return (
        ranking.length === ALL_PRIORITIES.length &&
        new Set(ranking).size === ALL_PRIORITIES.length &&
        ranking.every((r) => ALL_PRIORITIES.includes(r))
    );
}

export function finalizeThetas(session: SessionState): Partial<Record<DomainKey, ThetaEstimate>> {
    const result: Partial<Record<DomainKey, ThetaEstimate>> = {};
    for (const domain of DOMAIN_ORDER) {
        const administered = session.responses[domain];
        if (administered && administered.length > 0) result[domain] = estimateTheta(administered);
    }
    return result;
}
