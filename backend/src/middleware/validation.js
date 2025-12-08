/**
 * Request Validation Middleware
 * Replaces Firebase security rules validation
 * Uses express-validator for field-level validation
 */

import { body, param, query, validationResult } from 'express-validator';

/**
 * Handle validation errors
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: errors.array(),
    });
  }
  
  next();
}

/**
 * Student profile validation rules
 */
export const validateStudentProfile = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('enrollmentId').trim().notEmpty().withMessage('Enrollment ID is required'),
  body('school').isIn(['SOT', 'SOM', 'SOH']).withMessage('Valid school is required'),
  body('center').isIn(['BANGALORE', 'NOIDA', 'LUCKNOW', 'PUNE', 'PATNA', 'INDORE'])
    .withMessage('Valid center is required'),
  body('batch').matches(/^\d{2}-\d{2}$/).withMessage('Batch must be in format YY-YY (e.g., 25-29)'),
  body('cgpa').optional().isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
  handleValidationErrors,
];

/**
 * Job creation validation rules
 * Accepts both field name variants for flexibility:
 * - description OR responsibilities (both map to description)
 * - companyName OR company (both map to companyName)
 */
export const validateJob = [
  body('jobTitle').trim().notEmpty().withMessage('Job title is required'),
  // Accept either 'description' or 'responsibilities' field
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty if provided'),
  body('responsibilities')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Responsibilities cannot be empty if provided'),
  // Custom validation: ensure at least one of description or responsibilities is provided
  body().custom((value) => {
    const desc = value?.description;
    const resp = value?.responsibilities;
    const hasDescription = desc !== undefined && desc !== null && String(desc).trim().length > 0;
    const hasResponsibilities = resp !== undefined && resp !== null && String(resp).trim().length > 0;
    if (!hasDescription && !hasResponsibilities) {
      throw new Error('Either description or responsibilities is required');
    }
    return true;
  }).withMessage('Either description or responsibilities is required'),
  // Accept either 'companyName' or 'company' field
  body('companyName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Company name cannot be empty if provided'),
  body('company')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Company cannot be empty if provided'),
  // Custom validation: ensure at least one of companyName or company is provided
  body().custom((value) => {
    const compName = value?.companyName;
    const comp = value?.company;
    const hasCompanyName = compName !== undefined && compName !== null && String(compName).trim().length > 0;
    const hasCompany = comp !== undefined && comp !== null && String(comp).trim().length > 0;
    if (!hasCompanyName && !hasCompany) {
      throw new Error('Either companyName or company is required');
    }
    return true;
  }).withMessage('Either companyName or company is required'),
  body('requiredSkills').optional().isArray().withMessage('Required skills must be an array'),
  body('targetSchools').optional().isArray().withMessage('Target schools must be an array'),
  body('targetCenters').optional().isArray().withMessage('Target centers must be an array'),
  body('targetBatches').optional().isArray().withMessage('Target batches must be an array'),
  handleValidationErrors,
];

/**
 * Application validation rules
 */
export const validateApplication = [
  param('jobId').isUUID().withMessage('Invalid job ID'),
  handleValidationErrors,
];

/**
 * UUID parameter validation
 */
export const validateUUID = (paramName = 'id') => [
  param(paramName).isUUID().withMessage(`Invalid ${paramName}`),
  handleValidationErrors,
];
