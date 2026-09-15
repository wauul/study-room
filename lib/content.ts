export const posts = [
  {
    slug: "start-a-study-session",
    title: "A better first study session",
    category: "Getting started",
    updated: "2026-09-15",
    intro: "Turn a pile of notes into a focused conversation in four steps.",
    paragraphs: [
      "Create a room and give it a clear subject. A small, specific goal makes it easier to notice progress: understand active transport, rather than revise all of biology.",
      "Upload a selectable-text PDF or paste your notes. Add past exams separately: they guide question style, while your course material supplies the facts.",
      "Invite your study partners using the room link. Everyone needs an account. Ask one question and check the highlighted source passages before moving on.",
      "Wrap up when you are ready. Your rundown includes evidence from the discussion and quiz, plus a personal confidence record you can download as a PDF.",
    ],
  },
  {
    slug: "confidence-over-guessing",
    title: "Why honest confidence wins",
    category: "Study method",
    updated: "2026-09-15",
    intro:
      "You don’t have to be certain. You just have to say how certain you are.",
    paragraphs: [
      "In a confidence quiz, distribute 100% across four answers. If two answers feel equally likely, you can split your confidence between them.",
      "Your score is the natural logarithm of the probability you gave the correct option. Higher is better: certainty on the right answer scores zero; a uniform forecast scores about −1.386.",
      "Assigning zero to the correct answer gives negative infinity. Reporting your actual beliefs maximizes your expected score. The goal is calibration, not pretending to know.",
      "Answers stay private until everyone eligible submits or the 20-second deadline expires. Use the reveal to compare reasoning, not just rankings.",
    ],
    code: "const score = Math.log(probabilityOfCorrectAnswer / 100);",
  },
  {
    slug: "read-your-rundown",
    title: "Make your rundown useful",
    category: "Reflection",
    updated: "2026-09-15",
    intro:
      "A warm passage means it came up often. It doesn’t automatically mean you struggled.",
    paragraphs: [
      "The discussion heatmap highlights frequently retrieved passages and cools over time. It helps you see where the conversation went.",
      "A rundown combines those retrievals with ‘I’m lost’ clicks and confidence quiz results. Read its evidence before deciding what to revise.",
      "High-priority struggle points include a simpler explanation. You can ask for another explanation if the first one still does not click.",
      "Choose one concrete next step. Revisit a source passage, explain it without looking, then check yourself with another question.",
    ],
  },
];
export const faqs = [
  [
    "How do I invite someone?",
    "Open a room and choose Invite a friend. Share the copied link. Your friend signs in, chooses a display name, and joins the same table.",
  ],
  [
    "Which documents can I upload?",
    "Use selectable-text PDFs up to 4 MB, or paste text directly. Scanned pages need OCR first. Course notes supply facts; past exams guide quiz style.",
  ],
  [
    "Who can see my notes?",
    "Only signed-in participants of your room can access its material. People with the invite link can join, so share that link deliberately. Site search respects room membership.",
  ],
  [
    "Why does the first connection sometimes take longer?",
    "The free real-time server sleeps after inactivity. Give it a moment to wake up; the connection status updates automatically.",
  ],
  [
    "Can I change a quiz submission?",
    "A submission is final for that round. Check that your four probabilities total 100% before locking them in. Results appear when the round closes.",
  ],
  [
    "Can I reopen an ended session?",
    "Ending a session is final. The confirmation dialog gives you a chance to cancel. Your notes and rundown remain available; create a new room to study again.",
  ],
];
export function trackedUrl(href: string) {
  if (!/^(https?:)?\/\//i.test(href)) return href;
  try {
    const url = new URL(href, "https://study-room-ten-blond.vercel.app");
    if (
      ["study-room-ten-blond.vercel.app", "localhost", "127.0.0.1"].includes(
        url.hostname,
      )
    )
      return href;
    url.searchParams.set("utm_source", "study_room");
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("utm_campaign", "site");
    return url.toString();
  } catch {
    return href;
  }
}
