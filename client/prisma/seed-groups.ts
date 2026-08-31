import { PrismaClient, SupportGroupType, Weekday, SeverityLevel, Role } from '../src/lib/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting database seeding...');

  // Create diverse support groups with theta seed profiles, in the same
  // 6-domain space as Assessment (depression, anxiety, trauma, sleep,
  // social, selfWorth). These are provisional hand-authored seeds, not
  // measured - see docs/superpowers/specs for how they were derived.

  const supportGroups = [
    // === DEPRESSION & MOOD DISORDERS ===
    // Primary: HIGH distress (depression + low self-esteem)
    {
      name: "Weathering Low Moods",
      description: "A compassionate space for those navigating depression and persistent sadness. We share coping strategies and support each other through difficult times.",
      type: SupportGroupType.WEEKLY,
      tags: ["depression", "low-mood", "emotional-distress"],
      // High distress (depression), moderate cognitive (rumination common)
      targetThetaDepression: 1.4, targetThetaAnxiety: -0.8, targetThetaTrauma: -1.2,
      targetThetaSleep: 0, targetThetaSocial: -0.8, targetThetaSelfWorth: 0.2,
      minSeverity: SeverityLevel.MILD, maxSeverity: SeverityLevel.SEVERE,
      maxMembers: 12, meetingDayOfWeek: Weekday.MONDAY, meetingTime: "18:00",
      nextMeetingDate: getNextMeetingDate(Weekday.MONDAY, "18:00"),
    },
    {
      name: "Finding Light Again",
      description: "For those emerging from deep depression. Focus on rebuilding hope, establishing routines, and celebrating small wins.",
      type: SupportGroupType.WEEKLY,
      tags: ["depression-recovery", "hope", "rebuilding"],
      // Moderate-high distress (recovering), higher functioning focus
      targetThetaDepression: 0.6, targetThetaAnxiety: -1, targetThetaTrauma: -1.4,
      targetThetaSleep: 0.4, targetThetaSocial: -1, targetThetaSelfWorth: -0.2,
      minSeverity: SeverityLevel.MILD, maxSeverity: SeverityLevel.MODERATE,
      maxMembers: 12, meetingDayOfWeek: Weekday.THURSDAY, meetingTime: "19:00",
      nextMeetingDate: getNextMeetingDate(Weekday.THURSDAY, "19:00"),
    },

    // === ANXIETY DISORDERS ===
    // Primary: HIGH fearAvoidance (anxiety + social anxiety)
    {
      name: "Calming Anxious Minds",
      description: "For individuals dealing with generalized anxiety and panic. We practice relaxation techniques and share strategies for managing worry.",
      type: SupportGroupType.WEEKLY,
      tags: ["anxiety", "panic", "relaxation"],
      // Very high fearAvoidance (GAD/panic), moderate cognitive (worry)
      targetThetaDepression: -0.4, targetThetaAnxiety: 1.6, targetThetaTrauma: -1.4,
      targetThetaSleep: -0.6, targetThetaSocial: 1.6, targetThetaSelfWorth: 0.2,
      minSeverity: SeverityLevel.MILD, maxSeverity: SeverityLevel.SEVERE,
      maxMembers: 12, meetingDayOfWeek: Weekday.TUESDAY, meetingTime: "19:00",
      nextMeetingDate: getNextMeetingDate(Weekday.TUESDAY, "19:00"),
    },
    {
      name: "Building Social Bridges",
      description: "A gentle space for those struggling with social anxiety. We practice social skills in a supportive environment.",
      type: SupportGroupType.WEEKLY,
      tags: ["social-anxiety", "connection", "confidence"],
      // Very high fearAvoidance (social focus), elevated distress (shame/embarrassment)
      targetThetaDepression: -0.2, targetThetaAnxiety: 1.68, targetThetaTrauma: -1.6,
      targetThetaSleep: -0.4, targetThetaSocial: 1.68, targetThetaSelfWorth: 0,
      minSeverity: SeverityLevel.MILD, maxSeverity: SeverityLevel.MODERATE,
      maxMembers: 12, meetingDayOfWeek: Weekday.THURSDAY, meetingTime: "20:00",
      nextMeetingDate: getNextMeetingDate(Weekday.THURSDAY, "20:00"),
    },
    {
      name: "Breaking Anxious Thoughts",
      description: "For those whose anxiety is driven by negative thought patterns. We work on managing anxiety and restructuring unhelpful thinking.",
      type: SupportGroupType.WEEKLY,
      tags: ["anxiety", "cognitive", "ocd", "worry"],
      // High fearAvoidance + high cognitive (OCD/worry comorbidity)
      targetThetaDepression: -0.2, targetThetaAnxiety: 1.2, targetThetaTrauma: -1.4,
      targetThetaSleep: -0.6, targetThetaSocial: 1.2, targetThetaSelfWorth: 1.2,
      minSeverity: SeverityLevel.MILD, maxSeverity: SeverityLevel.MODERATE,
      maxMembers: 12, meetingDayOfWeek: Weekday.MONDAY, meetingTime: "20:00",
      nextMeetingDate: getNextMeetingDate(Weekday.MONDAY, "20:00"),
    },

    // === TRAUMA & PTSD ===
    // Primary: HIGH traumaStress (PTSD)
    {
      name: "Healing Past Wounds",
      description: "A safe and compassionate group for trauma survivors. We work together on processing experiences and reclaiming our lives.",
      type: SupportGroupType.BIWEEKLY,
      tags: ["trauma", "ptsd", "healing", "recovery"],
      // Very high trauma, elevated distress and fearAvoidance (common comorbidities)
      targetThetaDepression: 0.2, targetThetaAnxiety: 0, targetThetaTrauma: 1.68,
      targetThetaSleep: 0.2, targetThetaSocial: 0, targetThetaSelfWorth: -0.2,
      minSeverity: SeverityLevel.MILD, maxSeverity: SeverityLevel.SEVERE,
      maxMembers: 10, meetingDayOfWeek: Weekday.WEDNESDAY, meetingTime: "17:30",
      nextMeetingDate: getNextMeetingDate(Weekday.WEDNESDAY, "17:30"),
    },
    {
      name: "Trauma-Informed Journeys",
      description: "For those working through childhood or complex trauma. A professionally supported space for gentle processing.",
      type: SupportGroupType.WEEKLY,
      tags: ["complex-trauma", "childhood", "healing"],
      // Very high trauma, higher distress (C-PTSD often has depression), elevated functioning
      targetThetaDepression: 0.8, targetThetaAnxiety: 0.2, targetThetaTrauma: 1.52,
      targetThetaSleep: 0.6, targetThetaSocial: 0.2, targetThetaSelfWorth: 0.2,
      minSeverity: SeverityLevel.MODERATE, maxSeverity: SeverityLevel.SEVERE,
      maxMembers: 8, meetingDayOfWeek: Weekday.SATURDAY, meetingTime: "14:00",
      nextMeetingDate: getNextMeetingDate(Weekday.SATURDAY, "14:00"),
    },

    // === COGNITIVE & THOUGHT PATTERNS ===
    // Primary: HIGH cognitivePatterns (cognitive distortions)
    {
      name: "Reshaping Thought Patterns",
      description: "For those working on negative thinking patterns and rumination. We practice CBT techniques together.",
      type: SupportGroupType.WEEKLY,
      tags: ["cognitive", "thinking-patterns", "cbt", "mindfulness"],
      // Very high cognitive, moderate distress (rumination → mood)
      targetThetaDepression: 0, targetThetaAnxiety: -0.4, targetThetaTrauma: -1.4,
      targetThetaSleep: -0.6, targetThetaSocial: -0.4, targetThetaSelfWorth: 1.52,
      minSeverity: SeverityLevel.MILD, maxSeverity: SeverityLevel.MODERATE,
      maxMembers: 12, meetingDayOfWeek: Weekday.FRIDAY, meetingTime: "18:30",
      nextMeetingDate: getNextMeetingDate(Weekday.FRIDAY, "18:30"),
    },
    {
      name: "Quieting the Inner Critic",
      description: "For those struggling with perfectionism and harsh self-judgment. Learn self-compassion and balanced thinking.",
      type: SupportGroupType.WEEKLY,
      tags: ["perfectionism", "self-criticism", "self-compassion"],
      // High cognitive + elevated distress (perfectionism often includes low self-esteem → distress)
      targetThetaDepression: 0.4, targetThetaAnxiety: 0, targetThetaTrauma: -1.6,
      targetThetaSleep: -0.4, targetThetaSocial: 0, targetThetaSelfWorth: 1.4,
      minSeverity: SeverityLevel.MINIMAL, maxSeverity: SeverityLevel.MODERATE,
      maxMembers: 12, meetingDayOfWeek: Weekday.WEDNESDAY, meetingTime: "19:00",
      nextMeetingDate: getNextMeetingDate(Weekday.WEDNESDAY, "19:00"),
    },

    // === DAILY FUNCTIONING & LIFESTYLE ===
    // Primary: HIGH dailyFunctioning (sleep + impairment)
    {
      name: "Regaining Daily Balance",
      description: "Supporting those struggling with sleep, daily routines, and functional impairment. We share practical strategies.",
      type: SupportGroupType.WEEKLY,
      tags: ["sleep", "routine", "functioning", "balance"],
      // Very high functioning issues, moderate distress
      targetThetaDepression: -0.2, targetThetaAnxiety: -1, targetThetaTrauma: -1.4,
      targetThetaSleep: 1.52, targetThetaSocial: -1, targetThetaSelfWorth: -0.6,
      minSeverity: SeverityLevel.MILD, maxSeverity: SeverityLevel.MODERATE,
      maxMembers: 12, meetingDayOfWeek: Weekday.SATURDAY, meetingTime: "10:00",
      nextMeetingDate: getNextMeetingDate(Weekday.SATURDAY, "10:00"),
    },
    {
      name: "Sleep Wellness Circle",
      description: "Focused on improving sleep quality and managing insomnia. Evidence-based sleep hygiene practices.",
      type: SupportGroupType.WEEKLY,
      tags: ["insomnia", "sleep", "rest", "wellness"],
      // Very high functioning (sleep focus), lower other clusters
      targetThetaDepression: -0.6, targetThetaAnxiety: -0.8, targetThetaTrauma: -1.6,
      targetThetaSleep: 1.68, targetThetaSocial: -0.8, targetThetaSelfWorth: -0.4,
      minSeverity: SeverityLevel.MINIMAL, maxSeverity: SeverityLevel.MODERATE,
      maxMembers: 12, meetingDayOfWeek: Weekday.TUESDAY, meetingTime: "21:00",
      nextMeetingDate: getNextMeetingDate(Weekday.TUESDAY, "21:00"),
    },

    // === MIXED/HOLISTIC (Multiple Elevated Clusters) ===
    {
      name: "Rising Through Struggles",
      description: "For those dealing with both emotional difficulties and practical life challenges. A community for holistic recovery.",
      type: SupportGroupType.WEEKLY,
      tags: ["depression", "functioning", "holistic"],
      // High distress + high functioning (depression often impairs daily life)
      targetThetaDepression: 1, targetThetaAnxiety: -0.6, targetThetaTrauma: -1,
      targetThetaSleep: 1, targetThetaSocial: -0.6, targetThetaSelfWorth: -0.2,
      minSeverity: SeverityLevel.MODERATE, maxSeverity: SeverityLevel.SEVERE,
      maxMembers: 12, meetingDayOfWeek: Weekday.SUNDAY, meetingTime: "16:00",
      nextMeetingDate: getNextMeetingDate(Weekday.SUNDAY, "16:00"),
    },
    {
      name: "Intensive Healing Circle",
      description: "A professionally moderated group for those facing significant challenges across multiple areas.",
      type: SupportGroupType.WEEKLY,
      tags: ["intensive", "crisis", "professional", "recovery"],
      // High across all clusters (severe/complex presentations)
      targetThetaDepression: 1.28, targetThetaAnxiety: 0.6, targetThetaTrauma: 0.4,
      targetThetaSleep: 1, targetThetaSocial: 0.6, targetThetaSelfWorth: 0.6,
      minSeverity: SeverityLevel.MODERATE, maxSeverity: SeverityLevel.SEVERE,
      maxMembers: 8, meetingDayOfWeek: Weekday.FRIDAY, meetingTime: "17:00",
      nextMeetingDate: getNextMeetingDate(Weekday.FRIDAY, "17:00"),
    },

    // === MILD/PREVENTIVE (Low Across All Clusters) ===
    {
      name: "Nurturing Mental Wellness",
      description: "A preventative group for those with mild concerns who want to maintain good mental health and develop resilience.",
      type: SupportGroupType.BIWEEKLY,
      tags: ["wellness", "prevention", "self-care", "resilience"],
      // Low across all clusters (minimal/mild severity)
      targetThetaDepression: -0.88, targetThetaAnxiety: -0.88, targetThetaTrauma: -1.6,
      targetThetaSleep: -1, targetThetaSocial: -0.88, targetThetaSelfWorth: -1,
      minSeverity: SeverityLevel.MINIMAL, maxSeverity: SeverityLevel.MILD,
      maxMembers: 15, meetingDayOfWeek: Weekday.WEDNESDAY, meetingTime: "19:30",
      nextMeetingDate: getNextMeetingDate(Weekday.WEDNESDAY, "19:30"),
    },
    {
      name: "Mindful Living",
      description: "Practice mindfulness and meditation together. Open to all levels, focused on stress reduction.",
      type: SupportGroupType.WEEKLY,
      tags: ["mindfulness", "meditation", "stress-reduction"],
      // Low-moderate, slight cognitive focus (mindfulness addresses thoughts)
      targetThetaDepression: -0.6, targetThetaAnxiety: -0.6, targetThetaTrauma: -1.4,
      targetThetaSleep: -0.8, targetThetaSocial: -0.6, targetThetaSelfWorth: -0.2,
      minSeverity: SeverityLevel.MINIMAL, maxSeverity: SeverityLevel.MODERATE,
      maxMembers: 15, meetingDayOfWeek: Weekday.SUNDAY, meetingTime: "09:00",
      nextMeetingDate: getNextMeetingDate(Weekday.SUNDAY, "09:00"),
    },

    // === LIFE TRANSITIONS & STRESS ===
    {
      name: "Navigating Life Changes",
      description: "For those going through major life transitions—job changes, relationships, moving. Share and support.",
      type: SupportGroupType.WEEKLY,
      tags: ["transitions", "change", "adjustment", "support"],
      // Moderate across distress/fear/functioning (adjustment-related)
      targetThetaDepression: 0, targetThetaAnxiety: 0, targetThetaTrauma: -1.2,
      targetThetaSleep: 0.2, targetThetaSocial: 0, targetThetaSelfWorth: -0.2,
      minSeverity: SeverityLevel.MINIMAL, maxSeverity: SeverityLevel.MODERATE,
      maxMembers: 12, meetingDayOfWeek: Weekday.MONDAY, meetingTime: "19:30",
      nextMeetingDate: getNextMeetingDate(Weekday.MONDAY, "19:30"),
    },
    {
      name: "Burnout Recovery",
      description: "For professionals experiencing or recovering from burnout. Focus on boundaries, rest, and sustainable work-life balance.",
      type: SupportGroupType.WEEKLY,
      tags: ["burnout", "work-stress", "boundaries", "recovery"],
      // High functioning (exhaustion), elevated distress (burnout often includes depression)
      targetThetaDepression: 0.6, targetThetaAnxiety: -0.6, targetThetaTrauma: -1.4,
      targetThetaSleep: 1.2, targetThetaSocial: -0.6, targetThetaSelfWorth: 0,
      minSeverity: SeverityLevel.MILD, maxSeverity: SeverityLevel.MODERATE,
      maxMembers: 12, meetingDayOfWeek: Weekday.THURSDAY, meetingTime: "18:00",
      nextMeetingDate: getNextMeetingDate(Weekday.THURSDAY, "18:00"),
    },

    // === GRIEF & LOSS ===
    {
      name: "Grief & Loss Support",
      description: "A compassionate space for those grieving the loss of loved ones. Share memories and find comfort in community.",
      type: SupportGroupType.BIWEEKLY,
      tags: ["grief", "loss", "bereavement", "healing"],
      // High distress (grief depression), elevated trauma (loss as stressor), functioning impaired
      targetThetaDepression: 1, targetThetaAnxiety: -1, targetThetaTrauma: 0.6,
      targetThetaSleep: 0.4, targetThetaSocial: -1, targetThetaSelfWorth: -0.4,
      minSeverity: SeverityLevel.MILD, maxSeverity: SeverityLevel.SEVERE,
      maxMembers: 10, meetingDayOfWeek: Weekday.SATURDAY, meetingTime: "11:00",
      nextMeetingDate: getNextMeetingDate(Weekday.SATURDAY, "11:00"),
    },

    // === YOUNG ADULTS ===
    {
      name: "Young Adults Connect",
      description: "For ages 18-25 navigating mental health challenges during early adulthood. Peer support and shared experiences.",
      type: SupportGroupType.WEEKLY,
      tags: ["young-adults", "peer-support", "college-age"],
      // Moderate across distress/fear (developmental challenges), moderate functioning
      targetThetaDepression: 0, targetThetaAnxiety: 0.2, targetThetaTrauma: -1.2,
      targetThetaSleep: 0, targetThetaSocial: 0.2, targetThetaSelfWorth: 0,
      minSeverity: SeverityLevel.MINIMAL, maxSeverity: SeverityLevel.MODERATE,
      maxMembers: 12, meetingDayOfWeek: Weekday.FRIDAY, meetingTime: "20:00",
      nextMeetingDate: getNextMeetingDate(Weekday.FRIDAY, "20:00"),
    },
  ];

  // A group whose range reaches MODERATE or SEVERE cannot take members without
  // a facilitator (see lib/assessment/eligibility.ts). Seeding groups without
  // one would leave almost all of them unjoinable. The same account can work
  // the one-to-one support queue, which also needs a HOST or MANAGER to exist.
  const facilitator = await prisma.user.upsert({
    where: { email: 'facilitator@serenite.test' },
    update: { role: Role.HOST },
    create: {
      email: 'facilitator@serenite.test',
      verified: true,
      role: Role.HOST,
      profile: { create: { firstName: 'Sam', lastName: 'Facilitator' } },
    },
  });
  console.log('Facilitator account ready: ' + facilitator.email);

  // Create support groups
  console.log('Creating support groups with target clusters...');

  // First, delete existing support groups to avoid duplicates
  await prisma.supportGroup.deleteMany({});
  console.log('✓ Cleared existing support groups');

  let facilitated = 0;
  for (const group of supportGroups) {
    const needsFacilitator =
      group.maxSeverity === SeverityLevel.MODERATE || group.maxSeverity === SeverityLevel.SEVERE;
    if (needsFacilitator) facilitated++;

    const created = await prisma.supportGroup.create({
      data: { ...group, facilitatorId: needsFacilitator ? facilitator.id : null },
    });
    console.log(`✓ Created: ${created.name} (ID: ${created.shareableId})`);
    console.log(`   Theta seed: dep=${group.targetThetaDepression}, anx=${group.targetThetaAnxiety}, trauma=${group.targetThetaTrauma}`);
    if (needsFacilitator) console.log('   facilitator: ' + facilitator.email);
  }

  console.log('\n✅ Database seeding completed successfully!');
  console.log(`📊 Total support groups: ${supportGroups.length}`);
}

/**
 * Calculate the next meeting date based on day of week and time
 */
function getNextMeetingDate(dayOfWeek: Weekday, time: string): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);

  // Map Weekday enum to JavaScript day (0 = Sunday, 1 = Monday, etc.)
  const dayMap: Record<Weekday, number> = {
    [Weekday.SUNDAY]: 0,
    [Weekday.MONDAY]: 1,
    [Weekday.TUESDAY]: 2,
    [Weekday.WEDNESDAY]: 3,
    [Weekday.THURSDAY]: 4,
    [Weekday.FRIDAY]: 5,
    [Weekday.SATURDAY]: 6,
  };

  const targetDay = dayMap[dayOfWeek];
  const currentDay = now.getDay();

  // Calculate days until next occurrence
  let daysUntilNext = targetDay - currentDay;
  if (daysUntilNext < 0) {
    daysUntilNext += 7;
  } else if (daysUntilNext === 0) {
    // If it's today, check if the time has passed
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const targetTime = hours * 60 + minutes;
    if (currentTime >= targetTime) {
      daysUntilNext = 7; // Next week
    }
  }

  // Create the next meeting date
  const nextMeeting = new Date(now);
  nextMeeting.setDate(now.getDate() + daysUntilNext);
  nextMeeting.setHours(hours, minutes, 0, 0);

  return nextMeeting;
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
