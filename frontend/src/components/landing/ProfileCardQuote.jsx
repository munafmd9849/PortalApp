import React from "react";
import "./ProfileCardQuote.css";

/**
 * Quote-style card: dark green background, profile picture overlapping above the card,
 * large white quotation marks, white testimonial text. LinkedIn and email visible at bottom.
 * One of the five "Hear how they cracked it" cards; theme aligned with root colors.
 */
export default function ProfileCardQuote({
  name = "Student Name",
  title = "Company • Role",
  status = "",
  testimonial = "",
  avatarUrl = "",
  linkedinUrl,
  emailHref,
  batch = "",
}) {
  return (
    <article className="pcq-card">
      {/* Subtle lighter green shapes at top corners */}
      <div className="pcq-shapes" aria-hidden />

      {/* Avatar: positioned so it sits above the card a bit */}
      <div className="pcq-avatar-wrap">
        <img
          className="pcq-avatar"
          src={avatarUrl}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </div>

      {/* Quote marks (white) + testimonial text */}
      <div className="pcq-quote-wrap">
        <span className="pcq-quote-mark pcq-quote-open" aria-hidden>"</span>
        <p className="pcq-quote-text records-testimonial-text records-testimonial-text--dark">{testimonial}</p>
        <span className="pcq-quote-mark pcq-quote-close" aria-hidden>"</span>
      </div>

      {/* Bottom: LinkedIn + email visible; optional LPA */}
      <div className="pcq-footer">
        {status && <span className="pcq-pill">{status}</span>}
        <div className="pcq-social">
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pcq-icon pcq-icon-linkedin"
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="pcq-icon-svg">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          )}
          {emailHref && (
            <a
              href={emailHref}
              className="pcq-icon pcq-icon-email"
              aria-label="Email"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pcq-icon-svg">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
