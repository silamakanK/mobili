module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/app.js'],
  coverageThreshold: {
    global: {
      lines: 70,
    },
  },
}
