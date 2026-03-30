/** @type {import('jest').Config} */
process.env.BACKEND_ENV_PATH = require('path').resolve(__dirname, '.env');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: {},
  testMatch: ['**/*.spec.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/tests/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov']
};
