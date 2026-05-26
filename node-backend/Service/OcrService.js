const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

class OcrService {
    static async extractText(filePath, mimeType) {
        try {
            // Initialize Gemini with API Key
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            // Read local file and convert to Base64
            if (!fs.existsSync(filePath)) {
                throw new Error("File not found at path: " + filePath);
            }
            const fileBuffer = fs.readFileSync(filePath);
            const base64Data = fileBuffer.toString("base64");

            const filePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            };

            const prompt = `You are a professional medical document scanner. 
Your task is to transcribe all readable text from the provided medical document (image or PDF) with absolute accuracy. 
Preserve the structure, labels, values, prescriptions, and notes. Do not summarize, explain, or add any commentary. 
If the text contains handwriting, try your best to decipher it (especially drug names and dosages). 
Return ONLY the raw transcribed text.`;

            const result = await model.generateContent([filePart, prompt]);
            const responseText = result.response.text();

            if (!responseText) {
                throw new Error("Gemini returned empty transcription");
            }

            return responseText.trim();
        } catch (error) {
            console.error("Gemini OCR Service Error:", error);
            throw new Error("Failed to extract text from document: " + error.message);
        }
    }
}

module.exports = OcrService;
