import * as crypto from 'crypto';

/** 32-byte url-safe random string */
export const randomToken = () =>
  crypto.randomBytes(32).toString('base64url');
