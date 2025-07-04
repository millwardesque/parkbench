-- CreateTable
CREATE TABLE "cron_job_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_name" TEXT NOT NULL,
    "last_run_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "cron_job_runs_job_name_key" ON "cron_job_runs"("job_name");
