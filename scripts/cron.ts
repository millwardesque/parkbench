// scripts/cron.ts
/* eslint-disable no-console */

import 'dotenv/config';
import { expireStaleCheckins } from '../app/utils/checkin.server';
import { pruneExpiredVerificationTokens } from '../app/utils/user.server';
import prisma from '../app/utils/db.server';

async function run() {
  console.log('Starting cron jobs...');

  // Execute expire stale checkins
  try {
    const expiredCheckins = await expireStaleCheckins();
    console.log(`Expired ${expiredCheckins} stale check-ins.`);
    const now = new Date();
    await prisma.cronJobRun.upsert({
      where: { job_name: 'expire_stale_checkins' },
      update: { last_run_at: now },
      create: { job_name: 'expire_stale_checkins', last_run_at: now },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error expiring stale checkins:', error);
  }

  // Prune expired email verification tokens
  try {
    const prunedTokens = await pruneExpiredVerificationTokens();
    console.log(`Pruned ${prunedTokens} expired verification tokens.`);
    const now = new Date();
    await prisma.cronJobRun.upsert({
      where: { job_name: 'prune_expired_tokens' },
      update: { last_run_at: now },
      create: { job_name: 'prune_expired_tokens', last_run_at: now },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error pruning expired verification tokens:', error);
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
