import React, { useState } from 'react';
import { 
  BarChart3, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  FileText, 
  Star,
  Target,
  Award,
  Lightbulb,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import { formatFileSize } from '../../utils/resumeUtils';

// Set up PDF.js worker - use worker from installed package (Vite-compatible)
// This ensures version match and avoids CDN fetch issues
// Using ?url suffix for Vite to properly handle the worker file as a URL
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function ResumeAnalyzer({ resumeInfo, userId, resumes = [], onResumeSelect, builderResumeText }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResumeSelector, setShowResumeSelector] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);

  // Extract text from PDF URL (use backend proxy as primary method)
  const extractTextFromPDFUrl = async (pdfUrl) => {
    try {
      console.log('📄 Attempting to extract text from PDF:', pdfUrl);
      
      // Check if URL is valid
      if (!pdfUrl || typeof pdfUrl !== 'string') {
        throw new Error('Invalid PDF URL provided');
      }

      // Use backend proxy as primary method (more reliable, avoids CORS and worker issues)
      console.log('📄 Using backend proxy to extract PDF text');
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      try {
        // Use API client for extract-text endpoint
        const backendData = await api.extractResumeText({
          resumeUrl: pdfUrl,
          resumeId: resumeInfo?.resumeId || null,
        });

        if (!backendData.success || !backendData.resumeText) {
          throw new Error(backendData.error || 'Failed to extract text from PDF');
        }

        console.log('📄 Text extracted via backend, length:', backendData.resumeText.length, 'characters');
        return backendData.resumeText;
      } catch (backendError) {
        console.warn('⚠️ Backend extraction failed, trying frontend fallback:', backendError.message);
        // Fall back to frontend PDF.js extraction if backend fails
      }

      // Frontend fallback: Try direct fetch and PDF.js extraction
      console.log('📄 Attempting frontend PDF extraction as fallback');
      let response;
      try {
        response = await fetch(pdfUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'application/pdf,application/octet-stream,*/*'
          }
        });
      } catch (fetchError) {
        throw new Error(`Failed to fetch PDF: ${fetchError.message}. Please try again or contact support.`);
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('PDF not found. The resume URL may be invalid or the file has been removed.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. The PDF may require authentication or the URL has expired.');
        }
        throw new Error(`Failed to load PDF: HTTP ${response.status} ${response.statusText}`);
      }

      // Check if response is actually a PDF
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('pdf') && !contentType.includes('octet-stream')) {
        console.warn('⚠️ Unexpected content type:', contentType);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('PDF file is empty or corrupted.');
      }

      console.log('📄 PDF loaded, size:', arrayBuffer.byteLength, 'bytes');
      
      // Load PDF document with error handling
      let pdf;
      try {
        pdf = await pdfjsLib.getDocument({ 
          data: arrayBuffer,
          verbosity: 0 // Suppress PDF.js warnings
        }).promise;
      } catch (pdfError) {
        console.error('❌ PDF.js error:', pdfError);
        if (pdfError.message.includes('Invalid PDF')) {
          throw new Error('Invalid PDF format. The file may be corrupted or not a valid PDF.');
        }
        throw new Error(`Failed to parse PDF: ${pdfError.message}`);
      }
      
      console.log('📄 PDF parsed successfully, pages:', pdf.numPages);
      
      // Extract text from all pages
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n';
        } catch (pageError) {
          console.warn(`⚠️ Error extracting text from page ${i}:`, pageError);
          // Continue with other pages
        }
      }
      
      const extractedText = fullText.trim();
      console.log('📄 Text extracted, length:', extractedText.length, 'characters');
      
      if (extractedText.length === 0) {
        throw new Error('No text could be extracted from the PDF. The PDF might be image-based (scanned) or contain only images. Please use a PDF with selectable text.');
      }
      
      return extractedText;
    } catch (err) {
      console.error('❌ Error extracting text from PDF:', err);
      // Re-throw with original message if it's already a user-friendly error
      if (err.message && !err.message.includes('Failed to extract text from PDF')) {
        throw err;
      }
      // Otherwise provide a generic error
      throw new Error('Failed to extract text from PDF. Please ensure the PDF is accessible and contains selectable text (not just images).');
    }
  };

  // Handle resume selection
  const handleResumeSelect = (resume) => {
    setSelectedResume(resume);
    setShowResumeSelector(false);
    // Clear previous analysis when selecting a new resume
    setAnalysis(null);
    setError(null);
  };

  // Handle "Analyze Another Resume" - show selector and clear current analysis
  const handleAnalyzeAnother = () => {
    setShowResumeSelector(true);
    setAnalysis(null);
    setError(null);
    setSelectedResume(null);
  };

  // Real analysis function using Gemini API
  const analyzeResume = async () => {
    const resumeToAnalyze = selectedResume || resumeInfo;
    const hasUploadedResume = !!(resumeToAnalyze?.fileUrl || resumeToAnalyze?.resumeUrl);
    const hasBuilderContent = !!(builderResumeText && String(builderResumeText).trim().length > 0);
    // Use builder text only when there is no uploaded resume to analyze (so each uploaded resume gets its own analysis)
    const useBuilderText = hasBuilderContent && !hasUploadedResume;

    if (!useBuilderText && !hasUploadedResume) {
      if (resumes && resumes.length > 1) {
        setShowResumeSelector(true);
        return;
      }
      setError('Resume URL is required for analysis');
      return;
    }

    const resumeId = resumeToAnalyze?.id || resumeToAnalyze?.resumeId;

    setLoading(true);
    setError(null);

    let resumeText;
    let usedFallbackBuilder = false;
    try {
      if (useBuilderText) {
        resumeText = String(builderResumeText).trim();
      } else {
        const resumeUrl = resumeToAnalyze.fileUrl || resumeToAnalyze.resumeUrl;
        try {
          resumeText = await extractTextFromPDFUrl(resumeUrl);
        } catch (pdfErr) {
          if (hasBuilderContent) {
            resumeText = String(builderResumeText).trim();
            usedFallbackBuilder = true;
          } else {
            throw pdfErr;
          }
        }
      }

      if (!resumeText || resumeText.trim().length === 0) {
        throw new Error(useBuilderText
          ? 'Your resume in the Builder has no content yet. Add details in Build Resume, then try again.'
          : 'Could not extract text from PDF. The PDF might be image-based or corrupted.');
      }

      // Step 2: Call backend API for ATS analysis
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      console.log('📊 [ATS Analysis] Source:', useBuilderText ? 'Builder content' : (usedFallbackBuilder ? 'Builder (PDF had no text)' : 'Uploaded PDF'), 'text length:', resumeText.length);

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      // Use API client for ATS analysis (timeout handled by API client)
      let data;
      try {
        data = await api.analyzeResumeATS({
          resumeText: resumeText,
          resumeId: resumeId || null,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('timeout')) {
          throw new Error('Analysis timed out. The server may be slow or unresponsive. Please try again.');
        }
        if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
          throw new Error('Cannot connect to server. Please ensure the backend server is running and try again.');
        }
        throw fetchError;
      }
      console.log('📊 [ATS Analysis] Analysis received:', {
        success: data.success,
        hasAnalysis: !!data.analysis,
        atsScore: data.analysis?.atsScore,
        improvementsCount: data.analysis?.improvementSuggestions?.length || 0,
        improvements: data.analysis?.improvementSuggestions
      });
      
      if (!data.success || !data.analysis) {
        throw new Error('Invalid response from analysis service');
      }

      // Transform API response to match component's expected format
      const transformedAnalysis = {
        overallScore: data.analysis.atsScore,
        atsCompatibility: data.analysis.atsScore,
        readabilityScore: 0, // Not provided by API, can be calculated or removed
        strengths: data.analysis.strengths || [],
        improvements: Array.isArray(data.analysis.improvementSuggestions) 
          ? data.analysis.improvementSuggestions 
          : (data.analysis.improvements || []),
        keywords: {
          found: [], // API doesn't provide found keywords separately
          missing: data.analysis.missingKeywords || [],
          score: data.analysis.atsScore, // Use ATS score as keyword score
        },
        missingSkills: data.analysis.missingSkills || [],
        grammarIssues: data.analysis.grammarIssues || [],
        formattingIssues: data.analysis.formattingIssues || [],
        clarityIssues: data.analysis.clarityIssues || [],
        overallFeedback: data.analysis.overallFeedback || '',
        isAI: data.isAI !== false, // Default to true, false only if explicitly set
        analyzedFromBuilderFallback: usedFallbackBuilder,
      };

      setAnalysis(transformedAnalysis);
    } catch (err) {
      console.error('❌ Resume analysis error:', err);
      console.error('❌ Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });

      // Provide more helpful error messages
      let errorMessage = err.message || 'Failed to analyze resume. Please try again.';
      // Enhance error messages for common issues
      if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
        errorMessage = 'Analysis timed out. The server may be slow or unresponsive. Please try again or check if the backend server is running.';
      } else if (errorMessage.includes('Cannot connect to server') || errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'Cannot connect to server. Please check your network connection and try again.';
      } else if (errorMessage.includes('CORS')) {
        errorMessage = 'CORS Error: The PDF cannot be accessed due to security restrictions. Please contact support or try uploading the resume again.';
      } else if (errorMessage.includes('Network error')) {
        errorMessage = 'Network Error: Cannot connect to the server. Please check your internet connection and try again.';
      } else if (errorMessage.includes('image-based') || errorMessage.includes('No text could be extracted')) {
        errorMessage = 'Text Extraction Failed: This PDF has no selectable text (e.g. it’s a scanned image or an old export). Resumes created in our Resume Builder are now exported as text-based PDFs—try downloading your resume again from the Builder (Download as PDF), then upload that file here. For other PDFs, use one with selectable text or convert scans with an OCR tool.';
      } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        errorMessage = 'PDF Not Found: The resume file may have been removed or the URL is invalid. Please upload your resume again.';
      } else if (errorMessage.includes('Access denied') || errorMessage.includes('403')) {
        errorMessage = 'Access Denied: The PDF URL may have expired or requires authentication. Please upload your resume again.';
      } else if (errorMessage.includes('Authentication required')) {
        errorMessage = 'Authentication Error: Please log in again and try analyzing your resume.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Removed auto-analysis - user must click button to analyze

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'good':
        return <TrendingUp className="h-4 w-4 text-yellow-600" />;
      case 'needs_improvement':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Check if we have any resumes or builder text to analyze
  const hasBuilderText = builderResumeText && String(builderResumeText).trim().length > 0;
  const hasAnyResume = resumeInfo?.hasResume || (resumes && resumes.length > 0) || hasBuilderText;
  const currentResume = selectedResume || (resumes && resumes.length > 0 ? resumes[0] : null) || resumeInfo;

  if (!hasAnyResume) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Resume to Analyze</h3>
        <p className="text-gray-500">Upload a resume to get detailed analysis and improvement suggestions.</p>
      </div>
    );
  }

  // Resume Selection Modal
  if (showResumeSelector && resumes && resumes.length > 1) {
    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <BarChart3 className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Resume to Analyze</h3>
          <p className="text-gray-500 mb-6">Choose which resume you want to analyze for ATS compatibility.</p>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {resumes.map((resume) => (
            <button
              key={resume.id}
              onClick={() => handleResumeSelect(resume)}
              className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                selectedResume?.id === resume.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {resume.fileName || resume.title || 'Resume'}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                      {resume.fileSize && (
                        <span>{formatFileSize(resume.fileSize)}</span>
                      )}
                      {resume.uploadedAt && (
                        <span>• Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</span>
                      )}
                      {resume.isDefault && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {selectedResume?.id === resume.id && (
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowResumeSelector(false)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {selectedResume && (
            <button
              onClick={() => {
                setShowResumeSelector(false);
                analyzeResume();
              }}
              className="flex-1 inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              Analyze Selected Resume
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show button to start analysis if no analysis exists yet
  if (!analysis && !loading && !error) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Analyze</h3>
        <p className="text-gray-500 mb-2">
          {resumes && resumes.length > 1
            ? `You have ${resumes.length} resumes. Select one to analyze for ATS compatibility.`
            : hasBuilderText
              ? 'Analyze your current resume from the Builder (no PDF upload needed).'
              : 'Click the button below to analyze your resume for ATS compatibility.'}
        </p>
        {resumes && resumes.length > 1 && currentResume && (
          <p className="text-sm text-gray-400 mb-4">
            Currently selected: <span className="font-medium">{currentResume.fileName || currentResume.title || 'Resume'}</span>
          </p>
        )}
        <div className="flex gap-3 justify-center">
          {resumes && resumes.length > 1 && (
            <button
              onClick={() => setShowResumeSelector(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-4 w-4 mr-2" />
              Select Resume
            </button>
          )}
          <button
            onClick={analyzeResume}
            disabled={!currentResume && !hasBuilderText}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            {selectedResume ? 'Analyze Selected Resume' : hasBuilderText ? 'Analyze Current Resume' : 'Analyze Resume'}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Analyzing your resume...</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Failed</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={analyzeResume}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
            Resume Analysis
            {selectedResume && (
              <span className="ml-3 text-sm font-normal text-gray-500">
                ({selectedResume.fileName || selectedResume.title || 'Selected Resume'})
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {resumes && resumes.length > 1 && (
              <button
                onClick={() => {
                  setShowResumeSelector(true);
                  setAnalysis(null);
                  setError(null);
                }}
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-2"
                title="Analyze different resume"
              >
                <FileText className="h-4 w-4" />
                Change Resume
              </button>
            )}
            <button
              onClick={analyzeResume}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              title="Re-analyze current resume"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBgColor(analysis.overallScore)} mb-3`}>
            <span className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
              {analysis.overallScore}
            </span>
          </div>
          <h4 className="text-xl font-semibold text-gray-900">Overall Score</h4>
          <p className="text-gray-600">
            {analysis.overallScore >= 80 ? 'Excellent resume!' : 
             analysis.overallScore >= 60 ? 'Good resume with room for improvement' : 
             'Needs significant improvements'}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{analysis.atsCompatibility}%</div>
            <div className="text-sm text-blue-700">ATS Compatibility Score</div>
          </div>
        </div>
      </div>

      {/* Analysis Type Indicator */}
      <div className={`border rounded-lg p-4 ${analysis.isAI ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start gap-3">
          {analysis.isAI ? (
            <>
              <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">AI-Powered Analysis</h4>
                <p className="text-sm text-blue-700">This analysis was generated using advanced AI technology for comprehensive resume evaluation.</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900 mb-1">Basic Analysis (AI Not Configured)</h4>
                <p className="text-sm text-amber-700 mb-2">
                  This is a basic analysis using simple keyword matching. For more detailed, AI-powered analysis with personalized suggestions, configure the AI service.
                </p>
                <p className="text-xs text-amber-600">
                  <strong>To enable AI analysis:</strong> Set <code className="bg-amber-100 px-1 rounded">GOOGLE_AI_API_KEY</code> or <code className="bg-amber-100 px-1 rounded">GEMINI_API_KEY</code> in your backend <code className="bg-amber-100 px-1 rounded">.env</code> file.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Overall Feedback */}
      {analysis.overallFeedback && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 text-blue-600 mr-2" />
            Overall Feedback
          </h4>
          <p className="text-gray-700 leading-relaxed">{analysis.overallFeedback}</p>
        </div>
      )}

      {/* Strengths */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Award className="h-5 w-5 text-green-600 mr-2" />
          Strengths
        </h4>
        <div className="space-y-2">
          {analysis.strengths.map((strength, index) => (
            <div key={index} className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{strength}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Improvements */}
      {analysis.improvements && analysis.improvements.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Lightbulb className="h-5 w-5 text-yellow-600 mr-2" />
            Suggested Improvements
          </h4>
          <div className="space-y-2">
            {analysis.improvements.map((improvement, index) => (
              <div key={index} className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{improvement}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Lightbulb className="h-5 w-5 text-yellow-600 mr-2" />
            Suggested Improvements
          </h4>
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-gray-600">No specific improvements needed. Your resume looks good!</p>
            <p className="text-sm text-gray-500 mt-2">Continue to refine your resume based on job requirements.</p>
          </div>
        </div>
      )}

      {/* Missing Keywords */}
      {analysis.keywords?.missing && analysis.keywords.missing.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Star className="h-5 w-5 text-orange-600 mr-2" />
            Missing Keywords
          </h4>
          <p className="text-sm text-gray-600 mb-3">Consider adding these keywords to improve ATS compatibility:</p>
          <div className="flex flex-wrap gap-2">
            {analysis.keywords.missing.map((keyword, index) => (
              <span key={index} className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing Skills */}
      {analysis.missingSkills && analysis.missingSkills.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="h-5 w-5 text-purple-600 mr-2" />
            Missing Skills
          </h4>
          <p className="text-sm text-gray-600 mb-3">These skills are commonly sought after:</p>
          <div className="flex flex-wrap gap-2">
            {analysis.missingSkills.map((skill, index) => (
              <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grammar Issues */}
      {analysis.grammarIssues && analysis.grammarIssues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            Grammar Issues
          </h4>
          <div className="space-y-2">
            {analysis.grammarIssues.map((issue, index) => (
              <div key={index} className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formatting Issues */}
      {analysis.formattingIssues && analysis.formattingIssues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 text-yellow-600 mr-2" />
            Formatting Issues
          </h4>
          <div className="space-y-2">
            {analysis.formattingIssues.map((issue, index) => (
              <div key={index} className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clarity Issues */}
      {analysis.clarityIssues && analysis.clarityIssues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
            Clarity Issues
          </h4>
          <div className="space-y-2">
            {analysis.clarityIssues.map((issue, index) => (
              <div key={index} className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyze Another Resume Button - Show at bottom if multiple resumes exist */}
      {resumes && resumes.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-1">Analyze Another Resume</h4>
              <p className="text-sm text-gray-600">You have {resumes.length} resumes. Select another one to analyze.</p>
            </div>
            <button
              onClick={handleAnalyzeAnother}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <FileText className="h-4 w-4 mr-2" />
              Select Another Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
