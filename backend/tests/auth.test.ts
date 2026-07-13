import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { hashPassword, generateAccessToken } from '../src/utils/auth';

jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => {
      return {
        verifyIdToken: jest.fn().mockImplementation(async ({ idToken }) => {
          if (global.fetch) {
            const res: any = await (global.fetch as any)();
            if (!res.ok) {
              throw new Error('Invalid token');
            }
            const data = await res.json();
            return {
              getPayload: () => data
            };
          }
          return {
            getPayload: () => ({
              aud: 'test-google-client-id',
              email: 'google-user@example.com',
              name: 'Google User',
              picture: 'http://avatar.url'
            })
          };
        })
      };
    })
  };
});

describe('Authentication & Account Management API', () => {
  const cleanDb = async () => {
    await prisma.notification.deleteMany({});
    await prisma.activityLog.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.checklistItem.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.column.deleteMany({});
    await prisma.board.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
  };

  beforeAll(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  let verificationToken = '';
  let accessToken = '';
  let refreshToken = '';
  let resetToken = '';

  // 1. Test Registration
  it('should register a new user successfully but keep emailVerified false', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'password123'
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.message).toContain('Registration successful');
    expect(res.body.data.user.email).toBe('alice@example.com');

    // Verify in database
    const userInDb = await prisma.user.findUnique({
      where: { email: 'alice@example.com' }
    });
    expect(userInDb).toBeDefined();
    expect(userInDb?.emailVerified).toBe(false);
    expect(userInDb?.verificationToken).toBeTruthy();

    verificationToken = userInDb?.verificationToken || '';
  });

  it('should not register user with duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Alice Duplicate',
        email: 'alice@example.com',
        password: 'password123'
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  // 2. Test Email Verification
  it('should fail login if email is not verified', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'password123'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('should verify email with valid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: verificationToken });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('verified successfully');

    // Check DB
    const userInDb = await prisma.user.findUnique({
      where: { email: 'alice@example.com' }
    });
    expect(userInDb?.emailVerified).toBe(true);
    expect(userInDb?.verificationToken).toBeNull();
  });

  // 3. Test Login
  it('should login verified user and return tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();
    expect(res.body.data.user.email).toBe('alice@example.com');

    accessToken = res.body.data.access_token;
    refreshToken = res.body.data.refresh_token;
  });

  it('should fail login with incorrect password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // 4. Test Token Refresh
  it('should refresh access token using valid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();

    accessToken = res.body.data.access_token;
    refreshToken = res.body.data.refresh_token;
  });

  // 5. Test Password Reset Flow
  it('should request password reset successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('password reset link has been sent');

    // Retrieve token from database
    const userInDb = await prisma.user.findUnique({
      where: { email: 'alice@example.com' }
    });
    expect(userInDb?.resetToken).toBeTruthy();
    expect(userInDb?.resetTokenExpiry).toBeDefined();

    resetToken = userInDb?.resetToken || '';
  });

  it('should confirm password reset with valid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .send({
        token: resetToken,
        new_password: 'newpassword123'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('Password reset successfully');

    // Attempt login with new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'newpassword123'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.access_token).toBeDefined();
  });

  describe('Google OAuth endpoints', () => {
    const originalEnv = { ...process.env };
    const originalFetch = global.fetch;

    afterEach(() => {
      process.env = { ...originalEnv };
      global.fetch = originalFetch;
    });

    it('should return Google Client ID if configured, or null otherwise', async () => {
      // 1. Unconfigured
      delete process.env.GOOGLE_CLIENT_ID;
      let res = await request(app).get('/api/v1/auth/config');
      expect(res.status).toBe(200);
      expect(res.body.data.googleClientId).toBeNull();

      // 2. Configured
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      res = await request(app).get('/api/v1/auth/config');
      expect(res.status).toBe(200);
      expect(res.body.data.googleClientId).toBe('test-google-client-id');
    });

    it('should fail Google OAuth login if credentials are not configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const res = await request(app)
        .post('/api/v1/auth/oauth/google')
        .send({ token: 'dummy-token' });

      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe('GOOGLE_AUTH_CONFIG_ERROR');
    });

    it('should fail if token is missing', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

      const res = await request(app)
        .post('/api/v1/auth/oauth/google')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail if Google token verification fails', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

      // Mock fetch returning error
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'invalid_token' })
        } as any)
      );

      const res = await request(app)
        .post('/api/v1/auth/oauth/google')
        .send({ token: 'invalid-token-value' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid Google OAuth token');
    });

    it('should fail if Google token audience mismatches', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            aud: 'wrong-audience-id',
            email: 'google-user@example.com',
            name: 'Google User',
            picture: 'http://avatar.url'
          })
        } as any)
      );

      const res = await request(app)
        .post('/api/v1/auth/oauth/google')
        .send({ token: 'valid-token' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Google token audience mismatch');
    });

    it('should register and login new user on successful Google OAuth', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

      // Make sure the email is not in the database yet
      await prisma.user.deleteMany({ where: { email: 'google-user@example.com' } });

      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            aud: 'test-google-client-id',
            email: 'google-user@example.com',
            name: 'Google User',
            picture: 'http://avatar.url'
          })
        } as any)
      );

      const res = await request(app)
        .post('/api/v1/auth/oauth/google')
        .send({ token: 'valid-token' });

      expect(res.status).toBe(200);
      expect(res.body.data.access_token).toBeDefined();
      expect(res.body.data.refresh_token).toBeDefined();
      expect(res.body.data.user.email).toBe('google-user@example.com');
      expect(res.body.data.user.name).toBe('Google User');

      // Verify user in db
      const dbUser = await prisma.user.findUnique({ where: { email: 'google-user@example.com' } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.emailVerified).toBe(true);
      expect(dbUser?.avatarUrl).toBe('http://avatar.url');
    });
  });

  describe('Two-Factor Authentication (2FA) endpoints', () => {
    let tfUserToken = '';
    let tfUserId = '';
    let tfUserSecret = '';
    let backupCodes: string[] = [];

    beforeAll(async () => {
      // Create user
      const user = await prisma.user.create({
        data: {
          name: 'TwoFactor User',
          email: 'twofactor@example.com',
          passwordHash: await hashPassword('password123'),
          emailVerified: true
        }
      });
      tfUserId = user.id;
      tfUserToken = generateAccessToken(user.id);
    });

    it('should generate a 2FA setup secret and otpauth URL', async () => {
      const res = await request(app)
        .post('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${tfUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.secret).toBeDefined();
      expect(res.body.data.otpauthUrl).toContain('otpauth://totp/');

      // Save secret for verification
      tfUserSecret = res.body.data.secret;
    });

    it('should fail 2FA verification with an invalid code', async () => {
      const res = await request(app)
        .post('/api/v1/auth/2fa/verify-setup')
        .set('Authorization', `Bearer ${tfUserToken}`)
        .send({ code: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Verification failed');
    });

    it('should successfully verify 2FA setup and return backup codes', async () => {
      const { generateTOTP } = require('../src/utils/totp');
      const validCode = generateTOTP(tfUserSecret);

      const res = await request(app)
        .post('/api/v1/auth/2fa/verify-setup')
        .set('Authorization', `Bearer ${tfUserToken}`)
        .send({ code: validCode });

      expect(res.status).toBe(200);
      expect(res.body.data.backupCodes).toHaveLength(5);
      backupCodes = res.body.data.backupCodes;

      // Verify DB status
      const user = await prisma.user.findUnique({ where: { id: tfUserId } });
      expect(user?.twoFactorEnabled).toBe(true);
      expect(user?.twoFactorSecret).toBe(tfUserSecret);
      expect(user?.twoFactorBackupCodes).toBeTruthy();
    });

    it('should require 2FA on login and return a loginTicket', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'twofactor@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.twoFactorRequired).toBe(true);
      expect(res.body.data.loginTicket).toBeDefined();
    });

    it('should fail login verification with incorrect code', async () => {
      // 1. Get ticket
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'twofactor@example.com', password: 'password123' });
      const ticket = loginRes.body.data.loginTicket;

      const res = await request(app)
        .post('/api/v1/auth/2fa/login-verify')
        .send({ code: '000000', loginTicket: ticket });

      expect(res.status).toBe(401);
    });

    it('should login successfully with correct 2FA code', async () => {
      const { generateTOTP } = require('../src/utils/totp');
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'twofactor@example.com', password: 'password123' });
      const ticket = loginRes.body.data.loginTicket;
      const code = generateTOTP(tfUserSecret);

      const res = await request(app)
        .post('/api/v1/auth/2fa/login-verify')
        .send({ code, loginTicket: ticket });

      expect(res.status).toBe(200);
      expect(res.body.data.access_token).toBeDefined();
      expect(res.body.data.refresh_token).toBeDefined();
      expect(res.body.data.user.email).toBe('twofactor@example.com');
    });

    it('should login successfully using a backup code and consume it', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'twofactor@example.com', password: 'password123' });
      const ticket = loginRes.body.data.loginTicket;

      // Use the first backup code
      const backupCode = backupCodes[0];

      const res = await request(app)
        .post('/api/v1/auth/2fa/login-verify')
        .send({ code: backupCode, loginTicket: ticket });

      expect(res.status).toBe(200);
      expect(res.body.data.access_token).toBeDefined();

      // Verify the backup code is consumed (there should now be 4 codes left)
      const user = await prisma.user.findUnique({ where: { id: tfUserId } });
      const currentCodes = user?.twoFactorBackupCodes?.split(',') || [];
      expect(currentCodes).toHaveLength(4);
    });

    it('should successfully disable 2FA', async () => {
      const { generateTOTP } = require('../src/utils/totp');
      const code = generateTOTP(tfUserSecret);

      const res = await request(app)
        .post('/api/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${tfUserToken}`)
        .send({ code });

      expect(res.status).toBe(200);

      // Verify DB
      const user = await prisma.user.findUnique({ where: { id: tfUserId } });
      expect(user?.twoFactorEnabled).toBe(false);
      expect(user?.twoFactorSecret).toBeNull();
      expect(user?.twoFactorBackupCodes).toBeNull();
    });
  });
});

