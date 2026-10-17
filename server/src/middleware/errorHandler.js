import { AppError } from '../utils/errors.js';
import { apiError } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known AppError instances
  if (err instanceof AppError) {
    return apiError(res, err.message, err.statusCode, err.errorCode, err.details);
  }

  // Handle Mongoose / MongoDB Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    const message = `Duplicate value '${val}' for unique field '${field}'.`;
    return apiError(res, message, 409, 'DUPLICATE_KEY_ERROR', [{ field, value: val }]);
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message
    }));
    return apiError(res, 'Database validation error', 422, 'VALIDATION_ERROR', details);
  }

  // Handle Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    return apiError(
      res,
      `Invalid format for '${err.path}': ${err.value}`,
      400,
      'INVALID_IDENTIFIER',
      [{ path: err.path, value: err.value }]
    );
  }

  // JSON parse error
  if (err instanceof SyntaxError && 'body' in err) {
    return apiError(res, 'Malformed JSON payload', 400, 'BAD_REQUEST');
  }

  // Unhandled internal server error
  console.error('[SERVER ERROR]', err);
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected internal server error occurred.' 
    : err.message || 'Internal server error';

  return apiError(res, message, 500, 'INTERNAL_SERVER_ERROR');
};
