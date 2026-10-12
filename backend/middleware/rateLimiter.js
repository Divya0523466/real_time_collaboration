// Rate limiting disabled for simplified development flow
export const createRateLimiter = () => (req, res, next) => next();
export const verify2FARateLimiter = (req, res, next) => next();
export const resend2FARateLimiter = (req, res, next) => next();
export const setup2FARateLimiter = (req, res, next) => next();
