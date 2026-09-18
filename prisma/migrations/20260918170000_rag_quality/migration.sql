ALTER TABLE "Document" ADD COLUMN "rawText" TEXT, ADD COLUMN "processingVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DocumentChunk" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "DocumentChunk_embedding_hnsw_idx" ON "DocumentChunk" USING hnsw (embedding vector_cosine_ops) WHERE active AND embedding IS NOT NULL;
CREATE INDEX "ChatMessage_roomId_createdAt_id_idx" ON "ChatMessage" ("roomId", "createdAt", id);
