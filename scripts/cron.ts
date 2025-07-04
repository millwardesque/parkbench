// scripts/cron.ts
import 'dotenv/config';
import { expireStaleCheckins } from '../app/utils/checkin.server';
import prisma from '../app/utils/db.server';

async function run() {
  // eslint-disable-next-line no-console
  console.log('Running cron job: expiring stale check-ins...');
  try {
    const count = await expireStaleCheckins();
    const now = new Date();
    await prisma.cronJobRun.upsert({
      where: { job_name: 'expire_stale_checkins' },
      update: { last_run_at: now },
      create: { job_name: 'expire_stale_checkins', last_run_at: now },
    });
    // eslint-disable-next-line no-console
    console.log(`Successfully expired ${count} stale check-in(s).`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error running cron job:', error);
    process.exit(1);
  }
}

async function watch() {
  // eslint-disable-next-line no-console
  console.log('Running in watch mode. Will expire check-ins every 60 seconds.');
  // Run it once immediately
  await run();
  // Then run it every 60 seconds
  setInterval(run, 60 * 1000);
}

if (process.argv.includes('--watch')) {
  watch();
} else {
  run();
}
