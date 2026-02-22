import React from "react";
import "./ProfileCardMinimal.css";

/**
 * Minimal card: light grey, profile top center overlapping, name / company / role, LPA, batch, social.
 * No testimonial quote – clean placeholder-style for comparison.
 */
export default function ProfileCardMinimal({
  name = "Student Name",
  title = "Company • Role",
  status = "",
  avatarUrl = "",
  linkedinUrl,
  emailHref,
  batch = "",
}) {
  const [company, role] = title.includes(" • ") ? title.split(" • ") : [title, ""];

  return (
    <article className="pcm-card">
      <div className="pcm-avatar-wrap">
        <img
          className="pcm-avatar"
          src={avatarUrl}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </div>

      <div className="pcm-body">
        <h3 className="pcm-name">{name}</h3>
        {company && <p className="pcm-company">{company}</p>}
        {role && <p className="pcm-role">{role}</p>}
        {status && <span className="pcm-lpa">{status}</span>}
        {batch && <p className="pcm-batch">{batch}</p>}
      </div>

      <div className="pcm-footer">
        <div className="pcm-social">
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pcm-icon pcm-icon-linkedin"
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="pcm-icon-svg">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          )}
          {emailHref && (
            <a
              href={emailHref}
              className="pcm-icon pcm-icon-email"
              aria-label="Email"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pcm-icon-svg">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
