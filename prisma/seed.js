const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user with free tier
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@xactions.app' },
    update: {},
    create: {
      email: 'demo@xactions.app',
      username: 'demo_user',
      password: '$2a$10$rYZ3V4LqYJ8vLYZ3V4LqYOqYZ3V4LqYJ8vLYZ3V4LqYOqYZ3V4Lq', // hashed 'demo1234'
      credits: 50,
      subscription: {
        create: {
          tier: 'free',
          status: 'active',
          startDate: new Date()
        }
      }
    }
  });

  console.log('✅ Created demo user:', demoUser.email);

  // Create sample operations for demo user
  await prisma.operation.createMany({
    data: [
      {
        userId: demoUser.id,
        type: 'unfollowNonFollowers',
        status: 'completed',
        unfollowedCount: 25,
        creditsUsed: 10,
        startedAt: new Date(Date.now() - 86400000 * 2),
        completedAt: new Date(Date.now() - 86400000 * 2 + 3600000)
      },
      {
        userId: demoUser.id,
        type: 'detectUnfollowers',
        status: 'completed',
        unfollowedCount: 5,
        creditsUsed: 5,
        startedAt: new Date(Date.now() - 86400000),
        completedAt: new Date(Date.now() - 86400000 + 1800000)
      }
    ]
  });

  console.log('✅ Created sample operations');
  console.log('🌟 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
