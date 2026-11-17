ALTER TABLE "background_job_logs"
ADD COLUMN "idempotency_key" TEXT,
ADD COLUMN "locked_at" TIMESTAMP(3),
ADD COLUMN "locked_by" TEXT;

CREATE UNIQUE INDEX "background_job_logs_idempotency_key_key"
ON "background_job_logs"("idempotency_key");

CREATE INDEX "background_job_logs_status_scheduled_for_idx"
ON "background_job_logs"("status", "scheduled_for");
