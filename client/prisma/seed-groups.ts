import { PrismaClient, SupportGroupType, Weekday, SeverityLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create diverse support groups with target cluster scores
  // Aligned with HiTOP transdiagnostic framework:
  //   distress = depression (0.6) + low_self_esteem (0.4)
  //   fearAvoidance = anxiety (0.5) + social_anxiety (0.5)
  //   traumaStress = ptsd (1.0)
  //   cognitivePatterns = cognitive_distortion (1.0)
  //   dailyFunctioning = sleep_disruption (0.5) + functional_impairment (0.5)

  const supportGroups = [
    // === DEPRESSION & MOOD DISORDERS ===
    // Primary: HIGH distress (depression + low self-esteem)
    {
      name: "Weathering Low Moods",
      description: "A compassionate space for those navigating depression and persistent sadness. We share coping strategies and support each other through difficult times.",
      type: SupportGroupType.WEEKLY,
      tags: ["depression", "low-mood", "emotional-distress"],
      // High distress (depression), moderate cognitive (rumination common)
      targetDistress: 0.85, targetFearAvoidance: 0.3, targetTraumaStress: 0.2,
      targetCognitivePatterns: 0.55, targetDailyFunctioning: 0.5,
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
      targetDistress: 0.65, targetFearAvoidance: 0.25, targetTraumaStress: 0.15,
      targetCognitivePatterns: 0.45, targetDailyFunctioning: 0.6,
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
      targetDistress: 0.4, targetFearAvoidance: 0.9, targetTraumaStress: 0.15,
      targetCognitivePatterns: 0.55, targetDailyFunctioning: 0.35,
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
      targetDistress: 0.45, targetFearAvoidance: 0.92, targetTraumaStress: 0.1,
      targetCognitivePatterns: 0.5, targetDailyFunctioning: 0.4,
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
      targetDistress: 0.45, targetFearAvoidance: 0.8, targetTraumaStress: 0.15,
      targetCognitivePatterns: 0.8, targetDailyFunctioning: 0.35,
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
      targetDistress: 0.55, targetFearAvoidance: 0.5, targetTraumaStress: 0.92,
      targetCognitivePatterns: 0.45, targetDailyFunctioning: 0.55,
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
      targetDistress: 0.7, targetFearAvoidance: 0.55, targetTraumaStress: 0.88,
      targetCognitivePatterns: 0.55, targetDailyFunctioning: 0.65,
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
      targetDistress: 0.5, targetFearAvoidance: 0.4, targetTraumaStress: 0.15,
      targetCognitivePatterns: 0.88, targetDailyFunctioning: 0.35,
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
      targetDistress: 0.6, targetFearAvoidance: 0.5, targetTraumaStress: 0.1,
      targetCognitivePatterns: 0.85, targetDailyFunctioning: 0.4,
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
      targetDistress: 0.45, targetFearAvoidance: 0.25, targetTraumaStress: 0.15,
      targetCognitivePatterns: 0.35, targetDailyFunctioning: 0.88,
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
      targetDistress: 0.35, targetFearAvoidance: 0.3, targetTraumaStress: 0.1,
      targetCognitivePatterns: 0.4, targetDailyFunctioning: 0.92,
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
      targetDistress: 0.75, targetFearAvoidance: 0.35, targetTraumaStress: 0.25,
      targetCognitivePatterns: 0.45, targetDailyFunctioning: 0.75,
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
      targetDistress: 0.82, targetFearAvoidance: 0.65, targetTraumaStress: 0.6,
      targetCognitivePatterns: 0.65, targetDailyFunctioning: 0.75,
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
      targetDistress: 0.28, targetFearAvoidance: 0.28, targetTraumaStress: 0.1,
      targetCognitivePatterns: 0.25, targetDailyFunctioning: 0.25,
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
      targetDistress: 0.35, targetFearAvoidance: 0.35, targetTraumaStress: 0.15,
      targetCognitivePatterns: 0.45, targetDailyFunctioning: 0.3,
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
      targetDistress: 0.5, targetFearAvoidance: 0.5, targetTraumaStress: 0.2,
      targetCognitivePatterns: 0.45, targetDailyFunctioning: 0.55,
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
      targetDistress: 0.65, targetFearAvoidance: 0.35, targetTraumaStress: 0.15,
      targetCognitivePatterns: 0.5, targetDailyFunctioning: 0.8,
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
      targetDistress: 0.75, targetFearAvoidance: 0.25, targetTraumaStress: 0.65,
      targetCognitivePatterns: 0.4, targetDailyFunctioning: 0.6,
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
      targetDistress: 0.5, targetFearAvoidance: 0.55, targetTraumaStress: 0.2,
      targetCognitivePatterns: 0.5, targetDailyFunctioning: 0.5,
      minSeverity: SeverityLevel.MINIMAL, maxSeverity: SeverityLevel.MODERATE,
      maxMembers: 12, meetingDayOfWeek: Weekday.FRIDAY, meetingTime: "20:00",
      nextMeetingDate: getNextMeetingDate(Weekday.FRIDAY, "20:00"),
    },
  ];

  // Create support groups
  console.log('Creating support groups with target clusters...');

  // First, delete existing support groups to avoid duplicates
  await prisma.supportGroup.deleteMany({});
  console.log('✓ Cleared existing support groups');

  for (const group of supportGroups) {
    const created = await prisma.supportGroup.create({
      data: group,
    });
    console.log(`✓ Created: ${created.name} (ID: ${created.shareableId})`);
    console.log(`   Clusters: distress=${group.targetDistress}, fear=${group.targetFearAvoidance}, trauma=${group.targetTraumaStress}`);
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
