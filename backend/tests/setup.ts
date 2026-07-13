// Load test environment variables before any test modules import
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';
process.env.JWT_SECRET = 'test-jwt-secret-min-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars-long!!';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
// Disable rate limiting in tests
process.env.DISABLE_RATE_LIMIT = 'true';
// Disable Redis for tests (no cache needed)
process.env.REDIS_URL = '';
