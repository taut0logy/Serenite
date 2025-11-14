import { PrismaClient, SupportGroupType, Weekday } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to generate random items from array
function randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function randomItems<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// Calculate next meeting date
function getNextMeetingDate(dayOfWeek: Weekday, time: string): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);

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

    let daysUntilNext = targetDay - currentDay;
    if (daysUntilNext < 0) {
        daysUntilNext += 7;
    } else if (daysUntilNext === 0) {
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const targetTime = hours * 60 + minutes;
        if (currentTime >= targetTime) {
            daysUntilNext = 7;
        }
    }

    const nextMeeting = new Date(now);
    nextMeeting.setDate(now.getDate() + daysUntilNext);
    nextMeeting.setHours(hours, minutes, 0, 0);

    return nextMeeting;
}

async function main() {
    console.log('🌱 Starting comprehensive database seeding...\n');

    // Clear existing data
    console.log('🧹 Cleaning up existing data...');
    await prisma.reaction.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.post.deleteMany({});
    await prisma.mentalHealthProfile.deleteMany({});
    await prisma.questionnaireResponse.deleteMany({});
    await prisma.supportGroup.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('✓ Cleaned up existing data\n');

    // === 1. CREATE SUPPORT GROUPS ===
    console.log('📋 Creating 18 support groups...');

    const supportGroups = [
        // Original 10
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
        // New 8 groups
        {
            name: "Young Parents Support Network",
            description: "Navigating parenthood while managing mental health. A space for young parents to share challenges, celebrate wins, and find balance between self-care and caring for little ones.",
            type: SupportGroupType.WEEKLY,
            tags: ["parenting", "postpartum", "family", "stress", "work-life-balance", "support"],
            meetingDayOfWeek: Weekday.SATURDAY,
            meetingTime: "10:00",
            nextMeetingDate: getNextMeetingDate(Weekday.SATURDAY, "10:00"),
        },
        {
            name: "LGBTQ+ Mental Wellness",
            description: "A welcoming community for LGBTQ+ individuals to discuss mental health, identity, coming out, discrimination, and finding acceptance. Allies welcome in ally-specific sessions.",
            type: SupportGroupType.WEEKLY,
            tags: ["lgbtq", "identity", "acceptance", "discrimination", "pride", "mental-health"],
            meetingDayOfWeek: Weekday.TUESDAY,
            meetingTime: "20:30",
            nextMeetingDate: getNextMeetingDate(Weekday.TUESDAY, "20:30"),
        },
        {
            name: "Chronic Pain & Illness Warriors",
            description: "For those living with chronic pain, fibromyalgia, chronic fatigue, or invisible illnesses. We validate each other's experiences and share pain management techniques.",
            type: SupportGroupType.BIWEEKLY,
            tags: ["chronic-pain", "chronic-illness", "fibromyalgia", "fatigue", "invisible-illness", "coping"],
            meetingDayOfWeek: Weekday.THURSDAY,
            meetingTime: "16:00",
            nextMeetingDate: getNextMeetingDate(Weekday.THURSDAY, "16:00"),
        },
        {
            name: "Career Burnout & Work Stress",
            description: "Addressing workplace stress, burnout, imposter syndrome, and career transitions. Learn to set boundaries, advocate for yourself, and find fulfillment in your professional life.",
            type: SupportGroupType.WEEKLY,
            tags: ["burnout", "work-stress", "career", "imposter-syndrome", "boundaries", "workplace"],
            meetingDayOfWeek: Weekday.WEDNESDAY,
            meetingTime: "18:30",
            nextMeetingDate: getNextMeetingDate(Weekday.WEDNESDAY, "18:30"),
        },
        {
            name: "Sleep & Insomnia Support",
            description: "For those struggling with insomnia, sleep disorders, or irregular sleep patterns. Share sleep hygiene tips, relaxation techniques, and build healthy bedtime routines together.",
            type: SupportGroupType.WEEKLY,
            tags: ["insomnia", "sleep-disorder", "sleep-hygiene", "relaxation", "rest", "wellness"],
            meetingDayOfWeek: Weekday.SUNDAY,
            meetingTime: "21:00",
            nextMeetingDate: getNextMeetingDate(Weekday.SUNDAY, "21:00"),
        },
        {
            name: "Relationship & Attachment Healing",
            description: "Explore attachment styles, relationship patterns, codependency, and building healthy connections. Whether single, dating, or in a relationship, work on secure attachment.",
            type: SupportGroupType.BIWEEKLY,
            tags: ["relationships", "attachment", "codependency", "boundaries", "love", "healing"],
            meetingDayOfWeek: Weekday.MONDAY,
            meetingTime: "19:30",
            nextMeetingDate: getNextMeetingDate(Weekday.MONDAY, "19:30"),
        },
        {
            name: "Men's Mental Health Circle",
            description: "A safe space for men to discuss mental health, emotions, masculinity, and vulnerability without judgment. Breaking stigma and building brotherhood.",
            type: SupportGroupType.WEEKLY,
            tags: ["mens-health", "masculinity", "emotions", "vulnerability", "stigma", "brotherhood"],
            meetingDayOfWeek: Weekday.SATURDAY,
            meetingTime: "18:00",
            nextMeetingDate: getNextMeetingDate(Weekday.SATURDAY, "18:00"),
        },
        {
            name: "College & Student Mental Health",
            description: "For college students and young adults navigating academic pressure, social anxiety, identity exploration, and the transition to adulthood.",
            type: SupportGroupType.WEEKLY,
            tags: ["college", "student", "academic-stress", "young-adult", "identity", "transition"],
            meetingDayOfWeek: Weekday.THURSDAY,
            meetingTime: "21:00",
            nextMeetingDate: getNextMeetingDate(Weekday.THURSDAY, "21:00"),
        },
    ];

    const createdGroups: Awaited<ReturnType<typeof prisma.supportGroup.create>>[] = [];
    for (const group of supportGroups) {
        const created = await prisma.supportGroup.create({ data: group });
        createdGroups.push(created);
        console.log(`✓ ${created.name}`);
    }
    console.log(`\n✅ Created ${createdGroups.length} support groups\n`);

    // === 2. CREATE 152 USERS ===
    console.log('👥 Creating 152 users with profiles...');

    const firstNames = [
        'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William',
        'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander',
        'Abigail', 'Michael', 'Emily', 'Daniel', 'Elizabeth', 'Matthew', 'Sofia', 'Jackson', 'Avery', 'Sebastian',
        'Ella', 'David', 'Scarlett', 'Joseph', 'Grace', 'Samuel', 'Chloe', 'John', 'Victoria', 'Owen',
        'Riley', 'Dylan', 'Aria', 'Luke', 'Lily', 'Gabriel', 'Aubrey', 'Anthony', 'Zoey', 'Isaac',
    ];

    const lastNames = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
        'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
        'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
        'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    ];

    const bios = [
        "Just trying to take it one day at a time. 🌱",
        "Mental health advocate. Your story matters.",
        "Finding peace in the chaos. ✨",
        "Recovery is not linear, and that's okay.",
        "Here to listen, learn, and grow together.",
        "Embracing vulnerability as strength. 💪",
        "Believer in the power of community.",
        "On a journey to better mental wellness.",
        "Sharing my story to help others feel less alone.",
        "Practicing self-compassion daily. 💙",
        "Healing is a process, not a destination.",
        "Finding hope in small victories.",
        null, // Some users without bios
        "Grateful for this supportive community.",
        "Learning to be kind to myself.",
        "Every day is a new beginning.",
    ];

    const hashedPassword = await bcrypt.hash('password123', 10);
    const createdUsers: Awaited<ReturnType<typeof prisma.user.create>>[] = [];

    for (let i = 0; i < 152; i++) {
        const firstName = randomItem(firstNames);
        const lastName = randomItem(lastNames);
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;

        const user = await prisma.user.create({
            data: {
                email,
                hashedPassword,
                verified: true,
                profile: {
                    create: {
                        firstName,
                        lastName,
                        bio: randomItem(bios),
                        dob: new Date(1980 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                    },
                },
            },
            include: { profile: true },
        });

        createdUsers.push(user);

        if ((i + 1) % 20 === 0) {
            console.log(`✓ Created ${i + 1} users...`);
        }
    }
    console.log(`\n✅ Created ${createdUsers.length} users\n`);

    // === 3. ASSIGN USERS TO SUPPORT GROUPS ===
    console.log('🔗 Assigning users to support groups (max 10-12 per group)...');

    for (const group of createdGroups) {
        const memberCount = 8 + Math.floor(Math.random() * 5); // 8-12 members
        const members = randomItems(createdUsers, memberCount);

        await prisma.supportGroup.update({
            where: { id: group.id },
            data: {
                members: {
                    connect: members.map(u => ({ id: u.id })),
                },
            },
        });

        console.log(`✓ ${group.name}: ${memberCount} members`);
    }
    console.log('\n✅ Assigned users to support groups\n');

    // === 4. CREATE POSTS ===
    console.log('📝 Creating community posts...');

    const postTitles = [
        "Just wanted to share a small win today",
        "Struggling with anxiety today, anyone else?",
        "Gratitude thread: What are you thankful for?",
        "Looking for recommendations on therapists",
        "How do you handle difficult days?",
        "Celebrating 6 months of recovery!",
        "Does anyone else feel this way?",
        "Tips for better sleep?",
        "Feeling isolated lately",
        "The power of journaling",
        "What helps you during panic attacks?",
        "Mindfulness techniques that actually work",
        "Setting boundaries with family",
        "Dealing with imposter syndrome",
        "Finding motivation on hard days",
        "Self-care isn't selfish",
        "When therapy feels too hard",
        "Medication experiences - let's talk",
        "Building a support system",
        "Relapse doesn't mean failure",
    ];

    const postContents = [
        "I managed to get out of bed, shower, and make breakfast today. It might seem small, but it's a huge step for me. Proud of myself! 🌟",
        "My anxiety has been through the roof lately. Every little thing feels overwhelming. How do you cope when everything feels like too much?",
        "I want to start a gratitude thread. I'll go first: I'm grateful for this community and for my morning coffee. Your turn! ☕",
        "I've been on a waitlist for therapy for months. Does anyone have recommendations for finding a good therapist? What should I look for?",
        "Some days I can barely function. I know I'm not alone in this. What are your go-to strategies for getting through really difficult days?",
        "Today marks 6 months in recovery and I couldn't be more grateful. It hasn't been easy, but it's been worth it. Keep going everyone! 💪",
        "Does anyone else feel like they're constantly waiting for the other shoe to drop? Even when things are going well, I can't relax.",
        "I've been struggling with insomnia for weeks now. What helps you sleep? I've tried everything from meditation to warm milk.",
        "Feeling really isolated lately even though I'm surrounded by people. Does anyone else experience this kind of loneliness?",
        "Journaling has been a game-changer for my mental health. I write every morning and it helps me process my emotions. Highly recommend!",
        "When you feel a panic attack coming, what do you do? I'm looking for practical techniques I can use in the moment.",
        "I've been practicing mindfulness meditation for 3 months and it's actually helping. Here are some techniques that work for me...",
        "How do you set boundaries with family who don't understand mental health? I'm struggling to protect my peace.",
        "Imposter syndrome is hitting hard today. Does anyone else feel like they're faking it all the time?",
        "I have zero motivation today. Everything feels pointless. How do you push through when you feel like this?",
        "Reminder: Taking care of yourself isn't selfish. You can't pour from an empty cup. 💙",
        "Sometimes therapy brings up really hard stuff and I want to quit. Anyone else struggle with this?",
        "Can we talk about medication? I'm considering it but I'm nervous. What has your experience been?",
        "I'm realizing I don't have much of a support system. How do you build one from scratch?",
        "I had a setback this week but I'm trying to remember that relapse is part of recovery, not failure. Be kind to yourself.",
    ];

    const tags = [
        ['anxiety', 'support', 'mental-health'],
        ['depression', 'coping', 'community'],
        ['gratitude', 'positivity', 'wellness'],
        ['recovery', 'sobriety', 'milestone'],
        ['self-care', 'healing', 'journey'],
        ['therapy', 'counseling', 'resources'],
        ['mindfulness', 'meditation', 'peace'],
        ['stress', 'work-life-balance', 'burnout'],
        ['sleep', 'insomnia', 'rest'],
        ['relationships', 'boundaries', 'family'],
    ];

    const createdPosts: Awaited<ReturnType<typeof prisma.post.create>>[] = [];
    for (let i = 0; i < 45; i++) {
        const author = randomItem(createdUsers);
        const isAnonymous = Math.random() < 0.3; // 30% anonymous

        const post = await prisma.post.create({
            data: {
                title: randomItem(postTitles),
                content: randomItem(postContents),
                isAnonymous,
                userId: author.id,
                tags: randomItem(tags),
            },
        });

        createdPosts.push(post);
    }
    console.log(`✅ Created ${createdPosts.length} posts\n`);

    // === 5. CREATE COMMENTS ===
    console.log('💬 Creating comments on posts...');

    const commentTexts = [
        "Thank you for sharing this. I needed to hear it today.",
        "I feel the same way! You're not alone in this.",
        "Have you tried talking to a professional about this?",
        "This is so relatable. Sending you strength! 💙",
        "I'm proud of you for taking this step!",
        "Your post really resonated with me.",
        "Keep going! You've got this!",
        "Thank you for being so vulnerable and honest.",
        "I'm here if you ever need to talk.",
        "This is a great reminder. Thank you!",
        "Same here. It's comforting to know others understand.",
        "What helped me was...",
        "Congratulations! That's amazing progress!",
        "I struggle with this too. Thanks for opening up.",
        "Sending lots of love and support your way.",
    ];

    let commentCount = 0;
    for (const post of createdPosts) {
        const numComments = Math.floor(Math.random() * 8); // 0-7 comments per post

        for (let i = 0; i < numComments; i++) {
            const commenter = randomItem(createdUsers.filter(u => u.id !== post.userId));
            const isAnonymous = Math.random() < 0.2; // 20% anonymous comments

            await prisma.comment.create({
                data: {
                    content: randomItem(commentTexts),
                    isAnonymous,
                    userId: commenter.id,
                    postId: post.id,
                },
            });
            commentCount++;
        }
    }
    console.log(`✅ Created ${commentCount} comments\n`);

    // === 6. CREATE REACTIONS ===
    console.log('❤️ Creating reactions on posts...');

    const reactionTypes = ['LIKE', 'HEART', 'SUPPORT', 'HUG', 'THANKS'] as const;
    let reactionCount = 0;

    for (const post of createdPosts) {
        const numReactions = 3 + Math.floor(Math.random() * 15); // 3-17 reactions per post
        const reactors = randomItems(createdUsers.filter(u => u.id !== post.userId), Math.min(numReactions, createdUsers.length - 1));

        for (const reactor of reactors) {
            const reactionType = randomItem([...reactionTypes]);

            try {
                await prisma.reaction.create({
                    data: {
                        type: reactionType,
                        userId: reactor.id,
                        postId: post.id,
                    },
                });
                reactionCount++;
            } catch {
                // Skip if duplicate reaction
            }
        }
    }
    console.log(`✅ Created ${reactionCount} reactions\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Support Groups: ${createdGroups.length}`);
    console.log(`   - Users: ${createdUsers.length}`);
    console.log(`   - Posts: ${createdPosts.length}`);
    console.log(`   - Comments: ${commentCount}`);
    console.log(`   - Reactions: ${reactionCount}`);
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
