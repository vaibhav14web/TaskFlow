import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined,
  redact: {
    paths: ['req.headers.authorization', 'req.body.token', 'req.body.password', 'req.body.new_password'],
    censor: '[REDACTED]'
  },
  serializers: {
    req: pino.stdSerializers.req,
    err: pino.stdSerializers.err
  }
});

export default logger;
