"use client";

import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { FaQuoteLeft, FaQuoteRight } from "react-icons/fa6";
import { FaLinkedin } from "react-icons/fa";

import R1 from "../../assets/images/Rec1.png";
import R2 from "../../assets/images/Rec2.png";
import R3 from "../../assets/images/Rec3.png";
import Stepper, { Step } from "./Stepper";

// ----------------- Animated Testimonials -----------------
const AnimatedTestimonials = ({ testimonials, autoplay = false }) => {
  const [active, setActive] = useState(0);

  const handleNext = () => {
    setActive((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const isActive = (index) => index === active;

  useEffect(() => {
    if (autoplay) {
      const interval = setInterval(handleNext, 5000);
      return () => clearInterval(interval);
    }
  }, [autoplay]);

  const randomRotateY = () => Math.floor(Math.random() * 21) - 10;

  return (
    <div className="mx-auto max-w-sm px-4 py-10 font-sans antialiased md:max-w-4xl md:px-8 lg:px-12">
      <div className="relative grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* ----- IMAGE SECTION ----- */}
        <div>
          <div className="relative h-80 w-full">
            <AnimatePresence>
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.src}
                  initial={{ opacity: 0, scale: 0.9, rotate: randomRotateY() }}
                  animate={{
                    opacity: isActive(index) ? 1 : 0.7,
                    scale: isActive(index) ? 1 : 0.95,
                    rotate: isActive(index) ? 0 : randomRotateY(),
                    zIndex: isActive(index)
                      ? 40
                      : testimonials.length + 2 - index,
                    y: isActive(index) ? [0, -80, 0] : 0,
                  }}
                  exit={{ opacity: 0, scale: 0.9, rotate: randomRotateY() }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="absolute inset-0 origin-bottom"
                >
                  <div className="relative h-full w-full">
                    <img
                      src={testimonial.src}
                      alt={testimonial.name}
                      className="h-full w-full rounded-3xl object-cover"
                    />
                    {testimonial.linkedin && (
                      <a
                        href={testimonial.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-3 right-3 inline-flex items-center justify-center rounded-full bg-white/90 p-2 shadow-md hover:bg-white transition"
                      >
                        <FaLinkedin className="h-4 w-4 text-[#0A66C2]" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ----- TEXT SECTION ----- */}
        <div className="flex flex-col justify-between py-4">
          <motion.div
            key={active}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <h3 className="text-2xl font-bold">{testimonials[active].name}</h3>
            <p className="text-sm text-gray-500">
              {testimonials[active].designation}
            </p>

            {/* QUOTE TEXT WITH ICONS */}
            <motion.p className="mt-8 text-lg text-gray-500 leading-relaxed">
              <FaQuoteLeft className="inline text-2xl text-blue-900 mr-2 align-top" />
              {testimonials[active].quote.split(" ").map((word, index, arr) => (
                <motion.span
                  key={index}
                  initial={{ filter: "blur(10px)", opacity: 0, y: 5 }}
                  animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: 0.02 * index,
                  }}
                  className="inline-block"
                >
                  {word}
                  {/* Attach closing quote to last word */}
                  {/* {index === arr.length - 1 && (
                    <FaQuoteRight className="inline text-blue-900 ml-2 align-bottom" />
                  )} */}
                  &nbsp;
                </motion.span>
              ))}
            </motion.p>
          </motion.div>

          {/* NAVIGATION BUTTONS */}
          <div className="flex gap-4 pt-8">
            <button
              onClick={handlePrev}
              className="group/button flex h-7 w-7 items-center justify-center rounded-full bg-gray-100"
            >
              <IconArrowLeft className="h-5 w-5 text-black group-hover/button:rotate-12 transition-transform" />
            </button>
            <button
              onClick={handleNext}
              className="group/button flex h-7 w-7 items-center justify-center rounded-full bg-gray-100"
            >
              <IconArrowRight className="h-5 w-5 text-black group-hover/button:-rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------- MAIN TESTIMONIAL + FORM SECTION -----------------
export default function TestimonialSection() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    message: "",
  });
  const [currentStep, setCurrentStep] = useState(1);

  const testimonials = [
    {
      src: `${R1}`,
      name: "Arvind Kumar",
      designation: "Software Engineer",
      linkedin: "https://www.linkedin.com/in/arvind-kumar",
      quote:
        `Hiring from them has always felt less like a transaction and more like discovering a hidden talent gem—shiny, valuable, and instantly impressive`,
    },
    {
      src: `${R2}`,
      name: "Priya Patel",
      designation: "Data Analyst",
      linkedin: "https://www.linkedin.com/in/priya-patel",
      quote:
        `Working with them is like having a recruitment cheat code—every role gets filled with that perfect candidate`,
    },
    {
      src: `${R3}`,
      name: "Shobhit Singh",
      designation: "Marketing Specialist",
      linkedin: "https://www.linkedin.com/in/shobhit-singh",
      quote:
        `Hiring from them has always been suspiciously easy—like they've cracked some secret hiring algorithm`,
    },
  ];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: null, message: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear status when user starts typing
    if (submitStatus.type) {
      setSubmitStatus({ type: null, message: '' });
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

      try {
        // Import contact service dynamically to avoid issues
        const { submitContactForm } = await import('../../services/contact.js');
      
      const result = await submitContactForm({
        name: formData.name,
        company: formData.company,
        email: formData.email,
        message: formData.message,
      });

      if (result.success) {
        setSubmitStatus({ 
          type: 'success', 
          message: result.message || 'Thank you for your message! We will get back to you soon.' 
        });
    setFormData({ name: "", company: "", email: "", message: "" });
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSubmitStatus({ type: null, message: '' });
        }, 5000);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: error.message || 'Failed to submit form. Please try again later.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const phoneOk = /^\d{10,15}$/.test(String(formData.company || "").trim());
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(formData.email || "").trim());
  const submitNow = async () => {
    if (!formData.name?.trim() || !phoneOk || !emailOk || !formData.message?.trim()) return;
    await handleSubmit();
  };
  const canProceed =
    (currentStep === 1 && String(formData.name || "").trim().length >= 2) ||
    (currentStep === 2 && phoneOk) ||
    (currentStep === 3 && emailOk) ||
    (currentStep === 4 && String(formData.message || "").trim().length >= 10) ||
    currentStep >= 5;

  return (
    <div id="founders-section" className="container mx-auto px-4 lg:px-8 py-12 flex flex-col lg:flex-row gap-8">
      {/* TESTIMONIALS */}
      <div className="w-full lg:w-2/3">
        <AnimatedTestimonials testimonials={testimonials} autoplay={true} />
      </div>

      {/* CONTACT FORM - Stepper */}
      <div id="contact-form" className="w-full lg:w-1/3">
        <div className="sticky top-24 rounded-3xl bg-[#FFF7E6] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
          <h2 className="text-2xl font-bold mb-2 text-gray-900 tracking-tight">
            Let's Collaborate and Build
          </h2>
          <p className="text-sm text-gray-600 mb-5">
            Share your hiring needs. We'll get back within 24–48 hours.
          </p>
          <Stepper
            initialStep={1}
            onStepChange={(step) => setCurrentStep(step)}
            onFinalStepCompleted={submitNow}
            backButtonText="Previous"
            nextButtonText="Next"
            finalButtonText="Let's Talk"
            disableStepIndicators={true}
            nextButtonProps={{ disabled: isSubmitting || !canProceed }}
          >
            <Step>
              <h3 className="text-lg font-semibold text-gray-900">Company's Name</h3>
              <p className="text-sm text-gray-600">Tell us who we're talking to.</p>
              <input
                type="text"
                name="name"
                placeholder="Company's Name (min. 2 characters)"
                className="mt-4 w-full rounded-xl border border-[#F0E0B8] bg-[#FFF7E6] px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-[#E0B767]"
                value={formData.name}
                onChange={handleChange}
                required
                minLength={2}
              />
            </Step>
            <Step>
              <h3 className="text-lg font-semibold text-gray-900">Contact Number</h3>
              <p className="text-sm text-gray-600">So we can reach you quickly.</p>
              <input
                type="tel"
                name="company"
                inputMode="tel"
                pattern="^[0-9]{10,15}$"
                placeholder="Contact Number (min. 10 digits)"
                className="mt-4 w-full rounded-xl border border-[#F0E0B8] bg-[#FFF7E6] px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-[#E0B767]"
                value={formData.company}
                onChange={handleChange}
                required
                minLength={10}
              />
            </Step>
            <Step>
              <h3 className="text-lg font-semibold text-gray-900">Email Address</h3>
              <p className="text-sm text-gray-600">We'll share next steps here.</p>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                className="mt-4 w-full rounded-xl border border-[#F0E0B8] bg-[#FFF7E6] px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-[#E0B767]"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Step>
            <Step>
              <h3 className="text-lg font-semibold text-gray-900">Your recruitment needs</h3>
              <p className="text-sm text-gray-600">Roles + headcount</p>
              <textarea
                name="message"
                placeholder="Your recruitment needs (min. 10 characters)"
                rows={4}
                className="mt-4 w-full rounded-xl border border-[#F0E0B8] bg-[#FFF7E6] px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-[#E0B767] resize-none"
                value={formData.message}
                onChange={handleChange}
                required
                minLength={10}
              />
            </Step>
            <Step>
              <h3 className="text-lg font-semibold text-gray-900">Almost done</h3>
              <p className="text-sm text-gray-600">
                Click <span className="font-semibold">Let's Talk</span> to send. We'll respond in 24–48 hours.
              </p>
            </Step>
          </Stepper>

          {submitStatus.type && (
            <div className={`mt-3 p-3 rounded-md text-sm ${
              submitStatus.type === 'success'
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}>
              {submitStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
