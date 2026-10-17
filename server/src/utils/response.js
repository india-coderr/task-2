/**
 * Standard API Response utilities ensuring uniform response structure across the application.
 */

export const apiSuccess = (res, data, statusCode = 200, meta = null) => {
  const payload = {
    success: true,
    data
  };

  if (meta !== null && meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

export const apiError = (res, message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = []) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: Array.isArray(details) ? details : [details]
    }
  });
};
