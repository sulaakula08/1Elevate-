"use client";

/**
 * An ordinary post: someone's words.
 *
 * There is deliberately nothing else here. Every other type in the feed has a
 * structured block to lay out — an answer pair, two scores, a session summary —
 * and this one is what you get when a student simply had something to say. So it
 * is the plainest thing in the column: the text at reading size, and the actions
 * the whole feed shares. No eyebrow label, because "POST" above a post says
 * nothing.
 *
 * No subject or topic field either. The API spreads a post's payload onto the
 * post, so a typed block for this type would read `post.post.subjectId`, and a
 * free-text topic without a subject beside it means nothing. Two optional
 * selects would also put back the deciding this whole change removed — the point
 * is that you write first.
 */
export function GenericPostContent({ text }: { text?: string }) {
  return text ? <p className="text-body leading-relaxed cm-prose">{text}</p> : null;
}
