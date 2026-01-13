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
  RefreshCw
} from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function ResumeAnalyzer({ resumeInfo, userId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Extract text from PDF URL (with backend fallback for CORS)
  const extractTextFromPDFUrl = async (pdfUrl) => {
    try {
      console.log('📄 Attempting to extract text from PDF:', pdfUrl);
      
      // Check if URL is valid
      if (!pdfUrl || typeof pdfUrl !== 'string') {
        throw new Error('Invalid PDF URL provided');
      }

      // Try fetching directly first
      let response;
      let useBackendProxy = false;
      
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
        console.warn('⚠️ Direct fetch failed, trying backend proxy:', fetchError.message);
        useBackendProxy = true;
      }

      // If direct fetch failed due to CORS or network, use backend proxy
      if (useBackendProxy || !response || !response.ok) {
        console.log('📄 Using backend proxy to extract PDF text (avoids CORS)');
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('Authentication required. Please log in again.');
        }

        const backendResponse = await fetch(`${API_BASE_URL}/students/resume/extract-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            resumeUrl: pdfUrl,
            resumeId: resumeInfo?.resumeId || null,
          }),
        });

        if (!backendResponse.ok) {
          const errorData = await backendResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || errorData.details || `Backend extraction failed (${backendResponse.status})`);
        }

        const backendData = await backendResponse.json();
        if (!backendData.success || !backendData.resumeText) {
          throw new Error(backendData.error || 'Failed to extract text from PDF');
        }

        console.log('📄 Text extracted via backend, length:', backendData.resumeText.length, 'characters');
        return backendData.resumeText;
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

  // Real analysis function using Gemini API
  const analyzeResume = async () => {
    if (!resumeInfo?.hasResume || !resumeInfo?.resumeUrl) {
      setError('Resume URL is required for analysis');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Extract text from PDF
      const resumeText = await extractTextFromPDFUrl(resumeInfo.resumeUrl);
      
      if (!resumeText || resumeText.trim().length === 0) {
        throw new Error('Could not extract text from PDF. The PDF might be image-based or corrupted.');
      }

      // Step 2: Call backend API for ATS analysis
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch(`${API_BASE_URL}/students/resume/ats-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeText: resumeText,
          resumeId: resumeInfo.resumeId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Analysis failed (${response.status})`);
      }

      const data = await response.json();
      
      if (!data.success || !data.analysis) {
        throw new Error('Invalid response from analysis service');
      }

      // Transform API response to match component's expected format
      const transformedAnalysis = {
        overallScore: data.analysis.atsScore,
        atsCompatibility: data.analysis.atsScore,
        readabilityScore: 0, // Not provided by API, can be calculated or removed
        strengths: data.analysis.strengths || [],
        improvements: data.analysis.improvementSuggestions || [],
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
      };
      
      setAnalysis(transformedAnalysis);
    } catch (err) {
      console.error('❌ Resume analysis error:', err);
      // Provide more helpful error messages
      let errorMessage = err.message || 'Failed to analyze resume. Please try again.';
      
      // Enhance error messages for common issues
      if (errorMessage.includes('CORS')) {
        errorMessage = 'CORS Error: The PDF cannot be accessed due to security restrictions. Please contact support or try uploading the resume again.';
      } else if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Network Error: Cannot connect to the server. Please check your internet connection and try again.';
      } else if (errorMessage.includes('image-based') || errorMessage.includes('No text could be extracted')) {
        errorMessage = 'Text Extraction Failed: The PDF appears to be image-based (scanned). Please use a PDF with selectable text, or try converting your scanned PDF to text using OCR tools.';
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

  if (!resumeInfo?.hasResume) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Resume to Analyze</h3>
        <p className="text-gray-500">Upload a resume to get detailed analysis and improvement suggestions.</p>
      </div>
    );
  }

  // Show button to start analysis if no analysis exists yet
  if (!analysis && !loading && !error) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Analyze</h3>
        <p className="text-gray-500 mb-6">Click the button below to analyze your resume for ATS compatibility.</p>
        <button
          onClick={analyzeResume}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <BarChart3 className="h-5 w-5 mr-2" />
          Analyze Resume
        </button>
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
          </h3>
          <button
            onClick={analyzeResume}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            title="Re-analyze"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
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
    </div>
  );
}
