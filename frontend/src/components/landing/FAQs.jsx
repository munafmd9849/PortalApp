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
    <div
      className="w-full min-h-screen flex flex-col justify-center items-center px-4"
      style={{
        fontFamily: "'Inter', sans-serif",
        "--chart-4": "oklch(92% .12 84.429)", 
        "--chart-5": "oklch(88% .10 70.08)", 
      }}
    >
      <h2
        className="text-2xl sm:text-3xl md:text-3xl font-bold mb-8 text-center text-gray-800"
      >
      {/* Frequently Asked Questions */}
      Baar Baar Puche Gaye Sawaal (FAQs)
      </h2>

      <div className="w-full  space-y-2 px-15">
        {faqData.map((item, index) => (
          <div
            key={index}
            className="border rounded-lg overflow-hidden shadow-sm transition-all duration-300"
            style={{ borderColor: "var(--chart-5)" }}
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full flex justify-between items-center px-4 sm:px-6 py-4 sm:py-5 text-left font-semibold sm:text-lg transition-colors duration-300"
              style={{
                backgroundColor: "var(--chart-4)",
                color: "#000",
              }}
            >
              {item.question}
              <span className="ml-4 text-xl sm:text-2xl">
                {activeIndex === index ? "x" : "+"}
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-700 ${
                activeIndex === index ? "max-h-40" : "max-h-0"
              }`}
              style={{ backgroundColor: "white" }}
            >
              <div className="px-4 sm:px-6 py-4 text-gray-700 text-sm sm:text-base transition-all duration-700">
                {item.answer}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}