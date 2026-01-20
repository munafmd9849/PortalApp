// Sample-only API stub used by LoginModal/Notification.

function inMinutes(min) {
  return new Date(Date.now() + min * 60 * 1000).toISOString();
}

const api = {
  // OTP + auth flows (stubs)
  sendOTP: async (_email) => ({ otpStatus: 'PENDING_VERIFICATION', otpExpiresAt: inMinutes(5) }),
  verifyOTP: async (_email, _otp) => ({ verificationToken: 'sample-verification-token' }),

  resetPassword: async (_email) => ({ success: true, message: 'OTP sent', otpStatus: 'PENDING_VERIFICATION', otpExpiresAt: inMinutes(10) }),
  verifyResetOTP: async (_email, _otp) => ({ resetToken: 'sample-reset-token' }),
  updatePassword: async (_resetToken, _password) => ({ success: true }),

  // Notifications (not used directly here, but kept for compatibility)
  getNotifications: async () => [],
  markNotificationRead: async () => ({ success: true }),
};

export default api;
