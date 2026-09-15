import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { membership, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
export default async function Notes({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  const [documents, messages] = await Promise.all([
    db.document.findMany({
      where: { roomId: id },
      include: { chunks: { orderBy: { position: "asc" } } },
    }),
    db.chatMessage.findMany({
      where: { roomId: id, status: "complete" },
      orderBy: { createdAt: "asc" },
    }),
  ]);
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
                  <p style={{ whiteSpace: "pre-wrap" }}>{c.content}</p>
                </div>
              </section>
            ))}
          </article>
        ))}
        <h2>Discussion archive</h2>
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
      </main>
    </>
  );
}
