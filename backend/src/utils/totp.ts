import crypto from 'crypto';
import logger from './logger';

// Base32 Alphabet
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Decode Base32 to Buffer
function base32Decode(str: string): Buffer {
  const cleaned = str.toUpperCase().replace(/=+$/, '');
  const len = cleaned.length;
  const buffer = Buffer.alloc(Math.floor((len * 5) / 8));
  let bits = 0;
  let value = 0;
  let index = 0;

  for (let i = 0; i < len; i++) {
    const val = ALPHABET.indexOf(cleaned[i]);
    if (val === -1) throw new Error('Invalid Base32 character');
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      buffer[index++] = (value >> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return buffer;
}

// Generate base32 key
export function generateSecret(length = 16): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += ALPHABET[bytes[i] % 32];
  }
  return result;
}

// Generate TOTP code
export function generateTOTP(secret: string, timeStep = 30): string {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);

  const counterBuf = Buffer.alloc(8);
  // Write counter as 64-bit big-endian integer
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = tmp & 0xff;
    tmp = tmp >> 8;
  }

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuf);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0xf;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = code % 1000000;
  return otp.toString().padStart(6, '0');
}

// Verify TOTP code with window drift support
export function verifyTOTP(token: string, secret: string, window = 1, timeStep = 30): boolean {
  try {
    const key = base32Decode(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / timeStep);

    for (let i = -window; i <= window; i++) {
      const currentCounter = counter + i;
      const counterBuf = Buffer.alloc(8);
      let tmp = currentCounter;
      for (let j = 7; j >= 0; j--) {
        counterBuf[j] = tmp & 0xff;
        tmp = tmp >> 8;
      }

      const hmac = crypto.createHmac('sha1', key);
      hmac.update(counterBuf);
      const digest = hmac.digest();

      const offset = digest[digest.length - 1] & 0xf;
      const code =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);

      const otp = code % 1000000;
      if (otp.toString().padStart(6, '0') === token) {
        return true;
      }
    }
    return false;
  } catch (err) {
    logger.error({ err }, 'TOTP verification error');
    return false;
  }
}
