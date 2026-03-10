import React, { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import PDFUploader from './PDFUploader';
import ExcelUploader from './ExcelUploader';

const JDUploader = ({ onFileProcessed, onBack, onClose }) => {
  const [uploadType, setUploadType] = useState(null);

  const handleFileProcessed = (data) => {
    onFileProcessed?.(data);
  };

  const handleBack = () => {
    if (uploadType) {
      setUploadType(null);
    } else {
      onBack?.();
    }
  };

  if (uploadType === 'pdf') {
    return <PDFUploader onFileProcessed={handleFileProcessed} onBack={handleBack} />;
  }

  if (uploadType === 'excel') {
    return <ExcelUploader onFileProcessed={handleFileProcessed} onBack={handleBack} />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          {onBack && (
            <button 
              onClick={handleBack}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </button>
          )}
          <h2 className="text-xl font-semibold text-gray-800">Upload Job Description</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <p className="text-gray-600 mb-6 text-center">
        Choose how you'd like to upload the job description
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* PDF Upload Option */}
        <div 
          onClick={() => setUploadType('pdf')}
          className="border-2 border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
          <div className="flex flex-col items-center justify-center h-full">
            <div className="p-3 rounded-full bg-blue-100 mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload PDF</h3>
            <p className="text-sm text-gray-500">Upload a PDF job description to automatically extract details</p>
            <div className="mt-4 text-xs text-blue-600 font-medium">
              Upload PDF →
            </div>
          </div>
        </div>
        
        {/* Excel Upload Option */}
        <div 
          onClick={() => setUploadType('excel')}
          className="border-2 border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
        >
          <div className="flex flex-col items-center justify-center h-full">
            <div className="p-3 rounded-full bg-green-100 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Excel</h3>
            <p className="text-sm text-gray-500">Use our Excel template to fill in job details</p>
            <div className="mt-4 text-xs text-green-600 font-medium">
              Upload Excel →
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Need help? Download our <button onClick={() => setUploadType('excel')} className="font-medium text-blue-700 hover:text-blue-600 underline">Excel template</button> or <button onClick={() => setUploadType('pdf')} className="font-medium text-blue-700 hover:text-blue-600 underline">upload a PDF</button> of your job description.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JDUploader;
