import React, { useState } from "react";
import "./ProfileCardAccordion.css";

/**
 * Background-image card with "Testimonials" bar that expands on hover to show quote
 * (like Career Services team cards – accordion testimonial on hover).
 */
export default function ProfileCardAccordion({
  name = "Student Name",
  title = "Company • Role",
  status = "",
  testimonial = "",
  avatarUrl = "",
  linkedinUrl,
  emailHref,
  batch = "",
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className="pca-card group"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div
        className="pca-bg"
        style={{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined }}
      />
      <div className="pca-overlay" />

      <div className="pca-header">
        <h3 className="pca-name">{name}</h3>
        <p className="pca-title">{title}</p>
      </div>

      {/* Accordion: "Testimonials" label, expands on hover (desktop) or tap (mobile) */}
      <div
        className={`pca-accordion ${expanded ? "pca-accordion--open" : ""}`}
        onClick={(e) => { e.stopPropagation(); setExpanded((prev) => !prev); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded((prev) => !prev); } }}
        aria-expanded={expanded}
        aria-label="Toggle testimonials"
      >
        <div className="pca-accordion-head">
          <span className="pca-accordion-label">Testimonials</span>
        </div>
        <div className="pca-accordion-body">
          <p className="pca-accordion-quote records-testimonial-text records-testimonial-text--dark">
            {testimonial}
          </p>
        </div>
      </div>

      <div className="pca-footer">
        {status && <span className="pca-pill">{status}</span>}
        <div className="pca-social">
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pca-icon pca-icon-linkedin"
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="pca-icon-svg">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          )}
          {emailHref && (
            <a
              href={emailHref}
              className="pca-icon pca-icon-email"
              aria-label="Email"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pca-icon-svg">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
