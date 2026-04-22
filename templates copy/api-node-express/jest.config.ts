module.exports = {
  setupFiles: ['<rootDir>/test/jest-ci-env.js'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/index.ts',
    '!<rootDir>/src/**/*protocols.ts',
    '!<rootDir>/src/server.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  /** Cobertura mínima baixa na V1 — o template inclui muito core ainda não coberto por testes. */
  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
  },
  transform: {
    '.+\\.ts$': 'ts-jest'
  }
}