import React, { useState, useEffect } from 'react';
import { 
  FaQuestionCircle, FaFilePdf, FaUpload, FaEdit, FaSave, FaTimes,
  FaBuilding, FaEnvelope, FaPhone, FaMapMarkerAlt, FaFileAlt, FaTicketAlt
} from 'react-icons/fa';
import api from '../../../services/api';

const HelpSupport = () => {
  const [companyDetails, setCompanyDetails] = useState({
    companyName: '',
    registrationNumber: '',
    email: '',
    phone: '',
    address: '',
    website: ''
  });
  const [editingDetails, setEditingDetails] = useState(false);
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
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    description: ''
  });
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  useEffect(() => {
    loadCompanyDetails();
    loadMouDocuments();
  }, []);

  const loadCompanyDetails = async () => {
    try {
      // TODO: Replace with actual API call
      // const data = await api.getCompanyDetails();
      
      setCompanyDetails({
        companyName: '',
        registrationNumber: '',
        email: '',
        phone: '',
        address: '',
        website: ''
      });
    } catch (error) {
      console.error('Error loading company details:', error);
    }
  };

  const loadMouDocuments = async () => {
    try {
      // TODO: Replace with actual API call
      // const documents = await api.getMouDocuments();
      
      setMouDocuments([]);
    } catch (error) {
      console.error('Error loading MOU documents:', error);
    }
  };

  const handleSaveDetails = async () => {
    try {
      // TODO: Replace with actual API call
      // await api.updateCompanyDetails(companyDetails);
      alert('Saving company details is not available yet.');
    } catch (error) {
      console.error('Error saving company details:', error);
      alert('Failed to update company details. Please try again.');
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
      
      // TODO: Replace with actual API call
      // const formData = new FormData();
      // formData.append('mou', file);
      // const result = await api.uploadMouDocument(formData);
      alert('MOU upload is not available yet.');
    } catch (error) {
      console.error('Error uploading MOU:', error);
      alert('Failed to upload MOU document. Please try again.');
    } finally {
      setUploadingMou(false);
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    
    if (!ticketForm.subject || !ticketForm.category || !ticketForm.description) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setSubmittingTicket(true);
      
      // TODO: Replace with actual API call
      // await api.raiseSupportTicket(ticketForm);
      
      alert('Support ticket raised successfully! Ticket ID: #' + Date.now());
      setTicketForm({ subject: '', category: '', description: '' });
      setShowTicketForm(false);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      alert('Failed to raise support ticket. Please try again.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Company Registration Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaBuilding className="text-blue-600" />
            Company Registration Details
          </h2>
          {!editingDetails ? (
            <button
              onClick={() => setEditingDetails(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaEdit className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveDetails}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FaSave className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setEditingDetails(false);
                  loadCompanyDetails(); // Reload original data
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaTimes className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            {editingDetails ? (
              <input
                type="text"
                value={companyDetails.companyName}
                onChange={(e) => setCompanyDetails({ ...companyDetails, companyName: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{companyDetails.companyName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
            {editingDetails ? (
              <input
                type="text"
                value={companyDetails.registrationNumber}
                onChange={(e) => setCompanyDetails({ ...companyDetails, registrationNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{companyDetails.registrationNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FaEnvelope className="w-4 h-4" />
              Email
            </label>
            {editingDetails ? (
              <input
                type="email"
                value={companyDetails.email}
                onChange={(e) => setCompanyDetails({ ...companyDetails, email: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{companyDetails.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FaPhone className="w-4 h-4" />
              Phone
            </label>
            {editingDetails ? (
              <input
                type="tel"
                value={companyDetails.phone}
                onChange={(e) => setCompanyDetails({ ...companyDetails, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{companyDetails.phone}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FaMapMarkerAlt className="w-4 h-4" />
              Address
            </label>
            {editingDetails ? (
              <textarea
                value={companyDetails.address}
                onChange={(e) => setCompanyDetails({ ...companyDetails, address: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{companyDetails.address}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
            {editingDetails ? (
              <input
                type="url"
                value={companyDetails.website}
                onChange={(e) => setCompanyDetails({ ...companyDetails, website: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{companyDetails.website}</p>
            )}
          </div>
        </div>
      </div>

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
                    <p className="font-medium text-gray-900">{doc.name}</p>
                    <p className="text-sm text-gray-500">
                      Uploaded on {new Date(doc.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Preview
                  </a>
                  <a
                    href={doc.url}
                    download
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

      {/* Raise Ticket */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaTicketAlt className="text-orange-600" />
            Support Tickets
          </h2>
          <button
            onClick={() => setShowTicketForm(!showTicketForm)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <FaTicketAlt className="w-4 h-4" />
            Raise Ticket
          </button>
        </div>

        {showTicketForm && (
          <form onSubmit={handleSubmitTicket} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Select a category</option>
                  <option value="technical">Technical Issue</option>
                  <option value="billing">Billing</option>
                  <option value="job-posting">Job Posting</option>
                  <option value="account">Account</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  rows={5}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {submittingTicket ? 'Submitting...' : 'Submit Ticket'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTicketForm(false);
                    setTicketForm({ subject: '', category: '', description: '' });
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default HelpSupport;

