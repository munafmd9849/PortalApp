import React, { useState, useEffect } from 'react';
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

export default function ResumeAnalyzer({ resumeInfo, userId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mock analysis function - in real implementation, this would call an AI service
  const analyzeResume = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock analysis results
      const mockAnalysis = {
        overallScore: 78,
        sections: {
          contact: { score: 95, status: 'excellent', feedback: 'Complete contact information provided' },
          summary: { score: 70, status: 'good', feedback: 'Professional summary could be more impactful' },
          experience: { score: 85, status: 'excellent', feedback: 'Strong work experience with quantified achievements' },
          education: { score: 90, status: 'excellent', feedback: 'Relevant education background clearly presented' },
          skills: { score: 65, status: 'needs_improvement', feedback: 'Skills section could be more comprehensive' },
          formatting: { score: 80, status: 'good', feedback: 'Clean formatting with minor improvements needed' }
        },
        strengths: [
          'Strong quantified achievements in work experience',
          'Clear and professional formatting',
          'Relevant educational background',
          'Complete contact information'
        ],
        improvements: [
          'Add more technical skills relevant to target roles',
          'Strengthen professional summary with specific value propositions',
          'Include more action verbs in experience descriptions',
          'Consider adding a projects or certifications section'
        ],
        keywords: {
          found: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
          missing: ['TypeScript', 'AWS', 'Docker', 'Kubernetes', 'MongoDB'],
          score: 60
        },
        atsCompatibility: 85,
        readabilityScore: 92
      };
      
      setAnalysis(mockAnalysis);
    } catch (err) {
      setError('Failed to analyze resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resumeInfo?.hasResume) {
      analyzeResume();
    }
  }, [resumeInfo]);

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
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{analysis.atsCompatibility}%</div>
            <div className="text-sm text-blue-700">ATS Compatible</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{analysis.readabilityScore}%</div>
            <div className="text-sm text-green-700">Readability</div>
          </div>
        </div>
      </div>

      {/* Section Scores */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Target className="h-5 w-5 text-purple-600 mr-2" />
          Section Analysis
        </h4>
        <div className="space-y-4">
          {Object.entries(analysis.sections).map(([section, data]) => (
            <div key={section} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                {getStatusIcon(data.status)}
                <div className="ml-3">
                  <div className="font-medium text-gray-900 capitalize">
                    {section.replace('_', ' ')}
                  </div>
                  <div className="text-sm text-gray-600">{data.feedback}</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBgColor(data.score)} ${getScoreColor(data.score)}`}>
                {data.score}%
              </div>
            </div>
          ))}
        </div>
      </div>

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

      {/* Keywords Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Star className="h-5 w-5 text-blue-600 mr-2" />
          Keywords Analysis
        </h4>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Keyword Match Score</span>
            <span className={`text-sm font-medium ${getScoreColor(analysis.keywords.score)}`}>
              {analysis.keywords.score}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${analysis.keywords.score >= 80 ? 'bg-green-500' : analysis.keywords.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${analysis.keywords.score}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-green-700 mb-2">Found Keywords</h5>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.found.map((keyword, index) => (
                <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h5 className="font-medium text-red-700 mb-2">Missing Keywords</h5>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.missing.map((keyword, index) => (
                <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
