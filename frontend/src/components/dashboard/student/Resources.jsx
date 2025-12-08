import React, { useState } from 'react';
import { FaSearch, FaExternalLinkAlt } from 'react-icons/fa';
import api from '../../../services/api';

export default function PlacementResources() {
  const [query, setQuery] = useState('');
  const [summary, setSummary] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const getHostname = (url = '') => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Please enter a topic to search.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setSummary('');
    setResults([]);

    try {
      // Step 1: Search DuckDuckGo
      const searchData = await api.searchWeb(trimmed);
      const searchResults = searchData.results || [];
      
      if (searchResults.length === 0) {
        setError('No results found. Try a different search query.');
        setLoading(false);
        return;
      }

      setResults(searchResults);

      // Step 2: Generate AI summary (if OpenAI is configured)
      try {
        const summaryData = await api.summarizeSearchResults(searchResults);
        setSummary(summaryData.summary || '');
      } catch (summaryError) {
        console.warn('Summary generation failed, continuing without summary:', summaryError);
        // Continue without summary - not a critical error
        setSummary('');
      }
    } catch (err) {
      console.error('Search failed:', err);
      
      // Provide more helpful error messages
      let errorMessage = 'Search failed. Try again later.';
      
      if (err.response?.details) {
        if (err.response.details.includes('temporarily unavailable')) {
          errorMessage = 'Search service is temporarily unavailable. Please try again in a moment.';
        } else {
          errorMessage = err.response.error || errorMessage;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setSummary('');
      setResults([]);
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
              Search smarter, prepare faster
            </h1>
            <p className="text-slate-600 mt-2">
              Get trusted resources from the web for any topic you&apos;re preparing.
            </p>
          </header>

          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-32 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
            />
            <button
              type="submit"
              className="absolute inset-y-2 right-2 px-5 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {!error && loading && (
            <p className="mt-2 text-sm text-blue-600 font-medium">Searching the web…</p>
          )}
        </section>

        {!hasSearched && (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
            <FaSearch className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">Search for any placement topic to get started.</p>
            <p className="text-sm mt-2 text-slate-400">
              You&apos;ll receive curated links and a summary to help you prepare.
            </p>
          </div>
        )}

        {hasSearched && !loading && !error && (
          <>
            <section className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider">
                  Summary
                </span>
                <p className="text-sm text-slate-500">Key insights from search results</p>
              </div>
              {summary ? (
                <article className="prose prose-sm text-slate-700 max-w-none whitespace-pre-line">
                  {summary}
                </article>
              ) : (
                <p className="text-slate-500">Summary unavailable. Review the links below.</p>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Top resources</h2>
              {results.length === 0 ? (
                <p className="text-slate-500 text-sm">No resources found for this query.</p>
              ) : (
                results.map((result, index) => (
                  <a
                    key={`${result.url}-${index}`}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                          {getHostname(result.url)}
                        </p>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {result.title || 'Untitled resource'}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                          {result.snippet || 'No description provided.'}
                        </p>
                      </div>
                      <FaExternalLinkAlt className="text-slate-400 mt-1" />
                    </div>
                  </a>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
