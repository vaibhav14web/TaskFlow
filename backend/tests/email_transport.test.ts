describe('email transport fallback', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does not throw if the SMTP provider rejects the connection', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SMTP_HOST = 'smtp.resend.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'resend';
    process.env.SMTP_PASS = 're_test_api_key';
    process.env.EMAIL_FROM = 'onboarding@taskflow.app';

    jest.doMock('nodemailer', () => ({
      __esModule: true,
      default: {
        createTransport: jest.fn().mockReturnValue({
          sendMail: jest.fn().mockRejectedValue(new Error('no tenant identifier provided (external_id or sni_hostname required)'))
        })
      }
    }));

    const { sendEmail } = await import('../src/utils/email');

    await expect(sendEmail('user@example.com', 'Subject', '<p>hello</p>', 'hello')).resolves.toBeUndefined();
  });
});
