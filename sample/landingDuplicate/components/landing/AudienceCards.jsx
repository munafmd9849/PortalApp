import React from 'react';

const AUDIENCES = [
  {
    title: 'Students',
    subtitle: 'Upskill, prepare, and land your first job',
    bullets: [
      'AI-ready resume structure',
      'Interview practice and assessments',
      'Apply to relevant jobs faster',
    ],
    accent: 'from-blue-900 to-indigo-700',
  },
  {
    title: 'Colleges',
    subtitle: 'Manage cohorts and improve placement rates',
    bullets: [
      'Student database + progress tracking',
      'Centralized placement workflows',
      'Reporting and outcome analytics',
    ],
    accent: 'from-gray-900 to-gray-700',
  },
  {
    title: 'Employers',
    subtitle: 'Discover job-ready talent at scale',
    bullets: [
      'Early talent pipeline',
      'Faster shortlisting',
      'Structured screening and hiring',
    ],
    accent: 'from-amber-600 to-yellow-500',
  },
];

export default function AudienceCards() {
  return (
    <section className="py-14 sm:py-18">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900">
            Built for the entire placement ecosystem
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto">
            A single platform where students, colleges, and employers collaborate with clarity.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          {AUDIENCES.map((a) => (
            <div
              key={a.title}
              className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition overflow-hidden"
            >
              <div className={`h-1.5 bg-gradient-to-r ${a.accent}`} />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">{a.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{a.subtitle}</p>
                  </div>
                  <div className="hidden sm:flex h-10 w-10 rounded-xl bg-gray-50 border border-gray-200 items-center justify-center text-gray-700">
                    {a.title === 'Students' ? 'S' : a.title === 'Colleges' ? 'C' : 'E'}
                  </div>
                </div>

                <ul className="mt-5 space-y-2 text-sm text-gray-700">
                  {a.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-gray-900/60" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('contact-form');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full rounded-xl bg-gray-900 text-white py-2.5 text-sm font-semibold hover:bg-gray-800 transition"
                  >
                    Book a demo
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

