/**
 * Contact Form Service
 * Handles contact form submissions from landing page
 */

import api from './api.js';

/**
 * Submit contact form
 * @param {Object} formData - Contact form data
 * @param {string} formData.companyName - Company name
 * @param {string} formData.contactNumber - Contact number
 * @param {string} formData.email - Email address
 * @param {string} formData.message - Recruitment needs message
 * @returns {Promise<Object>} Response with success status and message
 */
export async function submitContactForm(formData) {
  try {
    // Map form fields to backend expected format
    const companyName = formData.companyName || formData.name || '';
    const contactNumber = formData.contactNumber || formData.company || '';
    const email = formData.email || '';
    const message = formData.message || '';

    // Client-side validation
    if (!companyName.trim()) {
      throw new Error('Company name is required');
    }
    if (companyName.trim().length < 2) {
      throw new Error('Company name must be at least 2 characters');
    }
    if (!contactNumber.trim()) {
      throw new Error('Contact number is required');
    }
    if (contactNumber.trim().length < 10) {
      throw new Error('Contact number must be at least 10 characters');
    }
    if (!email.trim()) {
      throw new Error('Email is required');
    }
    if (!email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    if (!message.trim()) {
      throw new Error('Message is required');
    }
    if (message.trim().length < 10) {
      throw new Error('Message must be at least 10 characters');
    }

    const payload = {
      companyName: companyName.trim(),
      contactNumber: contactNumber.trim(),
      email: email.trim(),
      message: message.trim(),
    };

    console.log('[Contact Service] Submitting contact form with payload:', payload);

    const response = await api.post('/contact', payload, { silent: true });
    const data = response.data || response;

    // Extract validation errors if available (API client should handle this, but check just in case)
    if (data.errors && Array.isArray(data.errors)) {
      const validationErrors = data.errors.map(e => `${e.param}: ${e.msg}`).join(', ');
      throw new Error(`Validation failed: ${validationErrors}`);
    }

    // Check for error in response
    if (data.error) {
      throw new Error(data.error || 'Failed to submit contact form');
    }

    return {
      success: true,
      message: data.message || 'Thank you for your inquiry! We will get back to you soon.',
    };
  } catch (error) {
    console.error('[Contact Service] Contact form submission error:', error);
    throw new Error(error.message || 'Failed to submit contact form. Please try again later.');
  }
}

