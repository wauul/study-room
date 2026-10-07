ALTER TABLE "Participant" ADD COLUMN "revokedAt" TIMESTAMP(3);
-- OAuth is used for identity only. Preserve account links, discard unused bearer credentials.
UPDATE "Account" SET access_token=NULL, refresh_token=NULL, id_token=NULL, session_state=NULL;
CREATE TABLE "GuardrailPolicy" (id TEXT PRIMARY KEY, config JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "GuardrailBucket" (key TEXT PRIMARY KEY, used INTEGER NOT NULL CHECK (used >= 0), "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "GuardrailBucket_expiresAt_idx" ON "GuardrailBucket" ("expiresAt");
CREATE TABLE "GuardrailLease" (key TEXT PRIMARY KEY, owner TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL);
INSERT INTO "GuardrailLease" (key, owner, "expiresAt") VALUES ('policy-lock', 'system', '2099-01-01');
CREATE TABLE "SecurityAudit" (id TEXT PRIMARY KEY, action TEXT NOT NULL, "actorId" TEXT, "targetId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "SecurityAudit_createdAt_idx" ON "SecurityAudit" ("createdAt");
CREATE TABLE "RoomInvitation" (id TEXT PRIMARY KEY, "roomId" TEXT NOT NULL REFERENCES "Room"(id) ON DELETE CASCADE, "tokenHash" TEXT NOT NULL UNIQUE, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "ReportDelivery" (id TEXT PRIMARY KEY, "roomId" TEXT NOT NULL REFERENCES "Room"(id) ON DELETE CASCADE, "participantId" TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'reserved', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "ReportDelivery_roomId_participantId_key" ON "ReportDelivery" ("roomId", "participantId");
CREATE TABLE "EmailVerification" ("tokenHash" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "EmailVerification_userId_idx" ON "EmailVerification" ("userId");
-- Existing rows do not establish mailbox ownership. Do not grandfather password emails.
-- Enable deliberately through the operator CLI after reviewing budgets and ingress.
INSERT INTO "GuardrailPolicy" (id, config) VALUES ('default', '{
  "enabled":{"signup":false,"newsletter":false,"rooms":true,"ai":false,"uploads":false,"email":false,"realtime":true,"exports":true},
  "dailyAiTokens":1000000,"monthlyAiTokens":10000000,"dailyAiCalls":500,
  "dailyEmails":100,"monthlyEmails":1000,"dailyUploads":50,
  "maxRoomsPerUser":20,"maxDocumentsPerRoom":20,"maxRoomCharacters":1000000,
  "maxParticipantsPerRoom":30,"retentionDays":90,"maxStoredCharacters":50000000
}');
