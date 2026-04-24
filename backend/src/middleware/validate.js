import { body, validationResult, query, param } from 'express-validator';

// Process validation results
export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}

// Sanitize string - strip dangerous HTML/scripts
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// Input sanitization middleware
export function sanitizeInputs(req, res, next) {
  function sanitizeObj(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObj(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  if (req.body) req.body = sanitizeObj(req.body);
  if (req.query) req.query = sanitizeObj(req.query);
  next();
}

// Password strength validation
export const passwordStrengthRules = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|]/).withMessage('Password must contain at least one special character'),
];

// Login validation
export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

// Register validation
export const registerValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('name').notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  ...passwordStrengthRules,
  handleValidation,
];

// Ticket validation
export const ticketValidation = [
  body('subject').notEmpty().withMessage('Subject is required').isLength({ min: 3, max: 200 }),
  body('description').notEmpty().withMessage('Description is required').isLength({ min: 10, max: 5000 }),
  body('customerId').notEmpty().withMessage('Customer is required').isUUID(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  handleValidation,
];

// Pagination query validation
export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isString(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  handleValidation,
];
