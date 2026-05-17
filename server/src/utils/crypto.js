import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token.
 */
export const generateResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
};

/**
 * Hash a token for storage comparison.
 */
export const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');
