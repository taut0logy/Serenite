import { PrismaClient, SeverityLevel } from '../src/lib/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// User profile archetypes for diversity
const PROFILE_ARCHETYPES = [
  // High distress (depression-like)
  { distress: 0.8, fearAvoidance: 0.3, traumaStress: 0.2, cognitivePatterns: 0.5, dailyFunctioning: 0.4 },
  { distress: 0.9, fearAvoidance: 0.2, traumaStress: 0.1, cognitivePatterns: 0.6, dailyFunctioning: 0.5 },
  { distress: 0.7, fearAvoidance: 0.4, traumaStress: 0.3, cognitivePatterns: 0.4, dailyFunctioning: 0.6 },
  
  // High fear/avoidance (anxiety-like)
  { distress: 0.3, fearAvoidance: 0.85, traumaStress: 0.2, cognitivePatterns: 0.4, dailyFunctioning: 0.3 },
  { distress: 0.4, fearAvoidance: 0.9, traumaStress: 0.1, cognitivePatterns: 0.5, dailyFunctioning: 0.2 },
  { distress: 0.5, fearAvoidance: 0.75, traumaStress: 0.2, cognitivePatterns: 0.6, dailyFunctioning: 0.4 },
  
  // High trauma/stress (PTSD-like)
  { distress: 0.5, fearAvoidance: 0.4, traumaStress: 0.9, cognitivePatterns: 0.4, dailyFunctioning: 0.5 },
  { distress: 0.6, fearAvoidance: 0.5, traumaStress: 0.85, cognitivePatterns: 0.5, dailyFunctioning: 0.6 },
  { distress: 0.4, fearAvoidance: 0.3, traumaStress: 0.8, cognitivePatterns: 0.3, dailyFunctioning: 0.4 },
  
  // High cognitive patterns (OCD/rumination-like)
  { distress: 0.4, fearAvoidance: 0.5, traumaStress: 0.2, cognitivePatterns: 0.85, dailyFunctioning: 0.3 },
  { distress: 0.5, fearAvoidance: 0.6, traumaStress: 0.1, cognitivePatterns: 0.9, dailyFunctioning: 0.4 },
  { distress: 0.3, fearAvoidance: 0.4, traumaStress: 0.2, cognitivePatterns: 0.8, dailyFunctioning: 0.3 },
  
  // High daily functioning issues (sleep/impairment)
  { distress: 0.4, fearAvoidance: 0.2, traumaStress: 0.2, cognitivePatterns: 0.3, dailyFunctioning: 0.85 },
  { distress: 0.5, fearAvoidance: 0.3, traumaStress: 0.1, cognitivePatterns: 0.4, dailyFunctioning: 0.9 },
  { distress: 0.3, fearAvoidance: 0.2, traumaStress: 0.2, cognitivePatterns: 0.3, dailyFunctioning: 0.75 },
  
  // Mixed profiles
  { distress: 0.7, fearAvoidance: 0.7, traumaStress: 0.3, cognitivePatterns: 0.4, dailyFunctioning: 0.5 },
  { distress: 0.6, fearAvoidance: 0.5, traumaStress: 0.5, cognitivePatterns: 0.5, dailyFunctioning: 0.6 },
  { distress: 0.5, fearAvoidance: 0.6, traumaStress: 0.4, cognitivePatterns: 0.7, dailyFunctioning: 0.4 },
  
  // Mild profiles
  { distress: 0.3, fearAvoidance: 0.3, traumaStress: 0.2, cognitivePatterns: 0.3, dailyFunctioning: 0.2 },
  { distress: 0.25, fearAvoidance: 0.25, traumaStress: 0.1, cognitivePatterns: 0.2, dailyFunctioning: 0.25 },
];

const FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia',
  'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Sarah', 'Michael',
  'Emily', 'Daniel', 'Madison', 'Matthew', 'Aria', 'Joseph', 'Grace', 'David',
  'Chloe', 'Andrew', 'Ella', 'Joshua', 'Lily', 'Christopher', 'Zoe', 'Ryan',
  'Penelope', 'Nathan', 'Hannah', 'Tyler', 'Victoria', 'Brandon', 'Riley', 'Jack'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
];

/**
 * Calculate severity from cluster scores
 */
function calculateSeverity(profile: typeof PROFILE_ARCHETYPES[0]): SeverityLevel {
  const avgScore = (
    profile.distress +
    profile.fearAvoidance +
    profile.traumaStress +
    profile.cognitivePatterns +
    profile.dailyFunctioning
  ) / 5;

  if (avgScore < 0.25) return SeverityLevel.MINIMAL;
  if (avgScore < 0.45) return SeverityLevel.MILD;
  if (avgScore < 0.65) return SeverityLevel.MODERATE;
  return SeverityLevel.SEVERE;
}

/**
 * Add some randomness to a profile to make it more diverse
 */
function addVariation(profile: typeof PROFILE_ARCHETYPES[0]): typeof PROFILE_ARCHETYPES[0] {
  const variation = () => (Math.random() - 0.5) * 0.15; // ±0.075
  return {
    distress: Math.max(0, Math.min(1, profile.distress + variation())),
    fearAvoidance: Math.max(0, Math.min(1, profile.fearAvoidance + variation())),
    traumaStress: Math.max(0, Math.min(1, profile.traumaStress + variation())),
    cognitivePatterns: Math.max(0, Math.min(1, profile.cognitivePatterns + variation())),
    dailyFunctioning: Math.max(0, Math.min(1, profile.dailyFunctioning + variation())),
  };
}

async function main() {
  console.log('Starting user seeding...');
  
  const PASSWORD_HASH = await bcrypt.hash('password123', 10);
  
  // Get existing support groups
  const groups = await prisma.supportGroup.findMany({
    include: { _count: { select: { members: true } } }
  });
  
  if (groups.length === 0) {
    console.error('❌ No support groups found. Please run the main seed.ts first.');
    return;
  }
  
  console.log(`Found ${groups.length} support groups`);
  
  // Track group member counts
  const groupMemberCounts = new Map<string, number>();
  groups.forEach(g => groupMemberCounts.set(g.id, g._count.members));
  
  const createdUsers: string[] = [];
  
  for (let i = 1; i <= 100; i++) {
    // Pick a random profile archetype and add variation
    const baseProfile = PROFILE_ARCHETYPES[i % PROFILE_ARCHETYPES.length];
    const profile = addVariation(baseProfile);
    const severity = calculateSeverity(profile);

    // Generate user data
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const email = `user${i}@serenite.test`;
    
    try {
      // Create user with profile and mental health data
      const user = await prisma.user.create({
        data: {
          email,
          hashedPassword: PASSWORD_HASH,
          verified: true,
          role: 'USER',
          profile: {
            create: {
              firstName,
              lastName,
            }
          },
          // Assessment seeding removed: the old 5-cluster profile this
          // script generated no longer matches the schema (see the
          // 2026-08-28 assessment redesign). Group matching is being
          // rebuilt separately, so users are seeded without a profile for
          // now; group assignment below is capacity-only, not score-based.
        }
      });
      
      createdUsers.push(user.id);

      // Capacity-only assignment: no per-user profile to score against
      // until the matching rebuild lands (see comment above).
      const availableGroups = groups
        .map(g => ({ group: g, currentMembers: groupMemberCounts.get(g.id) || 0 }))
        .filter(gs => gs.currentMembers < gs.group.maxMembers)
        .sort(() => Math.random() - 0.5);

      const numGroupsToJoin = Math.random() > 0.6 ? 2 : 1;
      const groupsToJoin = availableGroups.slice(0, numGroupsToJoin);
      
      for (const gs of groupsToJoin) {
        await prisma.supportGroup.update({
          where: { id: gs.group.id },
          data: {
            members: {
              connect: { id: user.id }
            }
          }
        });
        groupMemberCounts.set(gs.group.id, (groupMemberCounts.get(gs.group.id) || 0) + 1);
      }
      
      const groupNames = groupsToJoin.map(gs => gs.group.name.substring(0, 20)).join(', ');
      console.log(`✓ Created user ${i}: ${firstName} ${lastName} (${severity}) → ${groupNames || 'no group'}`);
      
    } catch (error) {
      console.error(`❌ Failed to create user ${i}:`, error);
    }
  }
  
  // Print summary
  console.log('\n📊 Seeding Summary:');
  console.log(`   Users created: ${createdUsers.length}`);
  console.log('\n   Group distribution:');
  
  for (const group of groups) {
    const count = groupMemberCounts.get(group.id) || 0;
    const bar = '█'.repeat(Math.ceil(count / 2));
    console.log(`   ${group.name.substring(0, 25).padEnd(25)} ${count.toString().padStart(2)}/${group.maxMembers} ${bar}`);
  }
  
  console.log('\n✅ User seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
