import React, { useState } from 'react';
import { FaSearch, FaChevronDown, FaChevronUp, FaMagic } from 'react-icons/fa';
import api from '../../../services/api';

export default function PlacementResources() {
  const [query, setQuery] = useState('');
  const [guidance, setGuidance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    keyTopics: true,
    recommendedResources: true,
    practiceSuggestions: true,
    nextSteps: true,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Please enter a topic or question.');
      return;
    }

    if (trimmed.length < 2) {
      setError('Query must be at least 2 characters long.');
      return;
    }

    if (trimmed.length > 500) {
      setError('Query is too long. Maximum 500 characters allowed.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setGuidance(null);

    try {
      console.log('Requesting placement guidance for:', trimmed);
      const response = await api.getPlacementGuidance(trimmed);
      console.log('Placement guidance response:', response);
      setGuidance(response);
    } catch (err) {
      console.error('AI guidance generation failed:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        status: err.status,
        isNetworkError: err.isNetworkError,
      });
      
      let errorMessage = 'Failed to generate guidance. Please try again later.';
      
      // Check for network errors first
      if (err.isNetworkError) {
        errorMessage = err.message || 'Cannot connect to server. Please check if the backend is running.';
      } 
      // Check for API response errors
      else if (err.response) {
        // API error structure: err.response.data contains the error object
        const errorData = err.response.data || err.response;
        const errorText = errorData.error || errorData.message || '';
        
        if (errorText.includes('Rate limit') || errorText.includes('Rate limit exceeded')) {
          errorMessage = errorData.message || 'You have exceeded the request limit. Please try again later.';
        } else if (errorText.includes('quota') || errorText.includes('unavailable')) {
          errorMessage = errorData.message || 'AI service is temporarily unavailable. Please try again later.';
        } else if (errorText.includes('timeout')) {
          errorMessage = errorData.message || 'Request timed out. Please try again.';
        } else if (errorText.includes('not available') || errorText.includes('not configured')) {
          errorMessage = errorData.message || 'AI service is not configured. Please contact support.';
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else {
          errorMessage = `Error: ${err.status || 'Unknown'} - ${errorText || err.message}`;
        }
      } 
      // Check for error message
      else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setGuidance(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <section className="bg-white rounded-3xl shadow-lg p-8 border border-slate-100">
          <header className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Placement resources
            </p>
            <h1 className="text-3xl font-bold text-slate-900 mt-2">
              AI-Powered Placement Guidance
            </h1>
            <p className="text-slate-600 mt-2">
              Get personalized, structured guidance for any placement topic. Powered by Google AI.
            </p>
          </header>

          <form onSubmit={handleGenerate} className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaMagic className="h-5 w-5 text-blue-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., How to prepare for DSA interviews?"
              className="w-full pl-12 pr-32 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
              maxLength={500}
            />
            <button
              type="submit"
              className="absolute inset-y-2 right-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:from-blue-700 hover:to-indigo-700 transition-all"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {!error && loading && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-700 font-medium">
                Generating AI-powered guidance...
              </p>
            </div>
          )}
        </section>

        {!hasSearched && (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
            <FaMagic className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">Ask any placement-related question</p>
            <p className="text-sm mt-2 text-slate-400">
              Get structured guidance with key topics, resources, practice suggestions, and actionable next steps.
            </p>
          </div>
        )}

        {hasSearched && !loading && !error && guidance && (
          <div className="space-y-4">
            {/* AI Summary Section */}
            {guidance.summary && (
              <section className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleSection('summary')}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider">
                      AI Summary
                    </span>
                    <p className="text-sm text-slate-500">Overview of the topic</p>
                  </div>
                  {expandedSections.summary ? (
                    <FaChevronUp className="text-slate-400" />
                  ) : (
                    <FaChevronDown className="text-slate-400" />
                  )}
                </button>
                {expandedSections.summary && (
                  <div className="px-6 pb-6">
                    <p className="text-slate-700 leading-relaxed">{guidance.summary}</p>
                  </div>
                )}
              </section>
            )}

            {/* Key Topics Section */}
            {guidance.keyTopics && guidance.keyTopics.length > 0 && (
              <section className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleSection('keyTopics')}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold uppercase tracking-wider">
                      Key Topics
                    </span>
                    <p className="text-sm text-slate-500">
                      {guidance.keyTopics.length} topic{guidance.keyTopics.length !== 1 ? 's' : ''} to prepare
                    </p>
                  </div>
                  {expandedSections.keyTopics ? (
                    <FaChevronUp className="text-slate-400" />
                  ) : (
                    <FaChevronDown className="text-slate-400" />
                  )}
                </button>
                {expandedSections.keyTopics && (
                  <div className="px-6 pb-6">
                    <ul className="space-y-2">
                      {guidance.keyTopics.map((topic, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-purple-600 mt-1">•</span>
                          <span className="text-slate-700">{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Recommended Resources Section */}
            {guidance.recommendedResources && guidance.recommendedResources.length > 0 && (
              <section className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleSection('recommendedResources')}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold uppercase tracking-wider">
                      Recommended Resources
                    </span>
                    <p className="text-sm text-slate-500">
                      {guidance.recommendedResources.length} resource{guidance.recommendedResources.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {expandedSections.recommendedResources ? (
                    <FaChevronUp className="text-slate-400" />
                  ) : (
                    <FaChevronDown className="text-slate-400" />
                  )}
                </button>
                {expandedSections.recommendedResources && (
                  <div className="px-6 pb-6">
                    <ul className="space-y-2">
                      {guidance.recommendedResources.map((resource, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-green-600 mt-1">•</span>
                          <span className="text-slate-700">{resource}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Practice Suggestions Section */}
            {guidance.practiceSuggestions && guidance.practiceSuggestions.length > 0 && (
              <section className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleSection('practiceSuggestions')}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-semibold uppercase tracking-wider">
                      Practice Suggestions
                    </span>
                    <p className="text-sm text-slate-500">
                      {guidance.practiceSuggestions.length} suggestion{guidance.practiceSuggestions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {expandedSections.practiceSuggestions ? (
                    <FaChevronUp className="text-slate-400" />
                  ) : (
                    <FaChevronDown className="text-slate-400" />
                  )}
                </button>
                {expandedSections.practiceSuggestions && (
                  <div className="px-6 pb-6">
                    <ul className="space-y-2">
                      {guidance.practiceSuggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-yellow-600 mt-1">•</span>
                          <span className="text-slate-700">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Next Steps Section */}
            {guidance.nextSteps && guidance.nextSteps.length > 0 && (
              <section className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleSection('nextSteps')}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
                      Next Steps
                    </span>
                    <p className="text-sm text-slate-500">
                      {guidance.nextSteps.length} actionable step{guidance.nextSteps.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {expandedSections.nextSteps ? (
                    <FaChevronUp className="text-slate-400" />
                  ) : (
                    <FaChevronDown className="text-slate-400" />
                  )}
                </button>
                {expandedSections.nextSteps && (
                  <div className="px-6 pb-6">
                    <ul className="space-y-2">
                      {guidance.nextSteps.map((step, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-indigo-600 mt-1">{index + 1}.</span>
                          <span className="text-slate-700">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Rate Limit Info */}
            {guidance.rateLimit && (
              <div className="text-center text-xs text-slate-400 mt-4">
                {guidance.rateLimit.remaining > 0 ? (
                  <p>You have {guidance.rateLimit.remaining} request{guidance.rateLimit.remaining !== 1 ? 's' : ''} remaining this hour.</p>
                ) : (
                  <p>Rate limit reached. Please try again later.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
