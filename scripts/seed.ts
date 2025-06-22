import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Create a user
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test@example.com',
    },
  });
  console.log(`Created user with id: ${user.id}`);

  // Create locations
  const location1 = await prisma.location.create({
    data: {
      name: 'Main Library',
      nickname: 'The Big One',
    },
  });
  console.log(`Created location with id: ${location1.id}`);

  const location2 = await prisma.location.create({
    data: {
      name: 'Community Center',
    },
  });
  console.log(`Created location with id: ${location2.id}`);

  // Create visitors
  const visitor1 = await prisma.visitor.create({
    data: {
      name: 'John Doe',
      owner_id: user.id,
    },
  });
  console.log(`Created visitor with id: ${visitor1.id}`);

  const visitor2 = await prisma.visitor.create({
    data: {
      name: 'Jane Smith',
      owner_id: user.id,
    },
  });
  console.log(`Created visitor with id: ${visitor2.id}`);

  const visitor3 = await prisma.visitor.create({
    data: {
      name: 'Sam Jones',
      owner_id: user.id,
    },
  });
  console.log(`Created visitor with id: ${visitor3.id}`);

  // Create check-ins
  await prisma.checkin.create({
    data: {
      visitor_id: visitor1.id,
      location_id: location1.id,
      checkin_at: new Date(),
      est_checkout_at: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    },
  });
  console.log(`Checked in visitor ${visitor1.name} at ${location1.name}`);

  await prisma.checkin.create({
    data: {
      visitor_id: visitor2.id,
      location_id: location2.id,
      checkin_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      est_checkout_at: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
      actual_checkout_at: new Date(),
    },
  });
  console.log(
    `Checked in and out visitor ${visitor2.name} at ${location2.name}`
  );

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
