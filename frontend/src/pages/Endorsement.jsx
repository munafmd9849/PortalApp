import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api.js';
import { CheckCircle, XCircle, Loader2, PenTool, Eraser, RotateCcw } from 'lucide-react';

const EndorsementPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [endorsementData, setEndorsementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    teacherName: '',
    teacherMessage: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Load endorsement data
  useEffect(() => {
    const fetchEndorsement = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/endorsements/${token}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load endorsement request');
        }
        const data = await response.json();
        setEndorsementData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching endorsement:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchEndorsement();
    }
  }, [token]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 200;
    
    // Set canvas styling
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Canvas drawing handlers
  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.teacherName.trim()) {
      errors.teacherName = 'Your name is required';
    }

    // Check if canvas has any drawing (not just white background)
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let hasDrawing = false;
    
    // Check if there are any non-white pixels
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      // Check if pixel is not white (allowing some tolerance)
      if (r < 250 || g < 250 || b < 250) {
        hasDrawing = true;
        break;
      }
    }

    if (!hasDrawing) {
      errors.signature = 'Please provide your signature';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit endorsement
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Get signature as base64
      const canvas = canvasRef.current;
      const signatureData = canvas.toDataURL('image/png');

      const response = await fetch(`${API_BASE_URL}/endorsements/${token}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherName: formData.teacherName.trim(),
          teacherMessage: formData.teacherMessage.trim() || null,
          signatureData: signatureData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit endorsement');
      }

      setSuccess(true);
    } catch (err) {
      console.error('Error submitting endorsement:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading endorsement request...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !endorsementData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full border border-gray-200">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full border border-gray-200">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Endorsement Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for providing your endorsement. The student has been notified.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Endorsement Request</h1>
            <p className="text-orange-100 mt-1">
              {endorsementData?.studentName} has requested an endorsement from you
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Student Info */}
            {endorsementData && (
              <div className="bg-blue-50 rounded-xl p-6 mb-6 border border-blue-200">
                <h3 className="font-semibold text-gray-800 mb-3">Student Information</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>Name:</strong> {endorsementData.studentName}</p>
                  {endorsementData.studentEnrollmentId && (
                    <p><strong>Enrollment ID:</strong> {endorsementData.studentEnrollmentId}</p>
                  )}
                  {endorsementData.studentMessage && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs font-medium text-blue-800 mb-1">Message from student:</p>
                      <p className="italic text-gray-700">{endorsementData.studentMessage}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Teacher Name */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="teacherName"
                  value={formData.teacherName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className={`w-full px-4 py-3 border ${formErrors.teacherName ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200`}
                  required
                />
                {formErrors.teacherName && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.teacherName}</p>
                )}
              </div>

              {/* Teacher Message */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Endorsement Message
                </label>
                <textarea
                  name="teacherMessage"
                  value={formData.teacherMessage}
                  onChange={handleInputChange}
                  placeholder="Write your endorsement message here..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 resize-y"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Add a personalized message endorsing the student
                </p>
              </div>

              {/* Signature Canvas */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Your Signature <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      const touch = e.touches[0];
                      const mouseEvent = new MouseEvent('mousedown', {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                      });
                      canvasRef.current.dispatchEvent(mouseEvent);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      const touch = e.touches[0];
                      const mouseEvent = new MouseEvent('mousemove', {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                      });
                      canvasRef.current.dispatchEvent(mouseEvent);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      const mouseEvent = new MouseEvent('mouseup', {});
                      canvasRef.current.dispatchEvent(mouseEvent);
                    }}
                    className="w-full cursor-crosshair touch-none"
                    style={{ display: 'block', maxWidth: '100%' }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Use your mouse or touchscreen to sign above
                  </p>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Clear
                  </button>
                </div>
                {formErrors.signature && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.signature}</p>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start">
                    <XCircle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-red-800 font-medium mb-1">Submission Failed</h4>
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 ${
                    submitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Submit Endorsement
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndorsementPage;

