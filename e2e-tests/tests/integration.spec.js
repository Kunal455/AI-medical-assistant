// integration.spec.js
// TEST 5 — Microservice integration: Node API Gateway → Python FastAPI
//
// This test verifies the FULL end-to-end microservice communication:
//   Playwright
//   → POST /api/v1/analyze/medicine  (Node API Gateway — AnalyzeRouter.js)
//   → Node AnalyzeController.analyzeText("/analyze/medicine", "medicineName")
//   → fetch to http://python-backend:8000/analyze/medicine  (FastAPI — main.py)
//   → OpenFDA API call
//   → Response travels back through Node to Playwright
//
// Route verified from:
//   - AnalyzeRouter.js:       Router.post("/medicine", analyzeMedicine)
//   - AnalyzeController.js:   analyzeText("/analyze/medicine", "medicineName")
//   - main.py:                @app.post("/analyze/medicine") → OpenFDA lookup
//
// NOTE: This route does NOT require authentication (no authMiddleware on AnalyzeRouter).
// Verified from AnalyzeRouter.js — no Router.use(authMiddleware) present.

const { test, expect, request } = require('@playwright/test');

const NODE_API_URL   = process.env.NODE_API_URL   || 'http://localhost:5000';
const PYTHON_API_URL = process.env.PYTHON_API_URL  || 'http://localhost:8000';

test.describe('Microservice Integration: Node Gateway → Python FastAPI', () => {

  // ─────────────────────────────────────────────────────────────────────────
  test('TEST 5a — Medicine lookup flows through Node Gateway to Python FastAPI (OpenFDA)', async () => {
    const ctx = await request.newContext({ baseURL: NODE_API_URL });

    // POST /api/v1/analyze/medicine with { medicineName: "Aspirin" }
    // This is a real route with no authentication required.
    // The Node gateway proxies to Python which calls OpenFDA.
    const response = await ctx.post('/api/v1/analyze/medicine', {
      data: { medicineName: 'Aspirin' },
    });

    // The Node gateway should return 200 with { success: true, aiResponse: "..." }
    // From AnalyzeController.js: res.json({ success: true, aiResponse: data.response })
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('aiResponse');
    // aiResponse should be a non-empty markdown string from Python
    expect(typeof body.aiResponse).toBe('string');
    expect(body.aiResponse.length).toBeGreaterThan(0);

    await ctx.dispose();
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('TEST 5b — Python FastAPI /analyze/medicine endpoint responds directly', async () => {
    // Hit the Python service directly to confirm it is independently functional.
    // This isolates the Python layer from the Node layer.
    // Route from main.py: @app.post("/analyze/medicine")
    const ctx = await request.newContext({ baseURL: PYTHON_API_URL });

    const response = await ctx.post('/analyze/medicine', {
      data: { medicineName: 'Paracetamol' },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    // From main.py: return {"response": markdown_response, "medicine": medicine_info}
    // OR:           return {"error": str(e)} if OpenFDA fails
    // We accept either a valid response OR an error (OpenFDA may rate-limit in CI)
    // The important thing is that the Python service is ALIVE and responding JSON
    const isValidResponse = ('response' in body) || ('error' in body);
    expect(isValidResponse).toBe(true);

    await ctx.dispose();
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('TEST 5c — Negative: missing medicineName body returns 400 from Node Gateway', async () => {
    // From AnalyzeController.js → analyzeText:
    //   if (!textValue) return res.status(400).json({ error: `${key} is required` })
    // key = "medicineName" → error: "medicineName is required"
    const ctx = await request.newContext({ baseURL: NODE_API_URL });

    const response = await ctx.post('/api/v1/analyze/medicine', {
      data: {}, // intentionally missing medicineName
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    // The error message contains the key name
    expect(body.error).toContain('medicineName');

    await ctx.dispose();
  });

});
