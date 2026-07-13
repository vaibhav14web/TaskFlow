const getOrigin = (url?: string): string => {
  if (!url) return 'http://localhost:3000';
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url;
  }
};

const config = {
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    bodyLimit: process.env.BODY_LIMIT || '1mb',
    corsOrigin: getOrigin(process.env.FRONTEND_URL || process.env.CORS_ORIGIN),
  },

  jwt: {
    accessTokenTTL: process.env.JWT_ACCESS_TTL || '15m',
    refreshTokenTTL: process.env.JWT_REFRESH_TTL || '7d',
    loginTicketTTL: process.env.JWT_LOGIN_TICKET_TTL || '5m',
  },

  rateLimit: {
    login:     { windowMs: 15 * 60 * 1000, max: 5  },
    register:  { windowMs: 60 * 60 * 1000, max: 10 },
    verifyEmail:          { windowMs: 15 * 60 * 1000, max: 10 },
    passwordResetRequest: { windowMs: 15 * 60 * 1000, max: 3  },
    passwordResetConfirm: { windowMs: 15 * 60 * 1000, max: 5  },
    oauth:                { windowMs: 15 * 60 * 1000, max: 10 },
    twoFactorVerify:      { windowMs: 15 * 60 * 1000, max: 5  },
  },

  upload: {
    maxFileSize: 10 * 1024 * 1024,
  },

  auth: {
    minPasswordLength: 8,
    verificationTokenBytes: 32,
    resetTokenExpiryMs: 3600000,
    backupCodeCount: 5,
    backupCodeBytes: 4,
  },

  validation: {
    maxTaskTitle: 100,
    maxTaskDescription: 500,
    maxColumnName: 50,
  },

  cache: {
    analyticsTTL: 300,
  },

  defaultColumnNames: ['To Do', 'In Progress', 'In Review', 'Done'],

  dueDate: {
    lookaheadMs: 24 * 60 * 60 * 1000,
  },
};

export default config;
