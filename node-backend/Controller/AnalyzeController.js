const fs = require("fs");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");

// Extract text from PDF
async function extractPdfText(path) {
    const dataBuffer = fs.readFileSync(path);
    const data = await pdfParse(dataBuffer);
    return data.text;
}

// Extract text from Image
async function extractImageText(path) {
    const result = await Tesseract.recognize(path, "eng");
    return result.data.text;
}

// Generic file handler proxy to Python backend
const analyzeFile = (pythonEndpoint) => async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        let extractedText = "";

        if (file.mimetype === "application/pdf") {
            extractedText = await extractPdfText(file.path);
        } else if (file.mimetype.startsWith("image/")) {
            extractedText = await extractImageText(file.path);
        } else {
            return res.status(400).json({ error: "Unsupported file format. Please upload PDF or Image." });
        }

        // Clean up the uploaded file to save space
        fs.unlinkSync(file.path);

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
