import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import BannerImage1 from '../../assets/images/IndiaMapBlend.png'
import '../../index.css'
import { TypeWriter, ScribbledText } from "./TextStyle";
import r2 from '../../assets/images/r2.png'


// Load Lottie web component
if (typeof window !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.6.2/dist/dotlottie-wc.js';
  script.type = 'module';
  if (!document.head.querySelector('script[src*="dotlottie-wc"]')) {
    document.head.appendChild(script);
  }
}

const Banner = () => {
  const containerRef = useRef(null);
  const missionRef = useRef(null);
  const solutionsRef = useRef(null);
  const mapRef = useRef(null);
  const factsRef = useRef(null);

  // Function to animate counting numbers
  const startCounting = (elementId, start, end, duration, suffix = '') => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const increment = (end - start) / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        current = end;
        clearInterval(timer);
      }
      element.textContent = Math.floor(current) + suffix;
    }, 16);
  };

  useEffect(() => {
    const container = containerRef.current;
    const missionEl = missionRef.current;
    const solutionsEl = solutionsRef.current;
    const mapEl = mapRef.current;
    const factsEl = factsRef.current;

    // Set initial states - hide everything except main title initially
    gsap.set([solutionsEl], { opacity: 0, y: 30 });
    gsap.set([mapEl, factsEl], { opacity: 0, y: 30 });
    gsap.set(missionEl, { opacity: 1, y: 0 });

    // Entrance animation timeline
    const entranceTl = gsap.timeline();

    // Animate map first
    entranceTl.to(mapEl, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power2.out"
    });



    // Animate facts around the map
    entranceTl.to(factsEl, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out"
    }, "-=0.5");

    // Calculate when TypeWriter will complete:
    // delay: 2s + (5 chars × 0.2s charDelay) + (0.1s charDuration × 5) = 2 + 1 + 0.5 = 3.5s
    // const typewriterCompletionTime = 2.5; // small buffer

    // subtitle after TypeWriter completes


    // Animate solutions section
    entranceTl.to(solutionsEl, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out"
    }, "-=0.3");


    return () => {
      entranceTl.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-12"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">

        {/* India Map with Facts */}
        <div className="w-full h-full order-1">
          {/* India Map */}
          <div ref={mapRef} className="relative pt-10 lg:pt-0 mb-4 w-full h-full">
            <img className="absolute -left-[6%] w-[75%] lg:w-[85%]" style={{ transform: 'rotateX(20deg) rotateY(-5deg) rotateZ(5deg)' }} src={BannerImage1} />


            {/* India Facts */}
            <div ref={factsRef} className="absolute w-full h-full">
              <div className="relative w-full h-full">

                <p className="absolute right-[5%] top-[12%] text-sm font-semibold text-gray-600">70% Students lack Industry relevant Skills</p>
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-[18%] -top-[22%]" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 800"><g strokeWidth="2" stroke="hsl(0, 0%, 0%)" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 6" transform="rotate(273, 400, 400)"><path d="M350.5 350.5Q410.5 384.5 449.5 449.5 " markerEnd="url(#SvgjsMarker1820)"></path></g><defs><marker markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" viewBox="0 0 5 5" orient="auto" id="SvgjsMarker1820"><polygon points="0,5 1.6666666666666667,2.5 0,0 5,2.5" fill="hsl(0, 0%, 0%)"></polygon></marker></defs></svg>
                <p className="absolute right-[2%] top-[21%] w-1/2 text-sm font-semibold text-gray-600">40% Students forced to choose the wrong career path</p>
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-[25%] -top-[30%]" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 800"><g strokeWidth="2" stroke="hsl(0, 0%, 0%)" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 6" transform="rotate(284, 400, 400)"><path d="M350.5 350.5Q410.5 384.5 449.5 449.5 " markerEnd="url(#SvgjsMarker1829)"></path></g><defs><marker markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" viewBox="0 0 5 5" orient="auto" id="SvgjsMarker1829"><polygon points="0,5 1.6666666666666667,2.5 0,0 5,2.5" fill="hsl(0, 0%, 0%)"></polygon></marker></defs></svg>
                {/* <p className="absolute -left-[8%] top-[15%] w-1/4 text-sm font-semibold text-gray-600">70% Students lack Industry relevant Skills</p> */}
                <p className="absolute right-[4%] bottom-[15%] w-1/2 text-sm font-semibold text-gray-600">29% population in 20's but lack industry exposure</p>
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-[17%] top-[16%]" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 800"><g strokeWidth="2" stroke="hsl(0, 0%, 0%)" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 6" transform="rotate(351, 400, 400)"><path d="M350.5 350.5Q447.5 370.5 449.5 449.5 " markerEnd="url(#SvgjsMarker2041)"></path></g><defs><marker markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" viewBox="0 0 5 5" orient="auto" id="SvgjsMarker2041"><polygon points="0,5 1.6666666666666667,2.5 0,0 5,2.5" fill="hsl(0, 0%, 0%)"></polygon></marker></defs></svg>
                {/* <p className="absolute -left-[8%] bottom-[4%] w-1/4 text-sm font-semibold text-gray-600">40% Students forced to choose the wrong career path</p> */}
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-[36%] top-[48%]" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 800"><g strokeWidth="2" stroke="hsl(0, 0%, 0%)" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 6" transform="rotate(344, 400, 400)"><path d="M350.5 350.5Q362.5 419.5 449.5 449.5 " markerEnd="url(#SvgjsMarker2158)"></path></g><defs><marker markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" viewBox="0 0 5 5" orient="auto" id="SvgjsMarker2158"><polygon points="0,5 1.6666666666666667,2.5 0,0 5,2.5" fill="hsl(0, 0%, 0%)"></polygon></marker></defs></svg>
                <p className="absolute right-[12%] -bottom-[0%] w-1/2 text-sm font-semibold text-gray-600">70% Students lack Industry relevant Skills</p>
              </div>
            </div>
          </div>
        </div>


        {/* Right Section*/}
        <div className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-[25%] order-2 mt-8 w-full h-full">

          <div ref={missionRef} className="text-center lg:text-left relative">
            <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-bold text-gray-900 leading-tight">
              On a mission to change the
              <span className="text-blue-900"> Skilling landscape</span> of <span className="px-1 rounded-xs bg-gradient-to-t from-yellow-400 to-yellow-400 bg-no-repeat [background-size:100%_25%] [background-position:0_100%] transition-all duration-300 ease-in-out hover:[background-size:100%_100%] hover:[background-position:100%_100%]"> INDIA</span>
            </h1>

            <div className="absolute w-[70%] right-0 top-[80%] -z-10">
              <img src={r2} alt="" className="opacity-30 brightness-90 " />
            </div>

          </div>


          {/* Solutions */}
          <div ref={solutionsRef} className="space-y-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-600">With two-simple solutions:</h2>
            </div>


            <div className="flex lg:flex-row flex-col justify-between items-center gap-4 sm:gap-2 px-2">
              {/* Industry Relevant Skills */}
              <div className="relative rounded-md px-4 sm:px-10 py-1.5 shadow-md bg-white/80 hover:shadow-lg transition-all duration-300">
                <div>
                  <h3 className="text-sm text-gray-600 text-center sm:text-base lg:text-lg font-bold">Industry-Relevant <br /> <span className="text-xl text-black italic"> SKILLS</span></h3>
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute w-[90%] -top-[34%] -left-[21%]" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 800"><g strokeWidth="7" stroke="hsl(0, 0%, 0%)" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="matrix(0.9455185755993168,0.32556815445715664,-0.32556815445715664,0.9455185755993168,147.0198315431359,-108.43469202258939)"><path d="M347.5 347.5Q359.5 445.5 452.5 452.5 " markerEnd="url(#SvgjsMarker2436)"></path></g><defs><marker markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" viewBox="0 0 5 5" orient="auto" id="SvgjsMarker2436"><polygon points="0,5 1.6666666666666667,2.5 0,0 5,2.5" fill="hsl(0, 0%, 0%)"></polygon></marker></defs></svg>
                </div>
              </div>

              {/* Passion Aligned Opportunities */}
              <div className="relative rounded-md px-3 sm:px-10 py-1.5 shadow-md bg-white/90 hover:shadow-lg transition-all duration-300">
                <div>
                  <h3 className="text-sm text-center sm:text-base lg:text-lg font-bold text-gray-600">Passion-Aligned <br /><span className="text-xl text-black italic"> OPPORTUNITIES</span></h3>
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute w-[90%] -top-[35%] -right-[22%]" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 800"><g strokeWidth="7" stroke="hsl(0, 0%, 0%)" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="matrix(0.32556815445715676,0.9455185755993167,-0.9455185755993167,0.32556815445715676,658.980168456864,-108.43469202258939)"><path d="M347.5 347.5Q446.5 365.5 452.5 452.5 " markerEnd="url(#SvgjsMarker2056)"></path></g><defs><marker markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" viewBox="0 0 5 5" orient="auto" id="SvgjsMarker2056"><polygon points="0,5 1.6666666666666667,2.5 0,0 5,2.5" fill="hsl(0, 0%, 0%)"></polygon></marker></defs></svg>
                </div>
              </div>

            </div>

            {/* Call to Action */}
            <div className="flex flex-col sm:flex-row justify-around mt-2 sm:mt-4 lg:mt-6 text-center gap-4 sm:gap-0">
              <div className="flex items-center justify-center">
                <ScribbledText
                  text="We Shape Brilliance"
                  color="#1f2937"
                  lineColor="#3b82f6"
                  lineHeight="0.15rem"
                  lineOffset="0px"
                  duration={0.2}
                  delay={2}
                  stagger={0.1}
                  className="font-bold text-base sm:text-md font-caveat italic cursive"
                />
              </div>
              <div className="flex items-center justify-center">
                <ScribbledText
                  text="You Spot it"
                  color="#1f2937"
                  lineColor="#3b82f6"
                  lineHeight="0.15rem"
                  lineOffset="0px"
                  duration={0.5}
                  delay={2}
                  stagger={0.15}
                  className="font-bold text-base sm:text-md font-caveat italic"
                />
              </div>
            </div>
          </div>



        </div>
      </div>
    </div>
  );
};

export default Banner;