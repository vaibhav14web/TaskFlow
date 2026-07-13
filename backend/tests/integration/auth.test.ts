import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/utils/prisma';

// ─── Helpers ───────────────────────────────────────────────────────────────
const uniqueEmail = () => `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

let testEmail: string;
let accessToken: string;

// ─── Cleanup ───────────────────────────────────────────────────────────────
afterAll(async () => {
  if (testEmail) {
    await prisma.user.deleteMany({ where: { email: testEmail } });
  }
  await prisma.$disconnect();
});

// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/register', () => {
  it('returns 201 and user data on valid registration', async () => {
    testEmail = uniqueEmail();

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test User', email: testEmail, password: 'StrongPass123!' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      message: expect.stringContaining('verify'),
      user: {
        email: testEmail,
        name: 'Test User',
      },
    });
    // Note: verificationToken is intentionally included in non-production responses for dev convenience
    // In production (NODE_ENV=production), this is stripped from the response
  });

  it('returns 409 on duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Dup User', email: testEmail, password: 'StrongPass123!' });

    expect(res.status).toBe(409);
    // The backend returns CONFLICT for duplicate emails
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 400 on missing fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail() }); // no name or password

    expect(res.status).toBe(400);
  });

  it('returns 400 on weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'User', email: uniqueEmail(), password: '123' });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/login', () => {
  it('returns 403 when email is not verified', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'StrongPass123!' });

    // Account exists but email not verified
    expect([401, 403]).toContain(res.status);
  });

  it('returns 401 on wrong password', async () => {
    // Manually verify the user so we can test wrong password path
    await prisma.user.update({
      where: { email: testEmail },
      data: { emailVerified: true },
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
  });

  it('returns 200 with tokens on correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'StrongPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      user: { email: testEmail },
    });

    accessToken = res.body.data.access_token;
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/auth/me', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user data with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    // /me returns user directly in data, not nested under data.user
    expect(res.body.data).toMatchObject({ email: testEmail });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/logout', () => {
  it('returns 200 and invalidates the session', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
