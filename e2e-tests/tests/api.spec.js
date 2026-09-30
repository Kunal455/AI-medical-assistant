// api.spec.js
// TEST 2 — Authentication flow (register + login)
// TEST 3 — Protected route access using real JWT cookie
// TEST 4 — Negative test: login with wrong credentials → 400
//
// Routes used (all verified from UserRouter.js + UserController.js):
//   POST /api/v1/user/signup  → register a new user
//   POST /api/v1/user/login   → login, sets HTTP-only cookie "token"
//   GET  /api/v1/user/profile → protected, requires cookie
//   GET  /api/v1/user/logout  → clears cookie

const { test, expect, request } = require('@playwright/test');

const NODE_API_URL = process.env.NODE_API_URL || 'http://localhost:5000';

// Use a unique test email so each CI run doesn't collide with an existing user.
// The timestamp makes it unique. This is NOT a real production secret.
const TEST_EMAIL    = `playwright_ci_${Date.now()}@medassist.test`;
const TEST_PASSWORD = 'PlaywrightTest123';
const TEST_NAME     = 'Playwright CI';

test.describe('Authentication API Flow', () => {

  // Shared cookie jar across tests in this describe block
  let apiContext;

  test.beforeAll(async () => {
    // Create one APIRequestContext that persists cookies across tests
    apiContext = await request.newContext({
      baseURL: NODE_API_URL,
      // Playwright automatically stores cookies from Set-Cookie headers
      // and sends them on subsequent requests within the same context
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('TEST 2a — Register a new user account', async () => {
    // From UserController.js → userRegister:
    // POST /api/v1/user/signup with { name, email, password }
    // Returns 201 { message: "User registered successfully" }
    const response = await apiContext.post('/api/v1/user/signup', {
      data: {
        name:     TEST_NAME,
        email:    TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body).toHaveProperty('message', 'User registered successfully');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('TEST 2b — Login with correct credentials, receive auth cookie', async () => {
    // From UserController.js → userLogin:
    // POST /api/v1/user/login with { email, password }
    // Returns 200 { message: "Login successful", user: { id, name, email } }
    // AND sets HTTP-only cookie "token" with JWT (7 day expiry)
    const response = await apiContext.post('/api/v1/user/login', {
      data: {
        email:    TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('message', 'Login successful');
    expect(body).toHaveProperty('user');
    expect(body.user).toHaveProperty('email', TEST_EMAIL);
    expect(body.user).toHaveProperty('name', TEST_NAME);
    // id should be a MongoDB ObjectId string
    expect(body.user).toHaveProperty('id');
    expect(typeof body.user.id).toBe('string');

    // The "token" cookie is now stored in apiContext automatically by Playwright
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('TEST 3 — Access protected /profile route using JWT cookie', async () => {
    // After TEST 2b the cookie "token" is in apiContext.
    // GET /api/v1/user/profile → AuthMiddleware reads req.cookies.token
    // Returns 200 { _id, name, email, createdAt } (no password field)
    const response = await apiContext.get('/api/v1/user/profile');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('email', TEST_EMAIL);
    expect(body).toHaveProperty('name', TEST_NAME);
    // Confirm password is NOT returned (from UserController.js .select("-password"))
    expect(body).not.toHaveProperty('password');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('TEST 4 — Negative: login with wrong password returns 400', async () => {
    // From UserController.js → userLogin:
    // bcrypt.compare fails → res.status(400).json({ message: "Invalid credentials" })
    const freshCtx = await request.newContext({ baseURL: NODE_API_URL });

    const response = await freshCtx.post('/api/v1/user/login', {
      data: {
        email:    TEST_EMAIL,
        password: 'WRONG_PASSWORD_XYZ',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('message', 'Invalid credentials');

    await freshCtx.dispose();
  });

});
