const fs = require("fs");
const OcrService = require("../Service/OcrService");

// Generic file handler proxy to Python backend
const analyzeFile = (pythonEndpoint) => async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // Use high-fidelity Gemini OCR
        const extractedText = await OcrService.extractText(file.path, file.mimetype);

        // Clean up the uploaded file to save space
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        // Determine key for python backend (reportText vs prescriptionText)
        const key = pythonEndpoint.includes("report") ? "reportText" : "prescriptionText";

        // Forward to Python AI microservice
        // Use native fetch to avoid axios dependency issues
        const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${pythonBackendUrl}${pythonEndpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ [key]: extractedText })
        });

        const data = await response.json();
        res.json({ success: true, aiResponse: data.response });
    } catch (error) {
        console.error("File Analysis Error:", error);
        res.status(500).json({ error: error.message || "File analysis failed" });
    }
};

// Generic text handler proxy to Python backend
const analyzeText = (pythonEndpoint, key) => async (req, res) => {
    try {
        const textValue = req.body[key];
        if (!textValue) {
            return res.status(400).json({ error: `${key} is required` });
        }

        const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${pythonBackendUrl}${pythonEndpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ [key]: textValue })
        });

        const data = await response.json();
        res.json({ success: true, aiResponse: data.response });
    } catch (error) {
        console.error("Text Analysis Error:", error);
        res.status(500).json({ error: error.message || "Analysis failed" });
    }
};

const analyzeReport = analyzeFile("/analyze/report");
const analyzePrescription = analyzeFile("/analyze/prescription");
const analyzeMedicine = analyzeText("/analyze/medicine", "medicineName");
const analyzeDiet = analyzeText("/analyze/diet", "userData");

module.exports = {
    analyzeReport,
    analyzePrescription,
    analyzeMedicine,
    analyzeDiet
};
