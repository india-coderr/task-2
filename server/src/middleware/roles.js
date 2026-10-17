import { ForbiddenError } from '../utils/errors.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Access forbidden: requires one of [${allowedRoles.join(', ')}] role`)
      );
    }
    next();
  };
};
