import React, { useState, useEffect } from 'react';
import { MdBlock } from 'react-icons/md';
import { FaCheckCircle, FaBuilding, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import CustomDropdown from './CustomDropdown';

// Format Date for display in warning (date only)
const formatBlockDate = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const BlockModal = ({ 
  isOpen, 
  entity, 
  entityType = 'student', // 'student' | 'recruiter'
  isUnblocking = false, 
  canUnblockPermanent = false, // Only Super Admin can unblock permanently blocked students
  onClose, 
  onConfirm 
}) => {
  const [blockType, setBlockType] = useState(entityType === 'student' ? 'Permanent' : 'temporary');
  const [blockStartDate, setBlockStartDate] = useState(null);
  const [blockEndDate, setBlockEndDate] = useState(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [otherReason, setOtherReason] = useState('');

  // Student-specific reasons
  const studentReasons = [
    { value: '', label: 'Select a reason' },
    { value: 'Placed Already', label: 'Placed Already' },
    { value: 'Academic Reasons', label: 'Academic Reasons' },
    { value: 'Policy Violation', label: 'Policy Violation' },
    { value: 'Other', label: 'Other' }
  ];

  // Recruiter-specific reasons
  const recruiterReasons = [
    'Violation of terms and conditions',
    'Inappropriate job postings',
    'Spam or fraudulent activity',
    'Non-compliance with platform policies',
    'Reported by students',
    'Administrative review',
    'Other'
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setBlockType(entityType === 'student' ? 'Permanent' : 'temporary');
      setBlockStartDate(null);
      setBlockEndDate(null);
      setReason('');
      setNotes('');
      setOtherReason('');
    }
  }, [isOpen, entityType]);

  // Lock body scroll while modal is open (must be before early return - Rules of Hooks)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Check if student is permanently blocked (only Super Admin can unblock via canUnblockPermanent)
  const isPermanentlyBlocked = entityType === 'student' && entity?.blockInfo?.type === 'permanent';
  
  // Validation for student
  const isStudentUnblock = entityType === 'student' && isUnblocking;
  const hasValidReason = reason && reason.trim() !== '' && (reason !== 'Other' || (otherReason && otherReason.trim() !== ''));
  const hasValidTemporaryDates = blockStartDate && blockEndDate && blockEndDate >= blockStartDate;
  const isStudentConfirmEnabled = isStudentUnblock
    ? (canUnblockPermanent || !isPermanentlyBlocked) // Super Admin can unblock permanent; others cannot
    : (hasValidReason && // Reason is mandatory (and otherReason if reason is "Other")
        notes &&
        (blockType === 'Permanent' || (blockType === 'Temporary' && hasValidTemporaryDates)));

  // Validation for recruiter
  const isRecruiterConfirmEnabled = 
    isUnblocking || 
    (reason && (blockType === 'permanent' || (blockType === 'temporary' && hasValidTemporaryDates)));

  const isConfirmEnabled = entityType === 'student' ? isStudentConfirmEnabled : isRecruiterConfirmEnabled;

  const handleConfirm = () => {
    if (!isConfirmEnabled) return;

    if (entityType === 'student') {
      if (isUnblocking) {
        onConfirm({ isUnblocking: true });
      } else {
        const startDate = blockType === 'Temporary' && blockStartDate
          ? blockStartDate.toISOString().slice(0, 10)
          : null;
        const endDate = blockType === 'Temporary' && blockEndDate
          ? blockEndDate.toISOString().slice(0, 10)
          : null;
        const endTime = blockType === 'Temporary' ? '23:59' : null; // End of selected day
        onConfirm({
          blockType,
          startDate,
          endDate,
          endTime,
          reason: reason === 'Other' ? otherReason : reason,
          notes,
        });
      }
    } else {
      // Recruiter
      if (!isUnblocking) {
        if (blockType === 'temporary' && !hasValidTemporaryDates) {
          alert('Please select start date and end date for temporary block.');
          return;
        }
        if (!reason) {
          alert('Please select a reason for blocking.');
          return;
        }
      }

      const recruiterStartDate = !isUnblocking && blockType === 'temporary' && blockStartDate
        ? blockStartDate.toISOString().slice(0, 10)
        : null;
      const recruiterEndDate = !isUnblocking && blockType === 'temporary' && blockEndDate
        ? blockEndDate.toISOString().slice(0, 10)
        : null;
      const recruiterEndTime = !isUnblocking && blockType === 'temporary' ? '23:59' : null;
      onConfirm({
        recruiter: entity,
        isUnblocking,
        blockType: isUnblocking ? null : blockType,
        startDate: isUnblocking ? null : recruiterStartDate,
        endDate: isUnblocking ? null : recruiterEndDate,
        endTime: isUnblocking ? null : recruiterEndTime,
        reason: isUnblocking ? null : reason,
        notes: isUnblocking ? null : notes
      });
    }
    
    if (entityType === 'student') {
      onClose();
    }
  };

  if (!isOpen || !entity) return null;

  const isStudent = entityType === 'student';
  const isPermanent = (isStudent && blockType === 'Permanent') || (!isStudent && blockType === 'permanent');
  const isTemporary = (isStudent && blockType === 'Temporary') || (!isStudent && blockType === 'temporary');

  return (
    <div className={`fixed inset-0 ${isStudent ? 'bg-slate-900/50' : 'bg-black/50'} flex items-center justify-center z-50 p-4`}>
      <div className={`bg-white ${isStudent ? 'rounded-lg shadow-xl' : 'rounded-xl shadow-xl'} w-full ${isStudent ? 'max-w-2xl' : 'max-w-xl'} max-h-[90vh] overflow-y-auto overflow-x-hidden scrollbar-hide`}>
        <div className={`relative ${isStudent ? 'px-6 py-4 bg-slate-800 text-white border-b border-slate-700 sticky top-0 z-10' : `px-6 py-4 pr-12 border-b border-gray-200 ${isUnblocking ? 'bg-gray-50' : 'bg-gray-50'}`}`}>
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-4 right-4 p-1.5 rounded-md transition-colors ${isStudent ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-gray-100'}`}
            aria-label="Close"
          >
            <FaTimes className={`w-5 h-5 ${isStudent ? '' : 'text-gray-600'}`} />
          </button>
          <h2 className={`${isStudent ? 'text-lg font-semibold pr-8' : 'text-xl font-semibold text-gray-800'} flex items-center gap-2`}>
            {isUnblocking ? (
              isStudent ? 'Unblock student' : 'Unblock Recruiter'
            ) : (
              isStudent ? 'Block student' : 'Block Recruiter'
            )}
          </h2>
          {!isStudent && !isUnblocking && (
            <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
              <FaBuilding className="w-4 h-4" />
              <span className="font-medium">{entity.companyName} - {entity.recruiterName}</span>
            </p>
          )}
        </div>

        {/* Content */}
        <div className={`${isStudent ? 'p-6' : 'px-6 py-4'}`}>
          {isUnblocking && !isStudent ? (
            <div className="mb-4">
              <p className="text-gray-700">
                Are you sure you want to unblock <strong>{entity.recruiterName}</strong> from <strong>{entity.companyName}</strong>?
              </p>
              <p className="text-sm text-gray-600 mt-2">
                This will restore their access to post jobs and manage applications.
              </p>
            </div>
          ) : isStudentUnblock ? (
            <div className="mb-4">
              {isPermanentlyBlocked && !canUnblockPermanent ? (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <p className="text-amber-900 font-semibold">
                    This student is permanently blocked
                  </p>
                  <p className="text-sm text-amber-800 mt-1">
                    Only Super Admin can unblock. Contact a Super Admin if you need to restore access.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-md border border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm">{entity?.fullName}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                      {entity?.enrollmentId}
                    </span>
                    {isPermanentlyBlocked && canUnblockPermanent && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                        Permanent
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Restore access to apply for jobs and use the placement portal?
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {isStudent && (
                <>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    Are you sure you want to block this student?
                  </p>
                  <div className="mb-4 p-4 rounded-md border border-gray-200 bg-gray-50">
                    <p className="text-sm font-medium text-gray-900">{entity?.fullName}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Enrollment ID: <span className="font-medium">{entity?.enrollmentId}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Program: <span className="font-medium">{entity?.school}</span>
                    </p>
                  </div>
                </>
              )}

              {/* Block Type */}
              <div className="mb-5">
                <label className={`block ${isStudent ? 'text-sm sm:text-base' : 'text-lg'} font-medium text-gray-800 mb-2`}>
                  Block Type
                </label>
                {isStudent ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBlockType('Permanent')}
                      className={`text-left p-3 rounded-md border transition-colors ${
                        isPermanent
                          ? 'border-slate-700 bg-slate-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">Permanent block</p>
                      <p className="mt-1 text-xs text-gray-600">
                        Revokes all placement and application access permanently.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlockType('Temporary')}
                      className={`text-left p-3 rounded-md border transition-colors ${
                        isTemporary
                          ? 'border-slate-700 bg-slate-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">Temporary block</p>
                      <p className="mt-1 text-xs text-gray-600">
                        Blocks the student only until the selected date and time.
                      </p>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="blockType"
                        value="permanent"
                        checked={isPermanent}
                        onChange={(e) => setBlockType(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-gray-700">Permanent Block</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="blockType"
                        value="temporary"
                        checked={isTemporary}
                        onChange={(e) => setBlockType(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-blue-600">Temporary Block</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Start Date & End Date (only for temporary blocks) */}
              {isTemporary && (
                <div className={`mb-4 ${isStudent ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'grid grid-cols-2 gap-4'}`}>
                  <style>{`
                    .block-modal-datepicker .react-datepicker {
                      font-family: inherit;
                      border: 1px solid #e5e7eb;
                      border-radius: 0.5rem;
                      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    }
                    .block-modal-datepicker .react-datepicker__header {
                      background: linear-gradient(to right, #2563eb, #4f46e5);
                      border-bottom: none;
                      border-radius: 0.5rem 0.5rem 0 0;
                    }
                    .block-modal-datepicker .react-datepicker__current-month { color: white; font-weight: 600; font-size: 0.875rem; }
                    .block-modal-datepicker .react-datepicker__day-name { color: white; font-weight: 500; }
                    .block-modal-datepicker .react-datepicker__day--selected,
                    .block-modal-datepicker .react-datepicker__day--keyboard-selected {
                      background: linear-gradient(to right, #2563eb, #4f46e5);
                      border-radius: 0.375rem;
                    }
                    .block-modal-datepicker .react-datepicker__day:hover {
                      background-color: #dbeafe;
                      border-radius: 0.375rem;
                    }
                    .block-modal-datepicker .react-datepicker__day--today { font-weight: 600; color: #2563eb; }
                    .block-modal-datepicker .react-datepicker__navigation-icon::before { border-color: white; }
                    .block-modal-datepicker .react-datepicker__triangle { display: none; }
                  `}</style>
                  <div className="block-modal-datepicker">
                    <label className={`block ${isStudent ? 'text-sm sm:text-base' : ''} font-medium text-gray-700 ${isStudent ? 'mb-1' : 'mb-2'}`}>
                      Start Date
                    </label>
                    <DatePicker
                      selected={blockStartDate}
                      onChange={(date) => {
                        setBlockStartDate(date);
                        // Clear end date if it would be before the new start date
                        if (date && blockEndDate && blockEndDate < date) {
                          setBlockEndDate(null);
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Select start date"
                      minDate={new Date()}
                      maxDate={blockEndDate || undefined}
                      className={`w-full ${isStudent ? 'p-2.5' : 'px-3 py-2'} border border-gray-300 ${isStudent ? 'rounded-lg' : 'rounded-md'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer`}
                      wrapperClassName="w-full"
                    />
                  </div>
                  <div className="block-modal-datepicker">
                    <label className={`block ${isStudent ? 'text-sm sm:text-base' : ''} font-medium text-gray-700 ${isStudent ? 'mb-1' : 'mb-2'}`}>
                      End Date
                    </label>
                    <DatePicker
                      selected={blockEndDate}
                      onChange={(date) => setBlockEndDate(date)}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Select end date"
                      minDate={blockStartDate ? new Date(blockStartDate.getFullYear(), blockStartDate.getMonth(), blockStartDate.getDate()) : new Date()}
                      filterDate={(date) => {
                        if (!blockStartDate) return date >= new Date();
                        const start = new Date(blockStartDate.getFullYear(), blockStartDate.getMonth(), blockStartDate.getDate());
                        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                        return d >= start;
                      }}
                      className={`w-full ${isStudent ? 'p-2.5' : 'px-3 py-2'} border border-gray-300 ${isStudent ? 'rounded-lg' : 'rounded-md'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer ${blockEndDate && blockStartDate && blockEndDate < blockStartDate ? 'border-red-500' : ''}`}
                      wrapperClassName="w-full"
                    />
                  </div>
                  {blockEndDate && blockStartDate && blockEndDate < blockStartDate && (
                    <p className="col-span-full text-red-600 text-sm mt-1">End date must be on or after start date.</p>
                  )}
                </div>
              )}

              {/* Reason for Blocking */}
              <div className="mb-4">
                {isStudent ? (
                  <>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                      Reason for Blocking <span className="text-red-500">*</span>
                    </label>
                    <CustomDropdown
                      label="Reason for blocking"
                      compact
                      options={studentReasons}
                      value={reason}
                      onChange={(value) => setReason(value)}
                      placeholder="Select a reason"
                    />
                    {!reason && (
                      <p className="text-red-500 text-sm mt-1">Reason is required</p>
                    )}
                    {reason === 'Other' && (
                      <input
                        type="text"
                        value={otherReason}
                        onChange={(e) => setOtherReason(e.target.value)}
                        placeholder="Specify the reason"
                        className="w-full mt-2 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    )}
                  </>
                ) : (
                  <>
                    <label className="block text-gray-700 font-medium mb-2">Reason for Blocking</label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a reason</option>
                      {recruiterReasons.map((r, index) => (
                        <option key={index} value={r}>{r}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              {/* Administrative Notes */}
              <div className="mb-4">
                <label className={`block ${isStudent ? 'text-sm sm:text-base' : ''} font-medium text-gray-700 ${isStudent ? 'mb-1' : 'mb-2'}`}>
                  Administrative Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide specific details for the audit log"
                  className={`w-full ${isStudent ? 'p-2.5' : 'px-3 py-2'} border border-gray-300 ${isStudent ? 'rounded-lg' : 'rounded-md'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!isStudent ? 'resize-none' : ''}`}
                  rows={isStudent ? undefined : "3"}
                ></textarea>
              </div>

              {/* Warning */}
              {(() => {
                const formattedStart = formatBlockDate(blockStartDate);
                const formattedEnd = formatBlockDate(blockEndDate);
                const warningText = isPermanent
                  ? (isStudent
                    ? 'Blocking this student will permanently revoke their application privileges.'
                    : 'Blocking this recruiter will revoke their application privileges until unblocked.')
                  : (formattedStart && formattedEnd)
                    ? `Blocking this ${isStudent ? 'student' : 'recruiter'} will revoke their application privileges from ${formattedStart} until ${formattedEnd}.`
                    : `Blocking this ${isStudent ? 'student' : 'recruiter'} will revoke their application privileges until you set start date and end date.`;
                return (
                  <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 flex gap-3">
                    <FaExclamationTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Warning</p>
                      <p className="text-sm text-amber-800 mt-0.5">{warningText}</p>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`${isStudent ? 'px-6 py-4 border-t border-gray-200 bg-gray-50' : 'px-6 py-4 border-t border-gray-200 bg-gray-50'} flex justify-end gap-3`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || (isStudentUnblock && isPermanentlyBlocked && !canUnblockPermanent)}
            className={`px-5 py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isStudent
                ? isUnblocking
                  ? 'bg-blue-800 hover:bg-blue-900'
                  : 'bg-slate-800 hover:bg-slate-900'
                : isUnblocking
                  ? 'bg-blue-800 hover:bg-blue-900'
                  : 'bg-slate-800 hover:bg-slate-900'
            }`}
          >
            {isUnblocking ? 'Confirm unblock' : 'Confirm block'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockModal;











