import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

// ScribbledText Component
export const ScribbledText = ({
  text = "Hello",
  fontSize = "3rem",
  color = "#333",
  fontWeight = "400",
  lineColor = "#333",
  lineHeight = "3px",
  lineOffset = "-5px",
  duration = 0.3,
  delay = 0,
  stagger = 0.1,
  className = "",
  children,
}) => {
  const containerRef = useRef(null);
  const charsRef = useRef([]);
  const [mounted, setMounted] = useState(false);
  
  // Use children prop if provided, otherwise use text prop
  const displayText = children || text;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    
    // Clear previous refs
    charsRef.current = [];
    
    // Split text into characters and create spans
    const textString = typeof displayText === 'string' ? displayText : displayText.toString();
    const charElements = textString.split('').map((char, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      if (!className.includes('text-')) {
        span.style.color = color;
      }
      if (!className.includes('font-bold') && !className.includes('font-semibold') && !className.includes('font-medium') && !className.includes('font-light')) {
        span.style.fontWeight = fontWeight;
      }
      span.textContent = char === ' ' ? '\u00A0' : char;
      charsRef.current[i] = span;
      return span;
    });

    // Clear container and add character spans
    containerRef.current.innerHTML = '';
    charElements.forEach(span => {
      containerRef.current.appendChild(span);
    });

    // Set initial state for animation
    gsap.set(charsRef.current, { opacity: 0, y: 20 });
    
    // Create animation timeline
    const tl = gsap.timeline({ delay });
    
    // Animate characters appearing
    tl.to(charsRef.current, {
      opacity: 1,
      y: 0,
      duration,
      stagger: {
        each: stagger,
        from: "start",
        ease: "power2.out"
      },
    });
    
    // Animate the underline effect for each character
    tl.to(charsRef.current, {
      duration: duration * 1.5,
      stagger: {
        each: stagger,
        from: "start",
        ease: "power2.out"
      },
      onStart: function() {
        // Add scribble line animation to each character
        charsRef.current.forEach((char, index) => {
          gsap.to(char, {
            "--line-scale": 1,
            duration: duration * 1.5,
            delay: index * stagger,
            ease: "power2.out"
          });
        });
      }
    }, "-=" + (duration * 0.5));

    return () => {
      tl.kill();
    };
  }, [displayText, duration, delay, stagger, color, lineColor, fontWeight, mounted]);

  const inlineStyles = {
    fontSize: className.includes('text-') ? undefined : fontSize,
    color: className.includes('text-') ? undefined : color,
    fontWeight: (className.includes('font-bold') || className.includes('font-semibold') || className.includes('font-medium') || className.includes('font-light') || className.includes('font-thin') || className.includes('font-normal')) ? undefined : fontWeight,
    '--line-color': lineColor,
    '--line-height': lineHeight,
    '--line-offset': lineOffset,
    '--line-scale': 0,
  };

  // Filter out undefined values
  const filteredStyles = Object.fromEntries(
    Object.entries(inlineStyles).filter(([_, value]) => value !== undefined)
  );

  if (!mounted) {
    return (
      <div 
        className={className}
        style={filteredStyles}
      >
        {displayText}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={className}
      style={filteredStyles}
    />
  );
};

// TypeWriter Component
export const TypeWriter = ({
  text = "Hello World",
  fontSize = "2rem",
  color = "#333",
  fontWeight = "400",
  className = "",
  delay = 0,
  charDelay = 0.08,
  charDuration = 0.03,
  cursor = true,
  cursorColor = "#333",
  onComplete = null,
}) => {
  const containerRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = "";

    // Create cursor element if enabled
    let cursorElement = null;
    if (cursor) {
      cursorElement = document.createElement('span');
      cursorElement.textContent = '|';
      if (!className.includes('text-')) {
        cursorElement.style.color = cursorColor;
      }
      if (!className.includes('font-bold') && !className.includes('font-semibold') && !className.includes('font-medium') && !className.includes('font-light') && !className.includes('font-thin') && !className.includes('font-normal')) {
        cursorElement.style.fontWeight = fontWeight;
      }
      cursorElement.style.opacity = '1';
      cursorElement.style.animation = 'blink 1s infinite';
      container.appendChild(cursorElement);
    }

    // Create spans for each character
    const chars = text.split("").map(char => {
      const span = document.createElement("span");
      span.textContent = char === " " ? "\u00A0" : char;
      span.style.opacity = "0";
      if (!className.includes('text-')) {
        span.style.color = color;
      }
      if (!className.includes('font-bold') && !className.includes('font-semibold') && !className.includes('font-medium') && !className.includes('font-light') && !className.includes('font-thin') && !className.includes('font-normal')) {
        span.style.fontWeight = fontWeight;
      }
      container.insertBefore(span, cursorElement);
      return span;
    });

    // Animate each character appearing
    const tl = gsap.timeline({ 
      delay,
      onComplete: () => {
        // Remove cursor after animation completes
        if (cursorElement) {
          gsap.to(cursorElement, {
            opacity: 0,
            duration: 0.5,
            delay: 0.5,
            onComplete: () => {
              if (cursorElement.parentNode) {
                cursorElement.parentNode.removeChild(cursorElement);
              }
            }
          });
        }
        // Call onComplete callback if provided
        if (onComplete) onComplete();
      }
    });

    chars.forEach((char, i) => {
      tl.to(char, { 
        opacity: 1, 
        duration: charDuration,
        ease: "none"
      }, i * charDelay);
    });

    return () => {
      tl.kill();
    };
  }, [text, fontSize, color, fontWeight, delay, charDelay, charDuration, cursor, cursorColor, mounted, onComplete]);

  const inlineStyles = {
    fontSize: className.includes('text-') ? undefined : fontSize,
    color: className.includes('text-') ? undefined : color,
    fontWeight: (className.includes('font-bold') || className.includes('font-semibold') || className.includes('font-medium') || className.includes('font-light') || className.includes('font-thin') || className.includes('font-normal')) ? undefined : fontWeight,
  };

  // Filter out undefined values
  const filteredStyles = Object.fromEntries(
    Object.entries(inlineStyles).filter(([_, value]) => value !== undefined)
  );

  if (!mounted) {
    return (
      <div 
        className={className}
        style={filteredStyles}
      >
        {text}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={className}
      style={filteredStyles}
    />
  );
};

// Main TextStyle component that can render either effect
const TextStyle = ({ 
  type = "normal", // "scribbled", "typewriter", or "normal"
  text = "Hello",
  ...props 
}) => {
  switch (type) {
    case "scribbled":
      return <ScribbledText text={text} {...props} />;
    case "typewriter":
      return <TypeWriter text={text} {...props} />;
    default:
      return (
        <span 
          className={props.className || ""}
          style={{ 
            fontSize: props.fontSize || "1rem",
            color: props.color || "#333",
            fontWeight: props.fontWeight || "400"
          }}
        >
          {text}
        </span>
      );
  }
};

export default TextStyle;
