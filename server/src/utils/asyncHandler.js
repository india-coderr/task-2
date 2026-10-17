/**
 * Wrapper for Express async route handlers to catch uncaught exceptions and pass to next()
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
