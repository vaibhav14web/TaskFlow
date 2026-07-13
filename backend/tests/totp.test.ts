import { generateSecret, generateTOTP, verifyTOTP } from '../src/utils/totp';

describe('TOTP Security Utilities', () => {
  it('should generate a valid Base32 secret', () => {
    const secret = generateSecret();
    expect(secret).toHaveLength(16);
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });

  it('should generate a 6-digit TOTP code', () => {
    const secret = generateSecret();
    const token = generateTOTP(secret);
    expect(token).toHaveLength(6);
    expect(token).toMatch(/^\d{6}$/);
  });

  it('should verify a valid TOTP code', () => {
    const secret = generateSecret();
    const token = generateTOTP(secret);
    const isValid = verifyTOTP(token, secret);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect TOTP code', () => {
    const secret = generateSecret();
    const isValid = verifyTOTP('000000', secret);
    expect(isValid).toBe(false);
  });

  it('should verify with allowed window drift', () => {
    const secret = generateSecret();
    const token = generateTOTP(secret);
    
    // Default verify has window = 1, so it checks current, -1, and +1 step.
    const isValidCurrent = verifyTOTP(token, secret, 1);
    expect(isValidCurrent).toBe(true);

    // Verify with window = 0 (checks only exact counter)
    const isValidExact = verifyTOTP(token, secret, 0);
    expect(isValidExact).toBe(true);
  });
});
