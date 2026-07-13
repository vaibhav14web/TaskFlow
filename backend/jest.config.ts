import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
      }
    }]
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
  clearMocks: true,
  testTimeout: 15000,
};

export default config;
