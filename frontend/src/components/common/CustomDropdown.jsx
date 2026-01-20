import React, { useState, useEffect, useRef } from 'react';
import { FaChevronDown } from 'react-icons/fa';

/**
 * CustomDropdown - A reusable dropdown component with icon support
 * 
 * @param {string} label - Label text for the dropdown
 * @param {Array} options - Array of options with {value, label} structure
 * @param {string} value - Currently selected value
 * @param {Function} onChange - Callback when selection changes
 * @param {string} placeholder - Placeholder text
 * @param {React.Component} icon - Icon component (from react-icons)
 * @param {string} iconColor - Tailwind color class for icon (e.g., "text-blue-600")
 */
const CustomDropdown = ({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder = "Select option",
  icon: Icon,
  iconColor = "text-blue-600"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
          {label}
        </label>
      )}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm text-left flex items-center justify-between transition-all duration-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none outline-none cursor-pointer"
          onClick={() => setIsOpen(prev => !prev)}
          onMouseEnter={(e) => e.currentTarget.style.outline = 'none'}
          onMouseLeave={(e) => e.currentTarget.style.outline = 'none'}
        >
          <span className="truncate flex-1 text-gray-900">
            {displayText}
          </span>
          <FaChevronDown className={`w-3 h-3 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute z-[9999] w-full bg-white border-2 border-gray-300 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
            {options.map((option) => {
              const isSelected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-b-0 text-left transition-all duration-200 ${
                    isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:text-blue-700'
                  }`}
                  onClick={() => handleOptionClick(option.value)}
                >
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomDropdown;

