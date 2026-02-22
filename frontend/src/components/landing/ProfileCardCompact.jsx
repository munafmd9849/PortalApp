import React from "react";
import "./ProfileCardCompact.css";

/**
 * Compact testimonial card: light grey background, profile + name/designation at top,
 * light green accent bar, quote in middle, bottom bar with LPA pill + social links.
 * Same theme and social links as ProfileCard; used for first 2 of 5 "Hear how they cracked it" cards.
 */
export default function ProfileCardCompact({
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
    <article className="pcc-card">
      {/* Top: profile pic overlapping green bar + name + designation */}
      <div className="pcc-header">
        <div className="pcc-header-bar" />
        <img
          className="pcc-avatar"
          src={avatarUrl}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
        <div className="pcc-meta">
          <h3 className="pcc-name">{name}</h3>
          <p className="pcc-title">{title}</p>
        </div>
      </div>

      {/* Middle: quote with quote marks */}
      <div className="pcc-quote-wrap">
        <span className="pcc-quote-mark pcc-quote-open" aria-hidden>"</span>
        <p className="pcc-quote-text records-testimonial-text records-testimonial-text--light">{testimonial}</p>
        <span className="pcc-quote-mark pcc-quote-close" aria-hidden>"</span>
      </div>

      {/* Bottom: light green bar, LPA pill + social links */}
      <div className="pcc-footer">
        {status && (
          <div className="pcc-pill">{status}</div>
        )}
        <div className="pcc-social">
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pcc-icon pcc-icon-linkedin"
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="pcc-icon-svg">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          )}
          {emailHref && (
            <a
              href={emailHref}
              className="pcc-icon pcc-icon-email"
              aria-label="Email"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pcc-icon-svg">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
