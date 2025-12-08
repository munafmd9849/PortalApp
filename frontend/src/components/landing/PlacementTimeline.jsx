"use client";

import React, { useEffect, useRef, useState } from "react";
import { useScroll, useTransform, motion } from "motion/react";
import gsap from "gsap";
import BoldTextAnimation from "./gsap";

export default function TimelineWithSidebar() {
  const data = [
    {
      title: "Step 1",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-neutral-900">
            Profile Registration & Setup
          </h4>
          <p className="mb-8 text-base md:text-lg font-normal text-neutral-800">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              Create your account with academic credentials, personal information, and career preferences.
            </motion.span>
          </p>
        </div>
      ),
    },
    {
      title: "Step 2",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-neutral-900">
            Resume Upload & Documentation
          </h4>
          <p className="mb-4 text-base md:text-lg font-normal text-neutral-800">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              Upload your resume and supporting documents including academics , certificates, and project portfolios.
            </motion.span>
          </p>
        </div>
      ),
    },
    {
      title: "Step 3",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-neutral-900">
            Job Opportunity Discovery
          </h4>
          <p className="mb-8 text-base md:text-lg font-normal text-neutral-800">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              Browse and analyze available job descriptions posted by recruiters and companies.
            </motion.span>
          </p>
        </div>
      ),
    },
    {
      title: "Step 4",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-neutral-900">
            Application Submission Process
          </h4>
          <p className="mb-4 text-base md:text-lg font-normal text-neutral-800">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              Submit targeted applications for selected positions through the portal.
            </motion.span>
          </p>
          <div className="text-xs md:text-sm text-neutral-700"></div>
        </div>
      ),
    },
    {
      title: "Step 5",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-neutral-900">
            Application Status Tracking
          </h4>
          <p className="mb-8 text-base md:text-lg font-normal text-neutral-800">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              Monitor your application progress through the placement dashboard.
            </motion.span>
          </p>
        </div>
      ),
    },
    {
      title: "Step 6",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-neutral-900">
            Administrative Coordination & Notifications
          </h4>
          <p className="mb-4 text-base md:text-lg font-normal text-neutral-800">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              Receive automated notifications updates regarding interview schedules.
            </motion.span>
          </p>
        </div>
      ),
    },
    {
      title: "Step 7",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-neutral-900">
            Interview Process & Final Selection
          </h4>
          <p className="mb-4 text-base md:text-lg font-normal text-neutral-800">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              The interview rounds navigate through multiple selection stages while maintaining professional communication with recruiters.
            </motion.span>
          </p>
        </div>
      ),
    },
    {
      title: (
        <span>
          It's Time To Give Back To The '
          <span className="px-1 bg-gradient-to-t from-yellow-400 to-yellow-400 bg-no-repeat [background-size:100%_25%] [background-position:0_100%] transition-all duration-300 ease-in-out hover:[background-size:100%_100%] hover:[background-position:100%_100%]">SOCIETY</span>'
        </span>
      ),
    },
  ];

  const [showSecond, setShowSecond] = useState(false);
  const firstRef = useRef(null);
  const secondRef = useRef(null);

  // Animate first text out
  useEffect(() => {
    if (!showSecond && firstRef.current) {
      const chars = firstRef.current.textContent.split("");
      firstRef.current.innerHTML = chars
        .map((c, i) => <span data-idx="${i}">${c === " " ? "&nbsp;" : c}</span>)
        .join("");

      const spans = firstRef.current.querySelectorAll("span");
      gsap.to(spans, {
        duration: 0.8,
        x: () => gsap.utils.random(-80, 80),
        y: () => gsap.utils.random(-40, 40),
        rotation: () => gsap.utils.random(-70, 70),
        opacity: 0,
        ease: "power3.in",
        stagger: 0.04,
        delay: 1.7,
        onComplete: () => setShowSecond(true),
      });
    }
  }, [showSecond]);

  // Glare effect on second text
  useEffect(() => {
    if (showSecond && secondRef.current) {
      gsap.fromTo(
        secondRef.current,
        { backgroundPosition: "-200% 0" },
        {
          backgroundPosition: "200% 0",
          duration: 8,
          repeat: -1,
          ease: "linear",
        }
      );
    }
  }, [showSecond]);

  const ref = useRef(null);
  const containerRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div className="relative w-full overflow-clip bg-[#FFEEC3]">
      <div className="flex">
        {/* Timeline Section  */}
        <div className="relative w-full lg:w-[70%] font-inter md:px-10" ref={containerRef}>
          <div className="max-w-5xl mx-auto py-20 px-4 md:px-8 lg:px-10">
            <h2 className="text-lg font-semibold md:text-4xl mb-4 text-black max-w-4xl">
              <span style={{ fontFamily: "Inter, sans-serif" }}>Walk Through Of Placement Process</span>
            </h2>
            <p className="text-neutral-700 text-sm md:text-base max-w-lg">
              Navigate through the placement process from profile creation to final selection.
            </p>
          </div>

          <div ref={ref} className="relative max-w-5xl mx-auto pb-20" style={{ position: 'relative' }}>
            {data.map((item, index) =>
              index === 7 ? (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="w-full flex flex-col items-center justify-center pt-10 md:pt-30"
                  style={{ position: 'relative' }}
                >
                  <h3 className="text-2xl md:text-5xl font-bold text-gray-500 mb-4 text-center">
                    {item.title}
                  </h3>
                  <div className="w-full flex justify-center text-gray-500">{item.content}</div>
                </motion.div>
              ) : (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className={`flex justify-start ${index === 0 ? "pt-4 md:pt-6" : "pt-10 md:pt-30"} md:gap-10`}
                  style={{ position: 'relative' }}
                >
                  <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
                    <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-white  flex items-center justify-center">
                      <div className="h-4 w-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 border-neutral-300 p-2" />
                    </div>
                    <h3 className="hidden md:block text-xl md:pl-20 md:text-5xl font-bold text-neutral-500 ">
                      {item.title}
                    </h3>
                  </div>

                  <div className="relative pl-20 pr-4 md:pl-4 w-full">
                    <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-neutral-500">
                      {item.title}
                    </h3>
                    {item.content}
                  </div>
                </motion.div>
              )
            )}

            {/* timeline animation */}
            <div
              style={{ height: `${height}px` }}
              className="absolute left-8 md:left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-blue-800 via-white to-transparent [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
            >
              <motion.div
                style={{
                  height: heightTransform,
                  opacity: opacityTransform,
                }}
                className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-blue-800 via-white to-transparent from-[0%] via-[10%] rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Sidebar*/}
        <BoldTextAnimation />
      </div>
    </div>
  );
}