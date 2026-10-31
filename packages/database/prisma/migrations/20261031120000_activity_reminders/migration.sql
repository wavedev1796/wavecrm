ALTER TABLE "Activity"
ADD COLUMN "reminderAt" TIMESTAMP(3),
ADD COLUMN "reminderClaimedAt" TIMESTAMP(3),
ADD COLUMN "reminderSentAt" TIMESTAMP(3);

CREATE INDEX "Activity_status_dueAt_idx" ON "Activity"("status", "dueAt");
CREATE INDEX "Activity_reminderAt_reminderSentAt_status_idx"
ON "Activity"("reminderAt", "reminderSentAt", "status");
