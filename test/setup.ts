import '@testing-library/jest-dom/vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.DATABASE_URL = 'file:./test.db';

// Initialize test database
if (process.env.NODE_ENV === 'test') {
  // Delete old test database
  const dbPath = path.join(process.cwd(), 'test.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  // Run migrations to ensure the database schema is up to date
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}
