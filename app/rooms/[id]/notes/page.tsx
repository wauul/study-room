import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { membership, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
export default async function Notes({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ before?: string; message?: string; chunk?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  let access;
  try {
    access = await membership(id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 401)
      redirect("/login?next=/rooms/" + id + "/notes");
    if (e instanceof HttpError && (e.status === 403 || e.status === 404))
      notFound();
    throw e;
  }
  const boundary = query.before
    ? await db.chatMessage.findFirst({
        where: { id: query.before, roomId: id },
        select: { id: true, createdAt: true },
      })
    : null;
  const [documents, rows] = await Promise.all([
    db.document.findMany({
      where: { roomId: id },
      include: {
        chunks: {
          where: {
            OR: [
              { active: true },
              ...(query.chunk ? [{ id: query.chunk }] : []),
            ],
          },
          orderBy: { position: "asc" },
        },
      },
    }),
    db.chatMessage.findMany({
      where: {
        roomId: id,
        status: "complete",
        ...(query.message
          ? { id: query.message }
          : boundary
            ? {
                OR: [
                  { createdAt: { lt: boundary.createdAt } },
                  { createdAt: boundary.createdAt, id: { lt: boundary.id } },
                ],
              }
            : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 51,
    }),
  ]);
  const messages = rows.slice(0, 50).reverse();
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell article-page">
        <Link
          className="text-link"
          href={
            "/rooms/" + id + (access.room.status === "ENDED" ? "/summary" : "")
          }
        >
          ← Back to session
        </Link>
        <p className="eyebrow" style={{ marginTop: 30 }}>
          Your room library
        </p>
        <h1>{access.room.name}</h1>
        {documents.map((d) => (
          <article key={d.id}>
            <h2>{d.filename}</h2>
            <p className="post-date">
              Added{" "}
              <time dateTime={d.createdAt.toISOString()}>
                {d.createdAt.toISOString().slice(0, 10)}
              </time>
            </p>
            {d.chunks.map((c) => (
              <section
                id={"chunk-" + c.id}
                key={c.id}
                className="library-passage"
              >
                <div>
                  <h3>{c.sectionLabel || "Passage"}</h3>
                  {!c.active && (
                    <p className="muted">
                      Archived passage — retained for the original citation.
                    </p>
                  )}
                  <p style={{ whiteSpace: "pre-wrap" }}>{c.content}</p>
                </div>
              </section>
            ))}
          </article>
        ))}
        <h2>Discussion archive</h2>
        {(query.before || query.message) && (
          <Link className="text-link" href={`/rooms/${id}/notes`}>
            Latest messages
          </Link>
        )}
        {messages.map((m) => (
          <article
            className="summary-section"
            id={"message-" + m.id}
            key={m.id}
          >
            <span className="eyebrow">{m.kind}</span>
            <time className="post-date" dateTime={m.createdAt.toISOString()}>
              Posted {m.createdAt.toISOString().slice(0, 16).replace("T", " ")}{" "}
              UTC
            </time>
            <p style={{ whiteSpace: "pre-wrap", marginTop: 20 }}>{m.content}</p>
          </article>
        ))}
        {rows.length > 50 && (
          <Link
            className="secondary"
            href={`/rooms/${id}/notes?before=${messages[0].id}`}
          >
            Earlier messages
          </Link>
        )}
      </main>
    </>
  );
}
