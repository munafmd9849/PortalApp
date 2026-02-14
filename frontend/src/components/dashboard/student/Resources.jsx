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
      
      // Handle DuckDuckGo fallback response format
      if (response.source === 'duckduckgo_fallback' || response.source === 'static_fallback') {
        // DuckDuckGo fallback response
        setGuidance({
          summary: response.guidance || '', // May have guidance text
          keyTopics: [],
          recommendedResources: [],
          practiceSuggestions: [],
          nextSteps: [],
          fallback: true,
          fallbackData: response, // Store full fallback response
        });
        // Show informational message, not error
        if (response.note) {
          setError(null); // Clear any errors
        }
      }
      // Handle rate limit error
      else if (response.success === false && response.errorType === 'RATE_LIMIT_EXCEEDED') {
        setError(response.message || 'Too many requests. Please wait 10 minutes before trying again.');
        setLoading(false);
        return; // Don't show guidance for rate limit
      }
      // Handle AI guidance content (from AI or cache)
      else if (response.guidance && typeof response.guidance === 'string') {
        setGuidance({
          summary: response.guidance, // Full plain text response
          keyTopics: [],
          recommendedResources: [],
          practiceSuggestions: [],
          nextSteps: [],
          fallback: response.fallback || false,
          cached: response.cached || false,
        });
      } else if (response.summary) {
        // Handle structured response format (backward compatibility)
        setGuidance(response);
      } else {
        // Fallback: treat entire response as guidance text
        setGuidance({
          summary: typeof response === 'string' ? response : JSON.stringify(response),
          keyTopics: [],
          recommendedResources: [],
          practiceSuggestions: [],
          nextSteps: [],
        });
      }
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
        
        // Check for leaked API key error (highest priority)
        if (errorText.includes('leaked') || errorText.includes('reported as leaked')) {
          errorMessage = '🔒 Your API key was reported as leaked by Google. Please generate a new API key in Google Cloud Console and update your .env file, then restart the server.';
        } else if (errorText.includes('SERVICE_DISABLED') || errorText.includes('has not been used') || errorText.includes('it is disabled') || errorText.includes('Enable it by visiting')) {
          errorMessage = '⚠️ Generative Language API is not enabled for your Google Cloud project. Please enable it at https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com and wait 1-2 minutes before retrying.';
        } else if (errorText.includes('authentication') || errorText.includes('API key') || err.status === 401 || err.status === 403) {
          errorMessage = errorData.error || errorData.message || 'AI service authentication failed. Please check your API key configuration in Google Cloud Console.';
        } else if (errorData.errorType === 'RATE_LIMIT_EXCEEDED') {
          // Rate limit from our backend
          errorMessage = errorData.message || 'Too many requests. Please wait 10 minutes before trying again.';
        } else if (errorText.includes('Rate limit') || errorText.includes('Rate limit exceeded') || errorText.includes('quota exceeded') || err.status === 429) {
          // Google AI quota/rate limit error (legacy format)
          if (errorData.error && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.message && errorData.message.includes('quota')) {
            errorMessage = errorData.message;
          } else {
            errorMessage = 'Google AI API quota or rate limit exceeded. Please wait a few minutes and try again.';
          }
        } else if (errorText.includes('quota') || errorText.includes('unavailable')) {
          errorMessage = errorData.message || errorData.error || 'AI service is temporarily unavailable. Please try again later.';
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
      
      // Only set error if we don't have fallback content
      if (errorMessage) {
        setError(errorMessage);
      }
      
      // Don't clear guidance if we have fallback content from error response
      if (!guidance) {
        setGuidance(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 min-w-0 overflow-x-hidden px-3 py-4 sm:p-4 md:p-6 pb-20 sm:pb-6">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5 md:space-y-8 min-w-0">
        <section className="bg-white rounded-xl md:rounded-3xl shadow-lg p-4 sm:p-6 md:p-8 border border-slate-100 min-w-0 overflow-hidden">
          <header className="mb-4 md:mb-6">
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-blue-600">
              Placement resources
            </p>
            <h1 className="text-lg sm:text-xl md:text-3xl font-bold text-slate-900 mt-1 md:mt-2 break-words">
              AI-Powered Placement Guidance
            </h1>
            <p className="text-slate-600 mt-1 md:mt-2 text-xs sm:text-sm md:text-base break-words">
              Get personalized, structured guidance for any placement topic. Powered by Google AI.
            </p>
          </header>

          <form onSubmit={handleGenerate} className="relative min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
              <FaMagic className="h-4 w-4 md:h-5 md:w-5 text-blue-400 flex-shrink-0" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., DSA interview prep?"
              className="w-full min-w-0 pl-9 sm:pl-10 md:pl-12 pr-[4.25rem] sm:pr-28 md:pr-32 py-3 md:py-4 text-base sm:text-sm md:text-base rounded-xl md:rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
              maxLength={500}
            />
            <button
              type="submit"
              className="absolute top-1.5 right-1.5 bottom-1.5 sm:top-2 sm:right-2 sm:bottom-2 px-3 sm:px-5 py-2 text-sm md:text-base rounded-lg md:rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:from-blue-700 hover:to-indigo-700 transition-all touch-manipulation min-h-[44px] sm:min-h-0"
              disabled={loading}
            >
              <span className="sm:hidden">{loading ? '…' : 'Go'}</span>
              <span className="hidden sm:inline">{loading ? 'Generating...' : 'Generate'}</span>
            </button>
          </form>
          
          {error && (
            <div className="mt-3 md:mt-4 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg md:rounded-xl min-w-0">
              <p className="text-xs md:text-sm text-red-700 break-words">{error}</p>
            </div>
          )}
          
          {!error && loading && (
            <div className="mt-3 md:mt-4 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg md:rounded-xl min-w-0">
              <p className="text-xs md:text-sm text-blue-700 font-medium">
                <span className="sm:hidden">Generating…</span>
                <span className="hidden sm:inline">Generating AI-powered guidance...</span>
              </p>
            </div>
          )}
        </section>

        {!hasSearched && (
          <div className="bg-white rounded-xl md:rounded-3xl border border-dashed border-slate-200 p-4 sm:p-6 md:p-10 text-center text-slate-500 min-w-0">
            <FaMagic className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto mb-2 sm:mb-3 md:mb-4 text-slate-300" />
            <p className="text-sm sm:text-base md:text-lg font-medium break-words">Ask any placement-related question</p>
            <p className="text-xs sm:text-sm mt-1 md:mt-2 text-slate-400 break-words px-1">
              Get structured guidance with key topics, resources, practice suggestions, and actionable next steps.
            </p>
          </div>
        )}

        {hasSearched && !loading && !error && guidance && (
          <div className="space-y-3 md:space-y-4 min-w-0">
            {/* DuckDuckGo Fallback Display */}
            {guidance.fallbackData && guidance.fallbackData.sections && (
              <section className="bg-white rounded-xl md:rounded-3xl shadow-lg border border-slate-100 overflow-hidden min-w-0">
                <div className="p-4 sm:p-5 md:p-6">
                  {/* Banner for fallback mode */}
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-xl min-w-0">
                    <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold uppercase tracking-wider break-words">
                      AI Unavailable – Verified Resources
                    </span>
                    {guidance.fallbackData.note && (
                      <p className="text-xs sm:text-sm text-orange-700 mt-2 break-words">{guidance.fallbackData.note}</p>
                    )}
                  </div>
                  
                  {guidance.fallbackData.title && (
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6 break-words">{guidance.fallbackData.title}</h3>
                  )}
                  
                  <div className="space-y-5 sm:space-y-6">
                    {guidance.fallbackData.sections.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="min-w-0">
                        <h4 className="text-base sm:text-lg font-semibold text-slate-800 mb-2 sm:mb-3 break-words">{section.heading}</h4>
                        <ul className="space-y-2">
                          {section.items.map((item, itemIndex) => (
                            <li key={itemIndex} className="flex items-start gap-2 min-w-0">
                              <span className="text-blue-600 mt-0.5 flex-shrink-0">{itemIndex + 1}.</span>
                              <div className="min-w-0 overflow-hidden">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium break-words"
                                >
                                  {item.title}
                                </a>
                                {item.url && (
                                  <p className="text-xs text-slate-500 mt-1 truncate" title={item.url}>{item.url}</p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  
                  {guidance.summary && (
                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-200 min-w-0">
                      <div className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                        {guidance.summary}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
            
            {/* AI Guidance - Plain Text Display (when not fallback) */}
            {guidance.summary && !guidance.fallbackData && (
              <section className="bg-white rounded-xl md:rounded-3xl shadow-lg border border-slate-100 overflow-hidden min-w-0">
                <div className="p-4 sm:p-5 md:p-6">
                  <div className="mb-4 flex items-center gap-2 flex-wrap">
                    {guidance.fallback && (
                      <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold uppercase tracking-wider">
                        Fallback Content
                      </span>
                    )}
                    {guidance.cached && (
                      <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold uppercase tracking-wider">
                        Cached
                      </span>
                    )}
                    {!guidance.fallback && !guidance.cached && (
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider">
                        AI Generated
                      </span>
                    )}
                  </div>
                  <div className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words min-w-0">
                    {guidance.summary}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
