import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30000, // 30s para levantar containers
  setupFiles: ['<rootDir>/tests/setup.ts'],
  verbose: true,
};

export default config;
