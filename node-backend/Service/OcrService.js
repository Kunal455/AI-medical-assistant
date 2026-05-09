const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

class OcrService {
    static async extractText(filePath, mimeType) {
        try {
            // If it's a PDF, we might use a specific parameter, but OCR.Space handles both
            const formData = new FormData();
            formData.append("file", fs.createReadStream(filePath));
            formData.append("apikey", process.env.OCR_SPACE_API_KEY || "helloworld"); 
            formData.append("language", "eng");
            formData.append("isOverlayRequired", "false");
            
            // Explicitly specify PDF file type if applicable
            if (mimeType === "application/pdf") {
                formData.append("filetype", "PDF");
            }

            const response = await axios.post("https://api.ocr.space/parse/image", formData, {
                headers: {
                    ...formData.getHeaders()
                }
            });

            const data = response.data;
            if (data.IsErroredOnProcessing) {
                throw new Error(data.ErrorMessage[0] || "OCR processing failed");
            }

            // Combine parsed text from all pages
            let extractedText = "";
            if (data.ParsedResults && data.ParsedResults.length > 0) {
                data.ParsedResults.forEach(page => {
                    extractedText += page.ParsedText + "\n";
                });
            }

            return extractedText.trim();
        } catch (error) {
            console.error("OCR Service Error:", error.response?.data || error.message);
            throw new Error("Failed to extract text from file");
        }
    }
}

module.exports = OcrService;
