import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, Loader, Check } from 'lucide-react';
import { handleFileUpload } from '../../../utils/fileParser';

const PDFUploader = ({ onFileProcessed, onBack }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef(null);
  const dropRef = React.useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadError('');
    
    try {
      const result = await handleFileUpload(file, 'pdf');
      
      if (result.success) {
        onFileProcessed?.(result.data);
      } else {
        setUploadError(result.error || 'Failed to parse PDF file');
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      setUploadError('An error occurred while processing the PDF');
    } finally {
      setIsUploading(false);
    }
  }, [onFileProcessed]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      processFile(file);
    } else {
      setUploadError('Please upload a valid PDF file');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      processFile(file);
    } else {
      setUploadError('Please upload a valid PDF file');
    }
  };

  if (isUploading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-1">Processing PDF</h3>
        <p className="text-gray-500">Extracting job details from your PDF...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Upload Job Description (PDF)</h2>
      </div>
      
      <div 
        ref={dropRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-3 rounded-full bg-blue-100">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">PDF file (max 5MB)</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Select File
          </button>
        </div>
      </div>
      
      {uploadError && (
        <div className="mt-4 text-sm text-red-600">
          {uploadError}
        </div>
      )}
      
      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default PDFUploader;
