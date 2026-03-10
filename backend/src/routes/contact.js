/**
 * Contact Form Routes
 * Public routes for contact form submissions
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import * as contactController from '../controllers/contact.js';

const router = express.Router();

/**
 * Handle validation errors
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * POST /api/contact
 * Submit contact form (public endpoint)
 */
router.post(
  '/',
  [
    body('companyName')
      .trim()
      .notEmpty()
      .withMessage('Company name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Company name must be between 2 and 100 characters'),
    body('contactNumber')
      .trim()
      .notEmpty()
      .withMessage('Contact number is required')
      .isLength({ min: 10, max: 20 })
      .withMessage('Contact number must be between 10 and 20 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ min: 10, max: 1000 })
      .withMessage('Message must be between 10 and 1000 characters'),
  ],
  handleValidation,
  contactController.submitContactForm
);

export default router;

