import React, { useLayoutEffect, useRef, useState, Children } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  onNext,
  stepCircleContainerClassName = "max-w-md",
  stepContainerClassName = "",
  contentClassName = "",
  contentInnerClassName = "",
  footerClassName = "",
  footerInnerClassName = "",
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = "Back",
  nextButtonText = "Continue",
  finalButtonText = "Submit",
  disableStepIndicators = false,
  renderStepIndicator,
  ...rest
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const updateStep = (newStep) => {
    setCurrentStep(newStep);
    if (newStep > totalSteps) onFinalStepCompleted();
    else onStepChange(newStep);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      updateStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (!isLastStep) {
      setDirection(1);
      updateStep(currentStep + 1);
    }
  };

  const handleComplete = () => {
    setDirection(1);
    updateStep(totalSteps + 1);
  };

  const isNextDisabled = Boolean(nextButtonProps?.disabled);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center" {...rest}>
      <div
        className={`mx-auto w-full rounded-[32px] shadow-sm ${stepCircleContainerClassName}`}
        style={{ border: "1px solid #F0E0B8", backgroundColor: "#FFF7E6" }}
      >
        <div className={`${stepContainerClassName} flex w-full items-center p-6`}>
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;
            return (
              <React.Fragment key={stepNumber}>
                {renderStepIndicator ? (
                  renderStepIndicator({
                    step: stepNumber,
                    currentStep,
                    onStepClick: (clicked) => {
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    },
                  })
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    disableStepIndicators={disableStepIndicators}
                    currentStep={currentStep}
                    onClickStep={(clicked) => {
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    }}
                  />
                )}
                {isNotLastStep && <StepConnector isComplete={currentStep > stepNumber} />}
              </React.Fragment>
            );
          })}
        </div>

        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={currentStep}
          direction={direction}
          className={`space-y-2 px-6 ${contentClassName}`}
          innerClassName={contentInnerClassName}
        >
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>

        {!isCompleted && (
          <div className={`px-6 pb-6 ${footerClassName}`}>
            <div className={`mt-8 flex ${currentStep !== 1 ? "justify-between" : "justify-end"} ${footerInnerClassName}`}>
              {currentStep !== 1 && (
                <button
                  onClick={handleBack}
                  className={`rounded px-2 py-1 transition ${
                    currentStep === 1
                      ? "pointer-events-none opacity-50 text-[var(--pl-disabled)]"
                      : "text-[var(--pl-text-secondary)] hover:text-[var(--pl-text)]"
                  }`}
                  {...backButtonProps}
                  type="button"
                >
                  {backButtonText}
                </button>
              )}
              <button
                onClick={async () => {
                  if (isNextDisabled) return;
                  if (typeof onNext === "function") {
                    await onNext({
                      currentStep,
                      isLastStep,
                      next: handleNext,
                      complete: handleComplete,
                    });
                    return;
                  }
                  if (isLastStep) handleComplete();
                  else handleNext();
                }}
                className={`flex items-center justify-center rounded-full py-2 px-4 text-sm font-semibold tracking-tight transition ${
                  isNextDisabled
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#FFF7E6] text-black border border-[#F0E0B8] hover:bg-[#ffe3af] active:bg-[#f9d79b]"
                }`}
                {...nextButtonProps}
                type="button"
              >
                {isLastStep ? finalButtonText : nextButtonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepContentWrapper({ isCompleted, currentStep, direction, children, className, innerClassName }) {
  const [parentHeight, setParentHeight] = useState(0);

  return (
    <motion.div
      style={{ position: "relative", overflow: "hidden" }}
      animate={{ height: isCompleted ? 0 : parentHeight }}
      transition={{ type: "spring", duration: 0.4 }}
      className={className}
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted && (
          <SlideTransition key={currentStep} direction={direction} onHeightReady={(h) => setParentHeight(h)}>
            <div className={innerClassName}>{children}</div>
          </SlideTransition>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SlideTransition({ children, direction, onHeightReady }) {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    if (containerRef.current) onHeightReady(containerRef.current.offsetHeight);
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4 }}
      style={{ position: "absolute", left: 0, right: 0, top: 0 }}
    >
      {children}
    </motion.div>
  );
}

const stepVariants = {
  enter: (dir) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: (dir) => ({ x: dir >= 0 ? "50%" : "-50%", opacity: 0 }),
};

export function Step({ children }) {
  return <div className="px-6 pb-2">{children}</div>;
}

function StepIndicator({ step, currentStep, onClickStep, disableStepIndicators }) {
  const status = currentStep === step ? "active" : currentStep < step ? "inactive" : "complete";

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) onClickStep(step);
  };

  return (
    <motion.div
      onClick={handleClick}
      className={`relative outline-none focus:outline-none ${disableStepIndicators ? "cursor-default" : "cursor-pointer"}`}
      animate={status}
      initial={false}
    >
      <motion.div
        variants={{
          inactive: {
            scale: 1,
            backgroundColor: "#E8D4B8",
            color: "var(--pl-text)",
          },
          active: { scale: 1, backgroundColor: "#F3D7A4", color: "#000000" },
          complete: { scale: 1, backgroundColor: "#F3D7A4", color: "#000000" },
        }}
        transition={{ duration: 0.3 }}
        className="flex h-8 w-8 items-center justify-center rounded-full font-semibold"
      >
        {status === "complete" ? <CheckIcon className="h-4 w-4 text-black" /> : <span className="text-sm">{step}</span>}
      </motion.div>
    </motion.div>
  );
}

function StepConnector({ isComplete }) {
  const lineVariants = {
    incomplete: { width: 0, backgroundColor: "transparent" },
    complete: { width: "100%", backgroundColor: "#E0B767" },
  };

  return (
    <div className="relative mx-2 h-1 flex-1 overflow-hidden rounded-full bg-[#F3D7A4]">
      <motion.div
        className="absolute left-0 top-0 h-full"
        variants={lineVariants}
        initial={false}
        animate={isComplete ? "complete" : "incomplete"}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: "tween", ease: "easeOut", duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

