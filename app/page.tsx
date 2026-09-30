import { getLocale } from "@/lib/locale";
import { translator } from "@/lib/i18n";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Header from "@/components/Header";
import Newsletter from "@/components/Newsletter";
import StudyMethod from "@/components/StudyMethod";
import { Plus, Users, FileText } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function Home() {
  const locale = await getLocale();
  const t = translator(locale);
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  let failed = false;
  const rooms = userId
    ? await db.room
        .findMany({
          where: { participants: { some: { userId } } },
          include: {
            _count: { select: { participants: true, documents: true } },
          },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => {
          failed = true;
          return [];
        })
    : [];
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell home-page">
        {userId ? (
          <div className="page-heading row between">
            <div>
              <h1>{t("Your study rooms")}</h1>
              <p>{t("Pick up a discussion or start with new material.")}</p>
            </div>
            <Link className="button" href="/rooms/new">
              <Plus size={18} />
              {t("Create a room")}
            </Link>
          </div>
        ) : (
          <section className="home-hero">
            <div className="hero-copy">
              <h1>
                {t("Your notes")}
                <br />
                {t("Your questions")}
                <br />
                <span>{t("A clearer next step")}</span>
              </h1>
              <p>
                {t(
                  "Bring your course material and your study group. Work through questions with cited answers, test your confidence, and decide what to revise next.",
                )}
              </p>
              <div className="hero-actions">
                <Link className="button" href="/login">
                  {t("Start a study room")}
                </Link>
                <Link
                  className="text-link"
                  href="/guides/start-a-study-session"
                >
                  {t("How a session works")}
                </Link>
              </div>
              <p className="hero-footnote">
                {t("PDFs or pasted notes. Everyone joins with an account.")}
              </p>
            </div>
            <StudyMethod />
          </section>
        )}
        {userId && (
          <section aria-label={t("Your rooms")}>
            {failed && (
              <p className="error" role="alert">
                {t(
                  "We couldn’t load your rooms. Refresh the page to try again.",
                )}
              </p>
            )}
            {rooms.length ? (
              <div className="room-grid">
                {rooms.map((room) => (
                  <Link
                    className="room-card"
                    key={room.id}
                    href={`/rooms/${room.id}${room.status === "ENDED" ? "/summary" : ""}`}
                  >
                    <div className="room-status">
                      <span
                        className={`status-label ${room.status === "ACTIVE" ? "live" : ""}`}
                      >
                        {room.status === "ACTIVE"
                          ? t("Open session")
                          : t("Rundown ready")}
                      </span>
                    </div>
                    <h2>{room.name}</h2>
                    <p>
                      {room.studyFocusRaw ||
                        t("Shared notes, questions, and confidence quizzes.")}
                    </p>
                    <div className="room-meta">
                      <span>
                        <Users size={16} />
                        {room._count.participants} {t("participants")}
                      </span>
                      <span>
                        <FileText size={16} />
                        {room._count.documents} {t("documents")}
                      </span>
                    </div>
                    <span className="room-link-label">
                      {room.status === "ACTIVE"
                        ? t("Continue studying")
                        : t("Read the rundown")}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              !failed && (
                <div className="room-empty">
                  <div className="annotation-mark" aria-hidden="true">
                    [ ]
                  </div>
                  <div>
                    <h2>{t("Your first room starts with a subject")}</h2>
                    <p>
                      {t(
                        "Choose a topic, add your notes, and share the room link with your study group.",
                      )}
                    </p>
                    <Link className="text-link" href="/rooms/new">
                      {t("Create your first room")}
                    </Link>
                  </div>
                </div>
              )
            )}
          </section>
        )}
        <section className="study-flow" aria-labelledby="flow-heading">
          <div className="flow-intro">
            <h2 id="flow-heading">
              {t("From a difficult passage")}
              <br />
              {t("to a plan for next time")}
            </h2>
            <p>
              {t(
                "Keep the material, the discussion, and your confidence in the same place.",
              )}
            </p>
          </div>
          <ol className="flow-steps">
            <li>
              <h3>{t("Read the source")}</h3>
              <p>
                {t(
                  "Upload course notes. Answers cite the exact passages, so you can check the reasoning.",
                )}
              </p>
            </li>
            <li>
              <h3>{t("Say how sure you are")}</h3>
              <p>
                {t(
                  "Assign probabilities in a shared quiz. Submissions stay private until the round closes.",
                )}
              </p>
            </li>
            <li>
              <h3>{t("Choose what to revisit")}</h3>
              <p>
                {t(
                  "Your rundown brings together discussion signals and quiz results, with a personal PDF to keep.",
                )}
              </p>
            </li>
          </ol>
        </section>
        <Newsletter />
      </main>
    </>
  );
}
