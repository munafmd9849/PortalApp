import React, { useState, useEffect } from 'react';
import { MdBlock } from 'react-icons/md';
import { FaCheckCircle, FaBuilding, FaInfoCircle } from 'react-icons/fa';
import CustomDropdown from './CustomDropdown';

const BlockModal = ({ 
  isOpen, 
  entity, 
  entityType = 'student', // 'student' | 'recruiter'
  isUnblocking = false, 
  onClose, 
  onConfirm 
}) => {
  const [blockType, setBlockType] = useState(entityType === 'student' ? 'Permanent' : 'temporary');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
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
      setEndDate('');
      setEndTime('');
      setReason('');
      setNotes('');
      setOtherReason('');
    }
  }, [isOpen, entityType]);

  // Check if student is permanently blocked
  const isPermanentlyBlocked = entityType === 'student' && entity?.blockInfo?.type === 'permanent';
  
  // Validation for student
  const isStudentUnblock = entityType === 'student' && isUnblocking;
  const hasValidReason = reason && reason.trim() !== '' && (reason !== 'Other' || (otherReason && otherReason.trim() !== ''));
  const isStudentConfirmEnabled = isStudentUnblock
    ? !isPermanentlyBlocked // Cannot unblock if permanently blocked
    : (hasValidReason && // Reason is mandatory (and otherReason if reason is "Other")
        notes &&
        (blockType === 'Permanent' || (blockType === 'Temporary' && endDate && endTime)));

  // Validation for recruiter
  const isRecruiterConfirmEnabled = 
    isUnblocking || 
    (reason && (blockType === 'permanent' || (blockType === 'temporary' && endDate && endTime)));

  const isConfirmEnabled = entityType === 'student' ? isStudentConfirmEnabled : isRecruiterConfirmEnabled;

  const handleConfirm = () => {
    if (!isConfirmEnabled) return;

    if (entityType === 'student') {
      if (isUnblocking) {
        onConfirm({ isUnblocking: true });
      } else {
        onConfirm({
          blockType,
          endDate: blockType === 'Temporary' ? endDate : null,
          endTime: blockType === 'Temporary' ? endTime : null,
          reason: reason === 'Other' ? otherReason : reason,
          notes,
        });
      }
    } else {
      // Recruiter
      if (!isUnblocking) {
        if (blockType === 'temporary' && (!endDate || !endTime)) {
          alert('Please select end date and time for temporary block.');
          return;
        }
        if (!reason) {
          alert('Please select a reason for blocking.');
          return;
        }
      }

      onConfirm({
        recruiter: entity,
        isUnblocking,
        blockType: isUnblocking ? null : blockType,
        endDate: isUnblocking ? null : endDate,
        endTime: isUnblocking ? null : endTime,
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
    <div className={`fixed inset-0 ${isStudent ? 'bg-black/70 backdrop-blur-sm' : 'bg-black bg-opacity-50'} flex items-center justify-center z-50 p-4 ${isStudent ? 'animate-in fade-in duration-200' : ''}`}>
      <div className={`bg-white ${isStudent ? 'rounded-2xl shadow-2xl' : 'rounded-xl shadow-xl'} w-full max-w-2xl ${isStudent ? 'animate-in zoom-in-95 duration-300' : ''}`}>
        {/* Header */}
        <div className={`${isStudent ? 'bg-gradient-to-r from-red-600 to-rose-600 p-6' : `px-6 py-4 border-b border-gray-200 ${isUnblocking ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gradient-to-r from-red-50 to-rose-50'}`}`}>
          <h2 className={`${isStudent ? 'text-2xl font-bold text-white' : 'text-xl font-semibold text-gray-800'} flex items-center gap-2`}>
            {isUnblocking ? (
              <>
                <FaCheckCircle className={isStudent ? 'text-red-200' : 'w-5 h-5 text-green-600'} />
                {isStudent ? 'Unblock Student' : 'Unblock Recruiter'}
              </>
            ) : (
              <>
                <MdBlock className={isStudent ? 'text-red-200' : 'w-5 h-5 text-red-600'} />
                {isStudent ? 'Block Student' : 'Block Recruiter'}
              </>
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
        <div className={`${isStudent ? 'p-6 sm:p-8' : 'px-6 py-4'}`}>
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
              {isPermanentlyBlocked ? (
                <>
                  <p className="text-red-700 font-semibold">
                    This student is permanently blocked and cannot be unblocked.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Permanent blocks are irreversible. If you need to restore access, please contact a system administrator.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-700">
                    Are you sure you want to unblock <strong>{entity?.fullName}</strong> ({entity?.enrollmentId})?
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    This will restore their access to apply for jobs and use the placement portal.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {isStudent && (
                <>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    Are you sure you want to block the following student? This action is irreversible.
                  </p>
                  <div className="mb-4">
                    <p className="text-sm sm:text-base font-medium text-gray-700">Name: {entity?.fullName}</p>
                    <p className="text-sm sm:text-base font-medium text-gray-700">Enrollment ID: {entity?.enrollmentId}</p>
                    <p className="text-sm sm:text-base font-medium text-gray-700">Program: {entity?.school}</p>
                  </div>
                </>
              )}

              {/* Block Type */}
              <div className="mb-4">
                <label className={`block ${isStudent ? 'text-sm sm:text-base' : 'text-lg'} font-medium text-gray-700 ${!isStudent ? 'mb-3' : 'mb-1'}`}>
                  Block Type
                </label>
                <div className={isStudent ? 'flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4' : 'space-y-2'}>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="blockType"
                      value={isStudent ? 'Permanent' : 'permanent'}
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
                      value={isStudent ? 'Temporary' : 'temporary'}
                      checked={isTemporary}
                      onChange={(e) => setBlockType(e.target.value)}
                      className="mr-2"
                    />
                    <span className={isStudent ? 'text-gray-700' : 'text-blue-600'}>Temporary Block</span>
                  </label>
                </div>
              </div>

              {/* End Date and Time (only for temporary blocks) */}
              {isTemporary && (
                <div className={`mb-4 ${isStudent ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'grid grid-cols-2 gap-4'}`}>
                  <div>
                    <label className={`block ${isStudent ? 'text-sm sm:text-base' : ''} font-medium text-gray-700 ${isStudent ? 'mb-1' : 'mb-2'}`}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={`w-full ${isStudent ? 'p-2.5' : 'px-3 py-2'} border border-gray-300 ${isStudent ? 'rounded-lg' : 'rounded-md'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      min={!isStudent ? new Date().toISOString().split('T')[0] : undefined}
                    />
                  </div>
                  <div>
                    <label className={`block ${isStudent ? 'text-sm sm:text-base' : ''} font-medium text-gray-700 ${isStudent ? 'mb-1' : 'mb-2'}`}>
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={`w-full ${isStudent ? 'p-2.5' : 'px-3 py-2'} border border-gray-300 ${isStudent ? 'rounded-lg' : 'rounded-md'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>
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
                      label="Reason for Blocking"
                      icon={FaInfoCircle}
                      iconColor="text-red-600"
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
              <div className={`mb-4 ${isStudent ? 'text-sm sm:text-base text-red-600' : 'p-3 bg-red-50 border border-red-200 rounded-md'}`}>
                <p className={isStudent ? '' : 'text-red-600 text-sm'}>
                  <strong>Warning:</strong> {
                    isPermanent
                      ? (isStudent 
                        ? 'Blocking this student will permanently revoke their application privileges.'
                        : 'Blocking this recruiter will revoke their application privileges until unblocked.')
                      : `Blocking this ${isStudent ? 'student' : 'recruiter'} will revoke their application privileges until ${endDate} ${endTime}.`
                  }
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`${isStudent ? 'p-6 sm:p-8' : 'px-6 py-4 border-t border-gray-200 bg-gray-50'} flex ${isStudent ? 'flex-col sm:flex-row' : ''} justify-end ${isStudent ? 'space-y-2 sm:space-y-0 sm:space-x-4' : 'space-x-3'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 ${isStudent ? 'bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300' : 'px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || (isStudentUnblock && isPermanentlyBlocked)}
            className={`${isStudent 
              ? `px-4 py-2 rounded-lg text-white ${isConfirmEnabled && !(isStudentUnblock && isPermanentlyBlocked) ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'}`
              : `px-5 py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm hover:shadow-md ${
                isUnblocking 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white' 
                  : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white'
              }`
            }`}
          >
            {isUnblocking ? (
              <>
                <FaCheckCircle className={isStudent ? '' : 'w-4 h-4'} />
                <span>{isStudent ? 'Confirm Unblock' : 'Confirm Unblock'}</span>
              </>
            ) : (
              <>
                {!isStudent && <MdBlock className="w-4 h-4" />}
                <span>{isStudent ? 'Confirm Block' : 'Confirm Block'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockModal;











