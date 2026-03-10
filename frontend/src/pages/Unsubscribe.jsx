import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Mail, AlertCircle } from 'lucide-react';
import { unsubscribeUser, resubscribeUser } from '../services/emailNotifications';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, error, already_unsubscribed
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isResubscribing, setIsResubscribing] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');

    if (!emailParam || !tokenParam) {
      setStatus('error');
      setMessage('Invalid unsubscribe link. Missing email or token.');
      return;
    }

    setEmail(emailParam);
    setToken(tokenParam);

    // Automatically process unsubscribe
    handleUnsubscribe(emailParam, tokenParam);
  }, [searchParams]);

  const handleUnsubscribe = async (emailParam, tokenParam) => {
    try {
      setStatus('loading');
      const result = await unsubscribeUser(emailParam, tokenParam);
      
      if (result.success) {
        if (result.message.includes('already unsubscribed')) {
          setStatus('already_unsubscribed');
          setMessage('You were already unsubscribed from job notifications.');
        } else {
          setStatus('success');
          setMessage('You have been successfully unsubscribed from job notifications.');
        }
      } else {
        setStatus('error');
        setMessage(result.message || 'Failed to unsubscribe. Please try again.');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setStatus('error');
      setMessage('An error occurred while processing your request. Please try again later.');
    }
  };

  const handleResubscribe = async () => {
    try {
      setIsResubscribing(true);
      const result = await resubscribeUser(email);
      
      if (result.success) {
        setStatus('resubscribed');
        setMessage('You have been re-subscribed to job notifications.');
      } else {
        setMessage(result.message || 'Failed to re-subscribe. Please try again.');
      }
    } catch (error) {
      console.error('Error re-subscribing:', error);
      setMessage('An error occurred while processing your request. Please try again later.');
    } finally {
      setIsResubscribing(false);
    }
  };

  const renderStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />;
      case 'already_unsubscribed':
        return <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />;
      case 'resubscribed':
        return <Mail className="w-16 h-16 text-blue-500 mx-auto mb-4" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />;
      case 'loading':
      default:
        return (
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
          </div>
        );
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'already_unsubscribed':
        return 'border-yellow-200 bg-yellow-50';
      case 'resubscribed':
        return 'border-blue-200 bg-blue-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'loading':
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getHeadingColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-800';
      case 'already_unsubscribed':
        return 'text-yellow-800';
      case 'resubscribed':
        return 'text-blue-800';
      case 'error':
        return 'text-red-800';
      case 'loading':
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className={`bg-white rounded-lg shadow-lg border-2 ${getStatusColor()} p-8 text-center`}>
          {renderStatusIcon()}
          
          <h1 className={`text-2xl font-bold mb-4 ${getHeadingColor()}`}>
            {status === 'loading' && 'Processing Request...'}
            {status === 'success' && 'Unsubscribed Successfully'}
            {status === 'already_unsubscribed' && 'Already Unsubscribed'}
            {status === 'resubscribed' && 'Re-subscribed Successfully'}
            {status === 'error' && 'Unsubscribe Failed'}
          </h1>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            {status === 'loading' && 'Please wait while we process your unsubscribe request...'}
            {message}
          </p>

          {email && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {email}
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            {(status === 'success' || status === 'already_unsubscribed') && (
              <button
                onClick={handleResubscribe}
                disabled={isResubscribing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                {isResubscribing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Re-subscribing...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Re-subscribe to Job Notifications
                  </>
                )}
              </button>
            )}
            
            <Link
              to="/"
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 inline-block text-center"
            >
              Return to Homepage
            </Link>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">About Email Notifications</h3>
            <div className="text-sm text-gray-600 space-y-2 text-left">
              <p><strong>What you'll miss:</strong> New job posting alerts, application deadlines, and placement opportunities.</p>
              <p><strong>Frequency:</strong> We only send emails when new jobs are posted that match your profile.</p>
              <p><strong>Alternative:</strong> You can still view all jobs by logging into your student dashboard.</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact us at{' '}
            <a 
              href="mailto:placement@university.edu" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              placement@university.edu
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}