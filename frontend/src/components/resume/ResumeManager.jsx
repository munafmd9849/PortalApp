import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download, 
  FilePlus,
  CheckCircle, 
  Loader,
  AlertCircle,
  FileX,
  Plus, 
  Minus,
  Sparkles,
  Check,
  X
} from 'lucide-react';
import { 
  validateResumeFile, 
  formatFileSize, 
  checkATSScore, 
  enhanceWithAI 
} from '../../utils/resumeUtils';

export default function ResumeManager({ onResumeUpdate, userId }) {
  const [resumeInfo, setResumeInfo] = useState({
    file: null,
    fileName: null,
    fileSize: null,
    uploadedAt: null,
    hasResume: false,
    fileType: null,
    atsScore: null,
    atsIssues: [],
    aiSuggestions: [],
    isEnhancing: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [scale, setScale] = useState(1);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfError, setPdfError] = useState(false);

  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Handle drag events
  useEffect(() => {
    const dropArea = dropRef.current;
    
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
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    };
    
    if (dropArea) {
      dropArea.addEventListener('dragover', handleDragOver);
      dropArea.addEventListener('dragleave', handleDragLeave);
      dropArea.addEventListener('drop', handleDrop);
    }
    
    return () => {
      if (dropArea) {
        dropArea.removeEventListener('dragover', handleDragOver);
        dropArea.removeEventListener('dragleave', handleDragLeave);
        dropArea.removeEventListener('drop', handleDrop);
      }
    };
  }, []);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file
    const validation = validateResumeFile(file);
    if (!validation.valid) {
      setError(validation.errors[0] || 'Invalid file');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccess('');
      setPdfError(false);

      // Create object URL for preview
      const fileUrl = URL.createObjectURL(file);
      
      // Check ATS score
      const atsResult = await checkATSScore(file);
      
      // Update state with the file info
      setResumeInfo(prev => ({
        ...prev,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        hasResume: true,
        atsScore: atsResult.score,
        atsIssues: atsResult.issues,
        aiSuggestions: []
      }));
      
      // Set the PDF URL for preview
      setPdfUrl(fileUrl);
      setSuccess('Resume uploaded successfully!');
      
      if (onResumeUpdate) {
        onResumeUpdate({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        });
      }
      
    } catch (err) {
      console.error('Error processing resume:', err);
      setError('Failed to process resume. Please try again.');
      setPdfError(true);
    } finally {
      setUploading(false);
    }
  };

  const loadResumeInfo = async () => {
    try {
      setIsLoading(true);
      setError('');
      setPdfError(false);
      
      // This would be replaced with actual resume info loading logic
      const info = {
        file: null,
        fileName: null,
        fileSize: null,
        fileType: null,
        uploadedAt: null,
        hasResume: false,
        atsScore: null,
        atsIssues: []
      };
      
      setResumeInfo(info);
      // If there's a URL, set it for preview
      if (info.url) {
        setPdfUrl(info.url);
      }
    } catch (error) {
      console.error('Error loading resume info:', error);
      setError('Failed to load resume information');
      setPdfError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteResume = () => {
    if (!window.confirm('Are you sure you want to remove your resume?')) {
      return;
    }

    setDeleting(true);
    setError('');
    
    // Clean up object URL
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    
    const emptyResumeInfo = {
      file: null,
      fileName: null,
      fileSize: null,
      uploadedAt: null,
      hasResume: false,
      fileType: null,
      atsScore: null,
      atsIssues: []
    };
    
    setResumeInfo(emptyResumeInfo);
    setPdfUrl('');
    setSuccess('Resume removed successfully');
    
    if (onResumeUpdate) {
      onResumeUpdate(emptyResumeInfo);
    }
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(''), 3000);
    setDeleting(false);
  };

  const handleDownload = () => {
    if (!resumeInfo.file) return;
    
    try {
      const url = URL.createObjectURL(resumeInfo.file);
      const link = document.createElement('a');
      link.href = url;
      link.download = resumeInfo.fileName || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      setError('Failed to download resume');
      console.error('Download error:', error);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    try {
      return new Date(date.toDate ? date.toDate() : date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  const handleEnhanceWithAI = async () => {
    if (!resumeInfo.file) return;
    
    try {
      setResumeInfo(prev => ({ ...prev, isEnhancing: true }));
      const result = await enhanceWithAI(resumeInfo.file);
      
      if (result.success) {
        setResumeInfo(prev => ({
          ...prev,
          aiSuggestions: result.suggestions || []
        }));
        setSuccess('AI enhancement completed!');
      }
    } catch (error) {
      console.error('AI enhancement failed:', error);
      setError('Failed to enhance resume with AI');
    } finally {
      setResumeInfo(prev => ({ ...prev, isEnhancing: false }));
    }
  };

  const applySuggestion = (suggestion) => {
    // In a real implementation, this would apply the AI suggestion to the resume
    setResumeInfo(prev => ({
      ...prev,
      aiSuggestions: prev.aiSuggestions.filter(s => s !== suggestion)
    }));
    setSuccess(`Applied suggestion: ${suggestion}`);
  };

  const renderUploadArea = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="space-y-4">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <Upload className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Upload your resume</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload a PDF of your resume to get started.
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-md">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-300 bg-gray-50'
              }`}
              ref={dropRef}
            >
              <div className="space-y-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-white">
                  <Upload className="h-6 w-6 text-gray-400" />
                </div>
                <div className="text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".pdf"
                      onChange={handleFileInput}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF up to 10MB</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FilePlus className="h-5 w-5 mr-2" />
                Select file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderResumePreview = () => {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Resume Preview</h3>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download
              </button>
              <button
                onClick={handleDeleteResume}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader className="animate-spin h-4 w-4 mr-1.5" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </>
                )}
              </button>
              <button
                onClick={handleEnhanceWithAI}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={resumeInfo.isEnhancing}
              >
                {resumeInfo.isEnhancing ? (
                  <>
                    <Loader className="animate-spin h-4 w-4 mr-1.5" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Enhance with AI
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span>{resumeInfo.fileName}</span>
            <span className="mx-2">•</span>
            <span>{formatFileSize(resumeInfo.fileSize)}</span>
            <span className="mx-2">•</span>
            <span>Uploaded {formatDate(resumeInfo.uploadedAt)}</span>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 flex flex-col items-center">
          <div className="w-full max-w-4xl bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
              <div className="text-sm text-gray-600">
                PDF Viewer
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
                  className="p-1 rounded text-gray-600 hover:bg-gray-200"
                  title="Zoom Out"
                  disabled={scale <= 0.5}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
                <button
                  onClick={() => setScale(prev => Math.min(2, prev + 0.1))}
                  className="p-1 rounded text-gray-600 hover:bg-gray-200"
                  title="Zoom In"
                  disabled={scale >= 2}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="w-full h-[70vh] overflow-auto flex items-center justify-center bg-gray-100 p-4">
              {pdfUrl && !pdfError ? (
                <div className="w-full h-full flex items-center justify-center">
                  <object
                    data={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                    type="application/pdf"
                    className="w-full h-full"
                    style={{
                      border: '1px solid #e5e7eb',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                      width: `${100 / scale}%`,
                      height: `${100 / scale}%`
                    }}
                    onError={() => {
                      console.error('Error loading PDF preview');
                      setPdfError(true);
                    }}
                  >
                    <div className="text-center p-6">
                      <p className="text-red-500">Unable to display PDF. You can <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">download it here</a>.</p>
                    </div>
                  </object>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
                  <FileX className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">No Resume Uploaded</h3>
                  <p className="text-gray-500 text-center mb-4">
                    {pdfError 
                      ? 'Failed to load the resume. Please try uploading again.' 
                      : 'Upload a PDF to preview your resume here.'}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {pdfError ? 'Retry Upload' : 'Upload Resume'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStatusMessages = () => (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Uploading...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderStatusMessages()}
      
      {resumeInfo.hasResume ? (
        renderResumePreview()
      ) : (
        renderUploadArea()
      )}
    </div>
  );
}