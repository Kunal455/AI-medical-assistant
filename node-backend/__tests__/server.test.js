const request = require("supertest");
const express = require("express");
const AnalyzeRouter = require("../Router/AnalyzeRouter");

// Setup simple Express app instance for isolated testing of routes
const app = express();
app.use(express.json());
app.use("/api/v1/analyze", AnalyzeRouter);

// Mock Analyze Controller to prevent hitting the real Python backend during Node integration tests
jest.mock("../Controller/AnalyzeController", () => ({
    analyzeMedicine: (req, res) => {
        const { medicineName } = req.body;
        if (!medicineName) {
            return res.status(400).json({ error: "medicineName is required" });
        }
        res.json({ success: true, aiResponse: `Mock response for ${medicineName}` });
    },
    analyzeDiet: (req, res) => {
        const { userData } = req.body;
        if (!userData) {
            return res.status(400).json({ error: "userData is required" });
        }
        res.json({ success: true, aiResponse: "Mock diet advice" });
    },
    analyzeReport: (req, res) => res.json({ success: true }),
    analyzePrescription: (req, res) => res.json({ success: true })
}));

describe("Analyze Router Integration Tests", () => {
    it("POST /api/v1/analyze/medicine - should return mock response for medicineName", async () => {
        const response = await request(app)
            .post("/api/v1/analyze/medicine")
            .send({ medicineName: "Paracetamol" });

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            success: true,
            aiResponse: "Mock response for Paracetamol"
        });
    });

    it("POST /api/v1/analyze/medicine - should fail with 400 if medicineName is missing", async () => {
        const response = await request(app)
            .post("/api/v1/analyze/medicine")
            .send({});

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("medicineName is required");
    });
});
