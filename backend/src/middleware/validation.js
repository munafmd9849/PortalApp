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
  // CGPA validation: must be between 0.00 and 10.00 with EXACTLY 2 decimal places
  body('cgpa')
    .optional()
    .customSanitizer((value) => {
      // Auto-format CGPA to 2 decimal places if it's a valid number
      if (value === null || value === undefined || value === '') {
        return null; // Optional field
      }
      
      const strValue = String(value).trim();
      if (strValue === '') {
        return null;
      }
      
      // Try to parse as number and format to 2 decimal places
      const numValue = parseFloat(strValue);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
        return numValue.toFixed(2);
      }
      
      // If already in correct format, return as-is
      const cgpaRegex = /^(10\.00|[0-9]\.[0-9]{2})$/;
      if (cgpaRegex.test(strValue)) {
        return strValue;
      }
      
      // Return original value if can't format (will be caught by validation)
      return strValue;
    })
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Optional field
      }
      
      // Convert to string to check decimal places
      const strValue = String(value).trim();
      // Check format: 0.00 to 10.00 with exactly 2 decimal places
      const cgpaRegex = /^(10\.00|[0-9]\.[0-9]{2})$/;
      
      if (!cgpaRegex.test(strValue)) {
        throw new Error('CGPA must be between 0.00 and 10.00 with exactly 2 decimal places (e.g., 9.00, 8.75)');
      }
      
      // Validate range without using parseFloat to avoid rounding errors
      const parts = strValue.split('.');
      const integerPart = parseInt(parts[0], 10);
      const decimalPart = parseInt(parts[1], 10);
      
      if (isNaN(integerPart) || isNaN(decimalPart)) {
        throw new Error('Invalid CGPA format');
      }
      
      if (integerPart > 10 || (integerPart === 10 && decimalPart > 0)) {
        throw new Error('CGPA must be between 0.00 and 10.00');
      }
      
      if (integerPart < 0) {
        throw new Error('CGPA must be between 0.00 and 10.00');
      }
      
      return true;
    })
    .withMessage('CGPA must be between 0.00 and 10.00 with exactly 2 decimal places'),
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
