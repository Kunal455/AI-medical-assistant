const OcrService = require("../Service/OcrService");
const GeminiService = require("../Service/GeminiService");
const fs = require("fs");

class MedicalController {
    static async uploadReport(req, res) {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ error: "No file uploaded" });

            // 1. Extract text using OCR.Space
            const extractedText = await OcrService.extractText(file.path, file.mimetype);
            
            // Clean up file
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

            if (!extractedText) {
                return res.status(400).json({ error: "Could not extract text from the file." });
            }

            // 2. Analyze with Gemini API
            const aiAnalysis = await GeminiService.analyzeMedicalReport(extractedText);

            res.json({
                success: true,
                extractedText,
                aiAnalysis
            });

        } catch (error) {
            console.error("Upload Report Error:", error);
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ error: error.message || "Failed to process report" });
        }
    }

    static async analyzeSymptoms(req, res) {
        try {
            const { symptoms } = req.body;
            if (!symptoms) return res.status(400).json({ error: "Symptoms are required" });

            const analysis = await GeminiService.analyzeSymptoms(symptoms);

            res.json({ success: true, analysis });
        } catch (error) {
            console.error("Symptoms Error:", error);
            res.status(500).json({ error: error.message || "Failed to analyze symptoms" });
        }
    }

    static async getMedicine(req, res) {
        try {
            const { name } = req.params;
            if (!name) return res.status(400).json({ error: "Medicine name is required" });

            const medicineDetails = await GeminiService.getMedicineDetails(name);

            res.json({ success: true, medicine: medicineDetails });
        } catch (error) {
            console.error("Medicine Error:", error);
            res.status(500).json({ error: error.message || "Failed to fetch medicine details" });
        }
    }

    static async chat(req, res) {
        try {
            const { messages } = req.body; 
            if (!messages || !Array.isArray(messages)) {
                return res.status(400).json({ error: "Valid messages array is required" });
            }

            const responseText = await GeminiService.chat(messages);

            res.json({ success: true, response: responseText });
        } catch (error) {
            console.error("Chat Error:", error);
            res.status(500).json({ error: error.message || "Chat failed" });
        }
    }
}

module.exports = MedicalController;
