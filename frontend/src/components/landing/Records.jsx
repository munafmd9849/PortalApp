import React, { useState, useEffect } from 'react';

const PlacementRecords = ({ onLoginOpen }) => {
  const [currentRow, setCurrentRow] = useState(0);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const [cardsToShow, setCardsToShow] = useState(4);
  const cardWidth = 224; 
  const cardGap = 24; 

  // dummy
  const studentRecords = [
    // Row 1
    [
  { name: "Priya Sharma", company: "Microsoft", role: "Software Engineer", package: "18 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/priya-sharma" },
      { name: "Rahul Kumar", company: "Google", role: "Data Scientist", package: "22 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/rahul-kumar" },
      { name: "Anjali Patel", company: "Amazon", role: "Product Manager", package: "20 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/anjali-patel" },
      { name: "Vikram Singh", company: "Tesla", role: "ML Engineer", package: "25 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/vikram-singh" },
      { name: "Meera Reddy", company: "Netflix", role: "Frontend Developer", package: "19 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/meera-reddy" },
      { name: "Arjun Mehta", company: "Adobe", role: "UX Designer", package: "16 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/arjun-mehta" },
      { name: "Zara Khan", company: "Intel", role: "Hardware Engineer", package: "17 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/zara-khan" }
    ],
    // Row 2
    [
      { name: "Aditya Verma", company: "IBM", role: "Cloud Architect", package: "21 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/aditya-verma" },
      { name: "Kavya Iyer", company: "Oracle", role: "Database Admin", package: "18 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/kavya-iyer" },
      { name: "Rohan Desai", company: "Salesforce", role: "Business Analyst", package: "16 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/rohan-desai" },
  { name: "Ishita Gupta", company: "Microsoft", role: "DevOps Engineer", package: "19 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/ishita-gupta" },
      { name: "Shaurya Malhotra", company: "Google", role: "Backend Developer", package: "23 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/shaurya-malhotra" },
      { name: "Aisha Rahman", company: "Amazon", role: "QA Engineer", package: "17 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/aisha-rahman" },
      { name: "Dhruv Joshi", company: "Tesla", role: "Robotics Engineer", package: "24 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/dhruv-joshi" }
    ],
    // Row 3
    [
      { name: "Neha Agarwal", company: "Netflix", role: "Content Strategist", package: "18 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/neha-agarwal" },
      { name: "Kartik Nair", company: "Adobe", role: "Creative Director", package: "20 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/kartik-nair" },
      { name: "Tanvi Kapoor", company: "Intel", role: "Research Scientist", package: "22 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/tanvi-kapoor" },
      { name: "Aryan Bhatt", company: "IBM", role: "AI Engineer", package: "25 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/aryan-bhatt" },
  { name: "Sanya Mehra", company: "Oracle", role: "Security Engineer", package: "19 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/sanya-mehra" },
      { name: "Vedant Rao", company: "Salesforce", role: "Solution Architect", package: "21 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/vedant-rao" },
      { name: "Mira Shah", company: "Microsoft", role: "Full Stack Developer", package: "20 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/mira-shah" }
    ]
  ];

  const batches = [
    { id: '2023-2027', name: '2023-2027', students: 156 },
    { id: '2024-2028', name: '2024-2028', students: 142 },
    { id: '2025-2029', name: '2025-2029', students: 98 }
  ];

  // Auto-rotate cards every 4 seconds
  useEffect(() => {
    if (!isRotating) return;
    
    const interval = setInterval(() => {
      setCurrentRow((prev) => (prev + 1) % studentRecords.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isRotating, studentRecords.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showBatchDropdown && !event.target.closest('.dropdown-container')) {
        setShowBatchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBatchDropdown]);

  // For lg and above, show all cards; for below lg, limit cards for horizontal scroll
  useEffect(() => {
    function handleResize() {
      const vw = window.innerWidth;
      if (vw >= 1024) {
        // lg and above: show all cards, they will fit with reduced width
        setCardsToShow(studentRecords[currentRow].length);
      } else {
        // Below lg: limit cards for horizontal scrolling
        if (vw < 640) {
          setCardsToShow(3);
        } else if (vw < 768) {
          setCardsToShow(4);
        } else {
          setCardsToShow(5);
        }
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentRow]);

  const handleShowAll = () => {
    setShowBatchDropdown(!showBatchDropdown);
  };

  const handleBatchSelect = () => {
    setShowBatchDropdown(false);
    onLoginOpen(); // Trigger the login modal
  };

  const currentCards = studentRecords[currentRow].slice(0, cardsToShow);

  return (
    <>
      <section className="py-15 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header with Show All button */}
          <div className="text-center mb-12 flex flex-col justify-center items-center lg:relative">
            <h2 className="text-4xl font-bold text-blue-900 mb-4 tracking-tight">
              Hear How They Cracked It
            </h2>
            <p className="text-xl text-gray-600 font-normal">
              Success stories from our placed students
            </p>
            
            {/* Show All button absolutely positioned */}
            <div className="lg:absolute lg:top-1/4 lg:right-0 dropdown-container mt-5 lg:mt-0">
              <button
                onClick={handleShowAll}
                className="bg-white text-blue-900 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-100 font-medium py-2 px-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2 text-sm"
              >
                <span>Show All</span>
                <svg className={`w-4 h-4 transition-transform duration-300 ${showBatchDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown */}
              {showBatchDropdown && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  {batches.map((batch) => (
                    <button
                      key={batch.id}
                      onClick={() => handleBatchSelect(batch.id)}
                      className="w-full px-4 py-3 text-left hover:bg-[#1565C0]/5 hover:border-l-4 hover:border-l-[#1565C0] transition-all duration-100 group"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-gray-800 group-hover:text-[#1565C0]">
                            Batch {batch.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {batch.students} students placed
                          </p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-[#1565C0] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rotating Cards Container */}
          <div className="relative">
            <div 
              className="
                flex gap-2 sm:gap-3 md:gap-4 lg:gap-4 
                transition-all duration-1000 ease-in-out
                overflow-x-auto lg:overflow-hidden
                lg:justify-center
                scrollbar-hide
                px-4 lg:px-0
              "
              onMouseEnter={() => setIsRotating(false)}
              onMouseLeave={() => setIsRotating(true)}
            >
              {currentCards.map((student, index) => (
                <StudentCard 
                  key={`${currentRow}-${index}`} 
                  student={student} 
                  index={index}
                />
              ))}
            </div>

            {/* Rotation Indicators */}
            <div className="flex justify-center mt-8 gap-2">
              {studentRecords.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentRow(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentRow === index 
                      ? 'bg-[#1565C0] scale-125' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Login Modal */}
      {/* Login Modal */}
    </>
  );
};

// Enhanced Student Card Component
const StudentCard = ({ student, index }) => {
  return (
    <div
      className="
        relative group bg-white rounded-lg shadow-md overflow-hidden 
        transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg border border-gray-100
        flex-shrink-0
        w-40 h-56
      "
      style={{
        animationDelay: `${index * 100}ms`,
        animation: 'slideInUp 0.6s ease-out forwards'
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1565C0]/5 to-[#1565C0]/10" />
      
      {/* Top Section with Profile */}
      <div className="relative pt-5 pb-1">
        <div className="flex justify-center">
          <div className="relative">
            <img
              src={student.profileImg}
              className="w-14 h-14 rounded-full border-2 border-[#1565C0] shadow-sm object-cover transition-colors"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#1565C0] rounded-full border border-white flex items-center justify-center">
              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Student Info */}
      <div className="px-3 pb-2">
        <h3 className="text-sm font-bold text-[#1565C0] text-center mb-2">
          {student.name}
        </h3>
        
        <div className="space-y-0.5">
          <div className="text-center">
            <p className="font-bold text-gray-800 text-sm">{student.company}</p>
          </div>
          
          <div className="text-center">
            <p className="font-medium text-gray-700 text-xs">{student.role}</p>
          </div>
          
          <div className="text-center">
            <p className="font-bold text-[#1565C0] text-sm">{student.package}</p>
          </div>
          
          <div className="text-center">
            <p className="font-medium text-gray-600 text-xs">{student.batch}</p>
          </div>

          <div className='flex justify-around mt-1 opacity-0 group-hover:opacity-100'>
            {/* LinkedIn Link */}
            <a 
              href={student.linkedin} 
              target="_blank" 
              rel="noopener noreferrer"
              className='relative bg-blue-200 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden group/linkedin'
              title="View LinkedIn Profile"
            >
              <div className="absolute inset-0 bg-blue-700 opacity-0 group-hover/linkedin:opacity-100 transition-opacity duration-300 rounded-full"></div>
              <svg className="relative z-10 w-4 h-4 text-blue-600 group-hover/linkedin:text-white transition-colors duration-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>

            {/* Email Link */}
            <a 
              href={`mailto:${student.name.toLowerCase().replace(' ', '.')}@${student.company.toLowerCase()}.com`}
              className='relative bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 overflow-hidden group/email'
              title="Send Email"
            >
              <div className="absolute inset-0 bg-gray-700 opacity-0 group-hover/email:opacity-100 transition-opacity duration-300 rounded-full"></div>
              <svg className="relative z-10 w-4 h-4 text-gray-600 group-hover/email:text-white transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlacementRecords;