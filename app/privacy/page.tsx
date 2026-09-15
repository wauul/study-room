import Header from "@/components/Header";
export default function Privacy() {
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell article-page">
        <span className="eyebrow">Your information</span>
        <h1>Privacy, in plain words.</h1>
        <p className="post-date">Last updated 15 September 2026</p>
        <div className="prose">
          <h2>Essential storage</h2>
          <p>
            Session and security cookies keep you signed in and protect forms.
            Theme preference and cookie-notice acknowledgement are stored
            locally in your browser. No optional analytics cookies are used.
          </p>
          <h2>Your study material</h2>
          <p>
            Accounts, room membership, extracted notes, discussions and quiz
            results are stored in Neon. Room participants can access shared
            material. Relevant passages are sent to Groq to generate answers.
            Personalized emails are delivered through Resend when requested.
          </p>
          <h2>Newsletter</h2>
          <p>
            Signing up stores your email and consent date for occasional Study
            Room newsletters. Future campaigns must include an unsubscribe link.
            Signing up does not automatically send a message.
          </p>
          <h2>External links</h2>
          <p>
            Outbound web links include campaign labels identifying Study Room as
            the source. Those labels contain no account, email, room, or
            document data. External sites have their own privacy practices.
          </p>
        </div>
      </main>
    </>
  );
}
