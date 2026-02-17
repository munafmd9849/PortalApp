import React, { useState } from "react";


const faqData = [
  {
    question: "How do I register for the placement portal?",
    answer:
      "To register, log in using your institute-provided email ID, fill in your profile details, and upload the required documents such as your resume and mark sheets.",
  },
  {
    question: "Can I update my resume after submitting it on the portal?",
    answer:
      "Yes, you can update your resume anytime before the application deadline of a particular company. The updated version will automatically replace the old one.",
  },
  {
    question: "How will I be notified about upcoming placement drives?",
    answer:
      "Notifications about placement drives will be sent to your registered email ID and displayed on your dashboard under the 'Upcoming Drives' section.",
  },
  {
    question: "What is the eligibility criteria for participating in campus placements?",
    answer:
      "Eligibility varies for each company. It is typically based on CGPA, backlog status, and attendance. Details are mentioned in the job description for every drive.",
  },
  {
    question: "Can I apply for multiple companies at the same time through the portal?",
    answer:
      "Yes, you may apply for multiple companies if you meet their eligibility criteria, unless restricted by the institute’s placement policy.",
  },
];

export default function PlacementFAQ() {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="relative w-full bg-[var(--pl-bg)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_55%_at_50%_0%,color-mix(in_oklab,var(--pl-primary)_18%,transparent),transparent_60%)]" />
      <div className="mx-auto max-w-5xl px-6 pt-16 pb-8 lg:py-16 relative">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--pl-border)] bg-[var(--pl-surface)] px-3 py-1 text-xs font-semibold tracking-widest text-[var(--pl-text-secondary)] shadow-sm backdrop-blur">
            HELP CENTER
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--pl-text)]">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[var(--pl-text-secondary)]">
            Quick answers to common placement‑portal questions.
          </p>
        </div>

        <div className="mt-10">
          <div className="mx-auto max-w-3xl">
            <div className="w-full space-y-3">
              {faqData.map((item, index) => {
                const isOpen = activeIndex === index;
                return (
                  <div
                    key={`${item.question}-${index}`}
                    className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] shadow-sm transition hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFAQ(index)}
                      className="w-full flex items-start justify-between gap-4 px-5 sm:px-6 py-5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-[15px] sm:text-base font-semibold text-[var(--pl-text)] leading-snug">
                        {item.question}
                      </span>
                      <span
                        className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] text-[var(--pl-text)] transition ${
                          isOpen ? "rotate-45" : "rotate-0"
                        }`}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </button>

                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-5 sm:px-6 pb-6 text-sm sm:text-base text-[var(--pl-text-secondary)] leading-relaxed">
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}