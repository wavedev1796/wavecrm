-- CRM-26 (Sprint 4, 2026-11-02): notas con menciones. Cada mención guarda cuándo se avisó, para avisar una sola vez.

-- AlterTable
ALTER TABLE "Note" ADD COLUMN "editedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NoteMention" (
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteMention_pkey" PRIMARY KEY ("noteId","userId")
);

-- CreateIndex
CREATE INDEX "NoteMention_userId_idx" ON "NoteMention"("userId");

-- AddForeignKey
ALTER TABLE "NoteMention" ADD CONSTRAINT "NoteMention_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteMention" ADD CONSTRAINT "NoteMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
