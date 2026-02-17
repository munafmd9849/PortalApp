import React, { useState, useEffect, useRef } from 'react';
import { FaChevronDown } from 'react-icons/fa';

const SelectDropdown = ({
  label,
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option',
  required = false
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

  const selectedOption = options.find((option) => option.id === value);
  const displayText = selectedOption ? selectedOption.name : placeholder;

  const handleSelect = (optionId) => {
    if (optionId === value) {
      setIsOpen(false);
      return;
    }

    onChange(optionId);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-700 font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-left flex items-center justify-between transition-all duration-200 ${
            selectedOption ? 'bg-white text-gray-800' : 'bg-gray-50 text-gray-500'
          } hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span className="truncate flex-1">{displayText}</span>
          <FaChevronDown
            className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && options.length > 0 && (
          <div className="absolute z-20 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors duration-150 text-left ${
                    isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-blue-50'
                  }`}
                  onClick={() => handleSelect(option.id)}
                >
                  <span>{option.name}</span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-semibold">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectDropdown;

