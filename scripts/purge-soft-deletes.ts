// scripts/purge-soft-deletes.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const isDryRun = process.argv.includes('--dry-run');

interface SoftDeletedRecord {
  id: string;
}

async function purgeModel(modelName: string) {
  const model = prisma[modelName as keyof PrismaClient];

  // Find records to purge
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records: SoftDeletedRecord[] = await (model as any).findMany({
    where: {
      deleted_at: {
        not: null,
        lt: THIRTY_DAYS_AGO,
      },
    },
    select: { id: true },
  });

  if (records.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`Found ${records.length} records to purge from ${modelName}.`);

    if (!isDryRun) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (model as any).deleteMany({
        where: {
          id: {
            in: records.map((r) => r.id),
          },
        },
      });
      // eslint-disable-next-line no-console
      console.log(`Purged ${result.count} records from ${modelName}.`);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(`No records to purge from ${modelName}.`);
  }
}

async function run() {
  // eslint-disable-next-line no-console
  console.log(
    isDryRun
      ? 'Performing a dry run. No records will be deleted.'
      : 'Starting purge of soft-deleted records older than 30 days...'
  );

  const modelsToPurge = [
    'User',
    'Visitor',
    'Location',
    'Checkin',
    'MagicLinkToken',
  ];

  await Promise.all(modelsToPurge.map(purgeModel));

  // eslint-disable-next-line no-console
  console.log('Purge process complete.');
}

run()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Error during purge process:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
