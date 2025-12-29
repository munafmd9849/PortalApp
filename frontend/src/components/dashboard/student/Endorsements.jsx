import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api.js';
import { Loader2 } from 'lucide-react';

const Endorsements = ({ isAdminView = false }) => {
  const { user } = useAuth();
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadEndorsements = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getStudentEndorsements();
        setEndorsements(response.endorsements || []);
      } catch (err) {
        console.error('Error loading endorsements:', err);
        setError('Failed to load endorsements');
        setEndorsements([]);
      } finally {
        setLoading(false);
      }
    };

    loadEndorsements();
  }, [user?.id]);

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  // Don't render if there's an error (fail silently)
  if (error) {
    return null;
  }

  // Only render if there are endorsements
  if (endorsements.length === 0) {
    return null;
  }

  return (
    <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-4 px-4 sm:px-6 transition-all duration-200 shadow-lg">
      <legend className="text-lg sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] text-transparent bg-clip-text">
        Endorsements
      </legend>

      <div className="space-y-6 py-4">
        {endorsements.map((endorsement) => (
          <div
            key={endorsement.id}
            className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Teacher Info */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {endorsement.teacherName || 'Teacher'}
              </h3>
              {endorsement.teacherEmail && (
                <p className="text-sm text-gray-500">{endorsement.teacherEmail}</p>
              )}
              {endorsement.completedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Completed on {new Date(endorsement.completedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>

            {/* Endorsement Text */}
            <div className="mb-6">
              <div className="min-h-[120px] p-4 bg-gray-50 rounded-lg border border-gray-200">
                {endorsement.teacherMessage ? (
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    {endorsement.teacherMessage}
                  </p>
                ) : (
                  <p className="text-gray-400 italic text-center py-8">
                    Teacher's endorsement text...
                  </p>
                )}
              </div>
            </div>

            {/* Signature */}
            {endorsement.signatureData && (
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                <div className="text-right">
                  <div className="mb-2">
                    <img
                      src={endorsement.signatureData}
                      alt="Teacher Signature"
                      className="max-w-[300px] max-h-[100px] object-contain"
                      style={{ filter: 'none' }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 italic" style={{ fontFamily: 'Georgia, serif' }}>
                    signature of teacher
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {endorsement.teacherName || 'Teacher'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </fieldset>
  );
};

export default Endorsements;

