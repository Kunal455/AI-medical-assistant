// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * MedAssist Playwright Configuration
 * Uses environment variables so URLs are not hardcoded.
 *
 * Env vars (set in Jenkins or .env.test):
 *   NODE_API_URL   — Node/Express API Gateway  (default: http://localhost:5000)
 *   PYTHON_API_URL — FastAPI AI Engine          (default: http://localhost:8000)
 *   CI             — set to any value in Jenkins to enable CI mode
 */

const NODE_API_URL   = process.env.NODE_API_URL   || 'http://localhost:5000';
const PYTHON_API_URL = process.env.PYTHON_API_URL  || 'http://localhost:8000';

module.exports = defineConfig({
  // ── Test location ─────────────────────────────────────────────────────────
  testDir: './tests',

  // ── Parallelism ───────────────────────────────────────────────────────────
  fullyParallel: false,          // keep sequential — tests share state (cookie)
  workers: 1,                    // single worker for stable CI execution

  // ── Retries ───────────────────────────────────────────────────────────────
  retries: process.env.CI ? 1 : 0,

  // ── CI safety ─────────────────────────────────────────────────────────────
  // Fail immediately if .only is accidentally left in test code
  forbidOnly: !!process.env.CI,

  // ── Timeout ───────────────────────────────────────────────────────────────
  timeout: 30_000,               // 30 s per test
  expect: { timeout: 10_000 },

  // ── Reporters ─────────────────────────────────────────────────────────────
  // list: shows test names in Jenkins console log
  // html: generates playwright-report/ folder (saved as Jenkins artifact)
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  // ── Global use options ────────────────────────────────────────────────────
  use: {
    // No browser UI in CI
    headless: true,

    // Screenshots on every failure
    screenshot: 'only-on-failure',

    // Trace (click log + snapshots) on first retry
    trace: 'on-first-retry',

    // No video — keeps artifacts small
    video: 'off',

    // Ignore HTTPS errors (not needed here but safe)
    ignoreHTTPSErrors: true,
  },

  // ── Single project: Chromium only for API tests ───────────────────────────
  // API tests do NOT need a browser engine, but Playwright requires at least
  // one project. Chromium is lightest.
  projects: [
    {
      name: 'chromium',
      use: { channel: undefined }, // use bundled Chromium, not system Chrome
    },
  ],

  // ── Expose URLs as global env for test files ──────────────────────────────
  // Tests read process.env.NODE_API_URL / process.env.PYTHON_API_URL directly.
});
