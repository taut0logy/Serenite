import { PrismaClient, SupportGroupType, Weekday } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create 10 diverse support groups
  const supportGroups = [
    {
      name: "Anxiety & Stress Management Circle",
      description: "A safe space for individuals dealing with anxiety disorders, panic attacks, and chronic stress. We share coping strategies, breathing exercises, and mindfulness techniques to manage daily anxieties.",
      type: SupportGroupType.WEEKLY,
      tags: ["anxiety", "stress", "panic-disorder", "coping-strategies", "mindfulness", "relaxation"],
      meetingDayOfWeek: Weekday.MONDAY,
      meetingTime: "18:00",
      nextMeetingDate: getNextMeetingDate(Weekday.MONDAY, "18:00"),
    },
    {
      name: "Depression Support & Hope",
      description: "For those navigating depression, bipolar disorder, or persistent low mood. We focus on building hope, sharing experiences, and supporting each other through dark times with compassion and understanding.",
      type: SupportGroupType.WEEKLY,
      tags: ["depression", "bipolar", "mood-disorder", "hope", "recovery", "support"],
      meetingDayOfWeek: Weekday.TUESDAY,
      meetingTime: "19:00",
      nextMeetingDate: getNextMeetingDate(Weekday.TUESDAY, "19:00"),
    },
    {
      name: "Trauma & PTSD Recovery",
      description: "A compassionate group for trauma survivors, including PTSD, C-PTSD, and those recovering from traumatic experiences. We work together on healing, processing emotions, and reclaiming our lives.",
      type: SupportGroupType.BIWEEKLY,
      tags: ["trauma", "ptsd", "c-ptsd", "abuse-recovery", "healing", "resilience"],
      meetingDayOfWeek: Weekday.WEDNESDAY,
      meetingTime: "17:30",
      nextMeetingDate: getNextMeetingDate(Weekday.WEDNESDAY, "17:30"),
    },
    {
      name: "Social Anxiety & Connection",
      description: "For individuals struggling with social anxiety, fear of judgment, or difficulty forming connections. We practice social skills in a supportive environment and work on building confidence.",
      type: SupportGroupType.WEEKLY,
      tags: ["social-anxiety", "isolation", "loneliness", "connection", "confidence", "social-skills"],
      meetingDayOfWeek: Weekday.THURSDAY,
      meetingTime: "20:00",
      nextMeetingDate: getNextMeetingDate(Weekday.THURSDAY, "20:00"),
    },
    {
      name: "OCD & Intrusive Thoughts",
      description: "Support for those living with OCD, intrusive thoughts, and compulsive behaviors. We share strategies for managing obsessions, reducing compulsions, and improving quality of life through exposure techniques and CBT principles.",
      type: SupportGroupType.WEEKLY,
      tags: ["ocd", "intrusive-thoughts", "compulsions", "obsessions", "cbt", "anxiety"],
      meetingDayOfWeek: Weekday.FRIDAY,
      meetingTime: "18:30",
      nextMeetingDate: getNextMeetingDate(Weekday.FRIDAY, "18:30"),
    },
    {
      name: "Grief & Loss Circle",
      description: "A gentle space for those processing grief, loss of loved ones, or major life transitions. We honor our feelings, share memories, and support each other through the healing journey.",
      type: SupportGroupType.BIWEEKLY,
      tags: ["grief", "loss", "bereavement", "mourning", "life-transitions", "healing"],
      meetingDayOfWeek: Weekday.SATURDAY,
      meetingTime: "15:00",
      nextMeetingDate: getNextMeetingDate(Weekday.SATURDAY, "15:00"),
    },
    {
      name: "Eating Disorder Recovery",
      description: "Supporting individuals recovering from anorexia, bulimia, binge eating disorder, and other eating disorders. We focus on body positivity, healthy relationships with food, and sustainable recovery.",
      type: SupportGroupType.WEEKLY,
      tags: ["eating-disorder", "anorexia", "bulimia", "binge-eating", "body-image", "recovery"],
      meetingDayOfWeek: Weekday.SUNDAY,
      meetingTime: "16:00",
      nextMeetingDate: getNextMeetingDate(Weekday.SUNDAY, "16:00"),
    },
    {
      name: "Addiction & Substance Recovery",
      description: "A judgment-free zone for those in recovery from addiction, substance abuse, or behavioral addictions. We celebrate sobriety milestones, share relapse prevention strategies, and rebuild our lives together.",
      type: SupportGroupType.WEEKLY,
      tags: ["addiction", "substance-abuse", "recovery", "sobriety", "relapse-prevention", "12-step"],
      meetingDayOfWeek: Weekday.MONDAY,
      meetingTime: "20:00",
      nextMeetingDate: getNextMeetingDate(Weekday.MONDAY, "20:00"),
    },
    {
      name: "ADHD & Neurodivergent Support",
      description: "For adults with ADHD, autism, or other neurodivergent conditions. We share productivity hacks, executive function strategies, and celebrate our unique ways of thinking while managing daily challenges.",
      type: SupportGroupType.WEEKLY,
      tags: ["adhd", "autism", "neurodivergent", "executive-function", "focus", "productivity"],
      meetingDayOfWeek: Weekday.WEDNESDAY,
      meetingTime: "19:30",
      nextMeetingDate: getNextMeetingDate(Weekday.WEDNESDAY, "19:30"),
    },
    {
      name: "Self-Harm & Emotional Regulation",
      description: "A safe and non-judgmental space for those struggling with self-harm, suicidal ideation, or emotional dysregulation. We work on healthy coping mechanisms, DBT skills, and crisis management strategies.",
      type: SupportGroupType.BIWEEKLY,
      tags: ["self-harm", "emotional-regulation", "dbt", "coping-skills", "crisis-management", "borderline"],
      meetingDayOfWeek: Weekday.FRIDAY,
      meetingTime: "17:00",
      nextMeetingDate: getNextMeetingDate(Weekday.FRIDAY, "17:00"),
    },
  ];

  // Create support groups
  console.log('Creating support groups...');

  // First, delete existing support groups to avoid duplicates
  await prisma.supportGroup.deleteMany({});
  console.log('✓ Cleared existing support groups');

  for (const group of supportGroups) {
    const created = await prisma.supportGroup.create({
      data: group,
    });
    console.log(`✓ Created: ${created.name}`);
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
