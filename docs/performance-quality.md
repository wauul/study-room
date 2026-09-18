# Performance and answer-quality evidence

Measured on 18 September 2026 against the existing Neon data and deployed `/search` page. Raw document excerpts, model answers, query plans and Lighthouse JSON are kept in ignored `.tools/`; they are not published with this repository.

## Diagnosis before changes

- 14 documents / 104 chunks; PostgreSQL 18, pgvector 0.8.6. The database URL already used Neon's pooler. No vector index existed.
- The existing pipeline used quantized MiniLM embeddings and Groq `openai/gpt-oss-20b`, five passages, no cross-encoder. Llama 3.3 was not in the account's available-model list.
- Five answerable questions covered membrane transport, hypotonic cells, French JavaScript timers and variable scope, and an image-upload architecture. Two questions intentionally asked for missing information: mitochondrial gene count and duplicate-send prevention.
- The focus boost put active transport ahead of osmosis for the hypotonic-cell question. The correct passage was second. Four other answerable questions had the right passage first; all five had it in the supplied context.
- The mitochondrial question correctly abstained. The duplicate-send question incorrectly inferred a guarantee from CRM lookup/write-back; **the source does not establish that guarantee**. There was no missing idempotency passage to retrieve.
- Long text was split mid-sentence and mid-code. One architecture sentence stopped at “will not accept a”. A metric, “4 min”, was incorrectly treated as a heading. In the French PDF, 31/65 chunks exceeded the tokenizer's 512-token input window, with a maximum of 1,229 tokens.
- Initial mobile Lighthouse (Edge, standard simulated throttling): performance **80**, accessibility **100**, FCP **2.758 s**, LCP **4.291 s**, TBT **0 ms**, CLS **0.00062**. External Google Fonts CSS was render-blocking. This public-page audit does not measure authenticated room interaction latency.
- Sample pre-change vector SQL: **0.941 ms** execution, sequential chunk scan + sort. Local warm retrieval including embedding/network was **187–398 ms**. First model use was **2.83 s**. Database execution was not the dominant delay at this corpus size.
- `pg_stat_statements` initially did not exist. Enabling the extension exposed system/health-check entries, not a useful historical application slow-query baseline. Direct plans and timings are used instead; no historical slow-query improvement is claimed.
- Retrieval joins, citation fetches and event writes were already batched. Ingestion did two writes per chunk. Heat restoration loaded every event; summaries repeatedly filtered that event list. Chat loaded every message. The realtime heatmap already used an in-memory cache and a four-second broadcast interval.
- The room's document and Markdown rendering shared frequent token/heat/countdown updates. Search was already debounced 250 ms; chat was submit-only. PDF rendering was already entirely server-side; no client chart library existed. No raw vectors were exposed in room responses.

## Model comparison and implementation choices

MiniLM and BGE-small (quantized, BGE CLS pooling with the recommended query instruction) both ranked a correct source first for all five answerable questions without the old focus boost. BGE offered no demonstrated top-one gain here. Median document embedding: **117 ms MiniLM / 183 ms BGE**; process RSS **287 / 357 MiB**. MiniLM is retained; these small-sample results are not a universal model benchmark.

Both Groq 20B and 120B were tested on the same seven original contexts using the same stricter prompt. Both still invented duplicate-send prevention. The larger model did not demonstrate a sufficient quality gain, so 20B remains the default for answers and structured tasks. Rate-limit/retry delays affected some 16–21 s calls; these are not pure inference timings. `GROQ_ANSWER_MODEL` can independently override answer generation if later evidence warrants it.

New ingestion respects paragraphs and sentences, targeting 180 words with up to 30 words of complete-sentence overlap. The actual MiniLM tokenizer recursively subdivides chunks above **384 tokens**, leaving room for the cross-encoder query. Oversized individual sentences/code still need bounded splitting. The French document becomes 172 chunks, maximum 382 tokens, with zero input-window overflows. Word-only splitting had still left 14 overflows; token checking removed those.

Q&A retrieves 20 candidates, applies the quantized `Xenova/ms-marco-MiniLM-L-6-v2` cross-encoder, and supplies at most five passages. Study focus is a small relevance tie-breaker. Empty focus terms are ignored, numeric boundaries distinguish chapter 1 from chapter 10, and unlabeled passages remain included. A best reranker logit below **-5** withholds context and triggers abstention; this threshold was calibrated on this small regression set, is not a probability, and needs reevaluation for new domains/languages. Quiz retrieval remains separate.

Reranking added approximately **0.4–6 s** locally for 4–20 candidates; models are reused and pairs scored serially to limit memory. The final offline evaluation stayed around **366–403 MiB RSS**. It improves evidence selection but is not advertised as a latency optimization. Model downloads and free Render wake-up remain additional cold-start costs.

## Database and UI changes

- HNSW cosine index on active embeddings; candidate SQL orders directly by distance and enables strict iterative scanning for filtered ANN queries. The planner still preferred existing room/document B-tree indexes for the tiny production room. A temporary **10,400-vector** copied-vector scale fixture naturally used HNSW: **0.233 ms**. This fixture is an index-eligibility check, not a production recall or latency benchmark; it was dropped automatically. No planner forcing is used in the app.
- Duplicate whitespace-equivalent query embeddings share a bounded five-minute cache (128 entries, including in-flight work). Measured repeated query: **0.87 ms**, versus **2.41 s** including initial model load. Distinct wording is never treated as equivalent.
- Ingestion uses batches of up to 50 vector rows instead of two DB writes per chunk. Heat restoration and leaderboard totals use grouped SQL; summary retrieval counts use `groupBy`.
- Initial chat and archive pages contain at most 50 messages, with timestamp/id ordering and room-scoped cursors. Earlier pages preserve scroll position. Source text and embeddings are not redundantly serialized in room metadata.
- Streaming is flushed every 50 ms; completed Markdown and document passages are memoized; countdown updates are once per second. Loading placeholders cover document/chat/leaderboard startup. Optional `RAG_METRICS=1` logs only token/frame counts, not questions or content.
- Lora is self-hosted with `next/font` to remove the external render-blocking stylesheet. The existing PDF server boundary, debounced search, submit-only chat and heatmap broadcast interval are preserved.

## Reprocessing and regression commands

1. Deploy the migration and code to **both** Next.js and the realtime server before reprocessing.
2. `npx tsx scripts/reprocess-documents.ts` previews counts; add `--apply` to re-embed. Version claims make reruns idempotent and each document switches atomically.
3. Old chunk IDs/content remain archived for historical citations, quiz questions and retrieval events. New search/viewer retrieval uses active chunks. Archived citations open the retained source in the notes page.
4. Legacy uploads did not retain original text/files. The script reconstructs text by removing the known 45-word overlap; lost original whitespace, PDF layout and some section boundaries cannot be recovered. New uploads retain extracted raw text for future reprocessing. Archived originals are not deleted.
5. `npx tsx scripts/evaluate-rag.ts` evaluates the existing sample biology upload using `samples/rag-eval.json`. Optional arguments select a private case file and output path. Checks assert the expected top passage, citations for supported answers, and abstention for unsupported questions; inspect full answers manually for claim-level support.
6. `npm test`, `npm run typecheck`, `npm run build`; then run `tests/live-session.ts` and `tests/site-features.ts` with `TEST_BASE_URL` pointing to the target deployment. The tests use real services; email is sent only if `TEST_EMAIL` is explicitly set.

Model implementation references: [BGE author model card](https://huggingface.co/BAAI/bge-small-en-v1.5), [cross-encoder ONNX model card](https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2), [pgvector index/filter guidance](https://github.com/pgvector/pgvector).

## Final before/after results

The same seven questions were rerun against the stored replacement chunks and the final prompt/evidence filter. Five expected-source assertions, supported-answer citation checks, and both unsupported-question abstention checks passed. Manual inspection confirmed the useful core answers; this is a small regression sample, not an accuracy guarantee for arbitrary documents. Some legacy section labels still reflect the lost PDF layout.

| Check | Before | After |
| --- | --- | --- |
| Correct first passage, five answerable questions | 4/5 with standing focus | 5/5 |
| Unsupported questions answered with abstention | 1/2 | 2/2 |
| French PDF chunks exceeding 512 tokens | 31 | 0 |
| Hypotonic-cell source | Active transport first, osmosis second | Osmosis first; unrelated passages withheld |
| Duplicate-send prevention | Invented a prevention guarantee from CRM write-back | “The supplied passages do not establish this.” |
| Initial/history chat page | All messages | At most 50, with earlier-page cursor |
| Mobile Lighthouse performance | 80 | 98 |
| Lighthouse accessibility | 100 | 100 |
| First contentful paint | 2.758 s | 1.230 s |
| Largest contentful paint | 4.291 s | 2.163 s |
| Total blocking time | 0 ms | 114.5 ms |
| Cumulative layout shift | 0.00062 | 0.000006 |

Lighthouse used the same public URL, machine, Edge executable, categories and default mobile simulated throttling. These are single runs and include network/CPU variability: TBT increased while overall paint performance improved. Both JSON reports have no runtime audit error. The CLI exited with a Windows `EPERM` while removing its temporary browser profile **after** saving each completed report.

Local warm retrieval median, including remote database calls, increased from **0.208 s to 2.727 s** because cross-encoding is additional work. Generation median fell from **1.090 s to 0.539 s** in these runs. Do not interpret this as a universal end-to-end latency improvement; quality is deliberately traded for retrieval time. Groq rate limits, cold starts, host load and answer length vary.

All **14 legacy documents** were switched to processing version 2: **218 active replacement chunks**, with all **104 original chunks** checked byte-for-byte and retained as inactive historical sources. A second apply run selected zero documents. The migration is additive; no user content, citation IDs or quiz source rows were deleted.

Final query plans on the larger real room still chose room/document B-tree indexes and a small sort: **0.793–0.844 ms** in three runs. This differs from the initial seven-chunk room, so it is not a controlled speedup comparison. HNSW usage was demonstrated in the scale fixture; production's small-corpus planner choice remains explicitly documented.

Validation includes 11 unit checks, TypeScript, production Next.js build, real two-client streaming/highlighting, simplification, unsupported-question abstention, private quiz submissions, simultaneous reveal, rundown/PDF generation, authenticated search, newsletter persistence/unsubscribe, 404 status, and 50+3 cursor pages with equal timestamps and access checks. No test email was sent. Live frontend search was also checked in the browser; it returned results and loaded Lora from the app's own CSS assets.
