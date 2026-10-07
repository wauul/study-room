-- Run as the database owner, after migrations. Assign your application's LOGIN role
-- membership in this role and use that restricted login in both deployments.
-- Do not use an owner/superuser/BYPASSRLS login for runtime traffic.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='study_room_runtime') THEN
    CREATE ROLE study_room_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO study_room_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "User", "Account", "Session", "VerificationToken", "Room", "Document", "DocumentChunk",
  "Participant", "ChatMessage", "RetrievalEvent", "QuizQuestion", "QuizResult", "LostClick",
  "SessionSummary", "NewsletterSubscriber", "GuardrailBucket", "GuardrailLease",
  "RoomInvitation", "ReportDelivery", "EmailVerification" TO study_room_runtime;
GRANT SELECT, INSERT, UPDATE ON "SecurityAudit" TO study_room_runtime;
GRANT SELECT ON "GuardrailPolicy" TO study_room_runtime;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "GuardrailPolicy" FROM study_room_runtime;
-- Migrations, policy changes and retention use a separate operator/owner connection.
