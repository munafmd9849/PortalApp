import React, { useState, useEffect } from 'react';
import { 
  FaQuestionCircle, FaFilePdf, FaUpload,
  FaFileAlt
} from 'react-icons/fa';
import api from '../../../services/api';

const HelpSupport = () => {
  const [mouDocuments, setMouDocuments] = useState([]);
  const [uploadingMou, setUploadingMou] = useState(false);
  const [faqs, setFaqs] = useState([
    {
      id: 1,
      question: 'How do I post a new job?',
      answer: 'Navigate to Job Postings section and click on "Post a New Job" button. Fill in all required details and submit for approval.'
    },
    {
      id: 2,
      question: 'How long does job approval take?',
      answer: 'Job approvals are typically processed within 24-48 hours by the admin team.'
    },
    {
      id: 3,
      question: 'Can I edit a job after posting?',
      answer: 'Yes, you can edit job details from the Job Postings section. Changes will require re-approval if significant modifications are made.'
    },
    {
      id: 4,
      question: 'How do I view student applications?',
      answer: 'Go to the Candidates section to view all applications for your posted jobs. You can filter and search through applications.'
    },
    {
      id: 5,
      question: 'What is the MOU document?',
      answer: 'MOU (Memorandum of Understanding) is a formal agreement between your company and the institution. Upload it for record keeping.'
    }
  ]);
  const [expandedFaq, setExpandedFaq] = useState(null);

  useEffect(() => {
    loadMouDocuments();
  }, []);

  const loadMouDocuments = async () => {
    try {
      const result = await api.getMouDocuments();
      setMouDocuments(result?.documents ?? []);
    } catch (error) {
      console.error('Error loading MOU documents:', error);
      setMouDocuments([]);
    }
  };

  const handleMouUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    try {
      setUploadingMou(true);
      const formData = new FormData();
      formData.append('mou', file);
      const result = await api.uploadMouDocument(formData);
      if (result?.document) {
        setMouDocuments((prev) => [result.document, ...prev]);
      }
    } catch (error) {
      console.error('Error uploading MOU:', error);
      alert(error?.message || 'Failed to upload MOU document. Please try again.');
    } finally {
      setUploadingMou(false);
      event.target.value = '';
    }
  };


  return (
    <div className="space-y-6">
      {/* MOU Documents */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaFilePdf className="text-red-600" />
            MOU Documents
          </h2>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            <FaUpload className="w-4 h-4" />
            {uploadingMou ? 'Uploading...' : 'Upload MOU'}
            <input
              type="file"
              accept=".pdf"
              onChange={handleMouUpload}
              disabled={uploadingMou}
              className="hidden"
            />
          </label>
        </div>

        <div className="space-y-4">
          {mouDocuments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No MOU documents uploaded yet</p>
          ) : (
            mouDocuments.map((doc) => (
              <div key={doc.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaFilePdf className="text-red-600 text-2xl" />
                  <div>
                    <p className="font-medium text-gray-900">{doc.fileName || 'MOU.pdf'}</p>
                    <p className="text-sm text-gray-500">
                      Uploaded on {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Preview
                  </a>
                  <a
                    href={doc.fileUrl}
                    download={doc.fileName || 'MOU.pdf'}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <FaQuestionCircle className="text-blue-600" />
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.id} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <span className={`transform transition-transform ${expandedFaq === faq.id ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {expandedFaq === faq.id && (
                <div className="p-4 pt-0 text-gray-700 border-t border-gray-200">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default HelpSupport;

