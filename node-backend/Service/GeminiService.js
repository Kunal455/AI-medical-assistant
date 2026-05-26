const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
    static getModel(systemInstruction = null, enableSearch = false) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");
        const config = { model: "gemini-2.5-flash" };
        if (systemInstruction) {
            config.systemInstruction = systemInstruction;
        }
        if (enableSearch) {
            config.tools = [{ googleSearch: {} }];
        }
        return genAI.getGenerativeModel(config);
    }

    static async analyzeMedicalReport(reportText) {
        try {
            const systemPrompt = `You are a helpful AI medical assistant. 
Your task is to analyze the provided medical report text and extract key information.
CRITICAL RULES:
1. NEVER provide a final diagnosis.
2. Always advise the user to consult a qualified healthcare professional.
3. Be objective and strictly base your response on the provided text.
4. FIRST, determine if the text is actually a medical document, lab result, or prescription. If it is NOT medical (e.g. random text, general articles, non-medical invoices), set "isMedical" to false and provide a polite refusal.

Return your response in a structured JSON format with the following keys:
- "isMedical": Boolean (true if it's a medical document, false otherwise)
- "importantFindings": Array of strings (key observations, leave empty if not medical)
- "abnormalValues": Array of strings (any values out of normal range, leave empty if not medical)
- "simpleExplanation": String (a patient-friendly summary of what the report means, OR a refusal message if not medical)
- "precautions": Array of strings (general wellness advice based on the findings, leave empty if not medical)`;

            const model = this.getModel(systemPrompt);
            const prompt = `Here is the medical report text:\n\n${reportText}\n\nPlease analyze it and return ONLY valid JSON.`;
            const result = await model.generateContent(prompt);
            const content = result.response.text();
            
            // Clean up markdown json tags if present
            const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
            
            return JSON.parse(cleanJsonStr);
        } catch (error) {
            console.error("Gemini Report Analysis Error:", error);
            throw new Error("Failed to analyze medical report with Gemini");
        }
    }

    static async chat(messages) {
        try {
            const systemPrompt = `You are an AI medical assistant.
CRITICAL RULES:
1. ONLY answer questions related to medicine, health, symptoms, medical reports, anatomy, or wellness.
2. If the user asks about ANYTHING else (like programming, math, politics, general chat, coding, recipes), politely refuse to answer and state that you are strictly a medical assistant.
3. NEVER provide a final diagnosis or definitive medical advice.
4. Always remind the user to consult a doctor for serious concerns.
5. Keep your answers concise, empathetic, and informative.`;

            const model = this.getModel(systemPrompt, true);
            
            // Format history for Gemini SDK
            const history = [];
            for (let i = 0; i < messages.length - 1; i++) {
                const msg = messages[i];
                history.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            }
            
            const chatSession = model.startChat({ history });
            const lastMessage = messages[messages.length - 1].content;
            
            const result = await chatSession.sendMessage(lastMessage);
            return result.response.text();
        } catch (error) {
            console.error("Gemini Chat Error:", error);
            throw new Error("Failed to process chat message with Gemini");
        }
    }

    static async analyzeSymptoms(symptomsText) {
        try {
            const systemPrompt = `You are a helpful AI symptom analyzer.
Your task is to analyze the user's symptoms and provide potential possibilities.
CRITICAL RULES:
1. Emphasize that you are NOT a doctor and cannot provide a final diagnosis.
2. Return your response in a structured JSON format with the following keys:
- "possibleConditions": Array of objects { name: string, probability: string (e.g., "High", "Medium", "Low") }
- "severity": string (e.g., "low", "medium", "high")
- "specialistRecommendation": string
- "description": string (general advice)`;

            const model = this.getModel(systemPrompt);
            const prompt = `Here are my symptoms:\n\n${symptomsText}\n\nPlease analyze them and return ONLY valid JSON.`;
            const result = await model.generateContent(prompt);
            const content = result.response.text();
            
            const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJsonStr);
        } catch (error) {
            console.error("Gemini Symptoms Analysis Error:", error);
            throw new Error("Failed to analyze symptoms with Gemini");
        }
    }

    static async getMedicineDetails(medicineName) {
        try {
            const systemPrompt = `You are a helpful AI pharmaceutical dictionary.
Your task is to provide factual metadata about a given medicine.
Return your response in a structured JSON format with the following keys:
- "searchName": string
- "fdaInfo": Object with keys { brandName: string, genericName: string, purpose: string, warnings: string, precautions: string, sideEffects: string }
- "rxNavInfo": Object with keys { rxcui: string, name: string, synonym: string } 
(If specific RxNorm ID is unknown, make a reasonable guess or leave it empty).`;

            const model = this.getModel(systemPrompt);
            const prompt = `Provide medical details for the medicine: ${medicineName}\n\nPlease return ONLY valid JSON.`;
            const result = await model.generateContent(prompt);
            const content = result.response.text();
            
            const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJsonStr);
        } catch (error) {
            console.error("Gemini Medicine Details Error:", error);
            throw new Error("Failed to get medicine details with Gemini");
        }
    }
}

module.exports = GeminiService;
