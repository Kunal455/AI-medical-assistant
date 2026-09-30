// health.spec.js
// TEST 1 — API Gateway and Python FastAPI availability
//
// Verifies that both backend services are up and responding before
// any other tests run. If these fail, nothing else will work.
//
// Routes used (from server.js / main.py — verified from actual code):
//   Node API Gateway : http://localhost:5000  (no dedicated /health route exists,
//                      so we hit GET /api/v1/user/profile which returns 401 when
//                      unauthenticated — that is still proof the server is up)
//   Python FastAPI   : http://localhost:8000/  → {"status":"ok"}

const { test, expect, request } = require('@playwright/test');

const NODE_API_URL   = process.env.NODE_API_URL   || 'http://localhost:5000';
const PYTHON_API_URL = process.env.PYTHON_API_URL  || 'http://localhost:8000';

test.describe('Service Health Checks', () => {

  test('TEST 1a — Node API Gateway is reachable (returns 401 on protected route, not 502/ECONNREFUSED)', async () => {
    const ctx = await request.newContext({ baseURL: NODE_API_URL });

    // GET /api/v1/user/profile is a real route (verified from UserRouter.js).
    // Without a cookie it returns 401 — that means the server IS up.
    // A 502 or network error means Docker service not started.
    const response = await ctx.get('/api/v1/user/profile');

    // 401 = server is alive but we're unauthenticated — correct
    // anything >= 500 or a network error = service is down — fail
    expect(response.status()).toBe(401);

    const body = await response.json();
    // From AuthMiddleware.js: { message: "No token found" }
    expect(body).toHaveProperty('message');

    await ctx.dispose();
  });

  test('TEST 1b — Python FastAPI health endpoint returns status ok', async () => {
    const ctx = await request.newContext({ baseURL: PYTHON_API_URL });

    // GET / is defined in main.py: @app.get("/") → {"status": "ok"}
    const response = await ctx.get('/');

    expect(response.status()).toBe(200);

    const body = await response.json();
    // Exact response from main.py: return {"status": "ok"}
    expect(body).toHaveProperty('status', 'ok');

    await ctx.dispose();
  });

});
