const axios = require("axios");

class GrokService {
    static getClient() {
        return axios.create({
            baseURL: "https://api.x.ai/v1",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GROK_API_KEY}`
            }
        });
    }

    static async analyzeMedicalReport(reportText) {
        try {
            const systemPrompt = `You are a helpful AI medical assistant. 
Your task is to analyze the provided medical report text and extract key information.
CRITICAL RULES:
1. NEVER provide a final diagnosis.
2. Always advise the user to consult a qualified healthcare professional.
3. Be objective and strictly base your response on the provided text.

Return your response in a structured JSON format with the following keys:
- "importantFindings": Array of strings (key observations)
- "abnormalValues": Array of strings (any values out of normal range)
- "simpleExplanation": String (a patient-friendly summary of what the report means)
- "precautions": Array of strings (general wellness advice based on the findings)`;

            const response = await this.getClient().post("/chat/completions", {
                model: "grok-2",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Here is the medical report text:\n\n${reportText}\n\nPlease analyze it and return ONLY valid JSON.` }
                ],
                temperature: 0.1
            });

            const content = response.data.choices[0].message.content;
            
            // Clean up markdown json tags if present
            const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
            
            return JSON.parse(cleanJsonStr);
        } catch (error) {
            console.error("Grok Report Analysis Error:", error.response?.data || error.message);
            throw new Error("Failed to analyze medical report with Grok AI");
        }
    }

    static async chat(messages) {
        try {
            const systemPrompt = `You are an AI medical assistant.
CRITICAL RULES:
1. NEVER provide a final diagnosis or definitive medical advice.
2. Always remind the user to consult a doctor for serious concerns.
3. Keep your answers concise, empathetic, and informative.`;

            // Prepend system prompt to user messages
            const formattedMessages = [
                { role: "system", content: systemPrompt },
                ...messages
            ];

            const response = await this.getClient().post("/chat/completions", {
                model: "grok-2",
                messages: formattedMessages,
                temperature: 0.5
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error("Grok Chat Error:", error.response?.data || error.message);
            throw new Error("Failed to process chat message with Grok AI");
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

            const response = await this.getClient().post("/chat/completions", {
                model: "grok-2",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Here are my symptoms:\n\n${symptomsText}\n\nPlease analyze them and return ONLY valid JSON.` }
                ],
                temperature: 0.2
            });

            const content = response.data.choices[0].message.content;
            const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJsonStr);
        } catch (error) {
            console.error("Grok Symptoms Analysis Error:", error.response?.data || error.message);
            throw new Error("Failed to analyze symptoms with Grok AI");
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

            const response = await this.getClient().post("/chat/completions", {
                model: "grok-2",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Provide medical details for the medicine: ${medicineName}\n\nPlease return ONLY valid JSON.` }
                ],
                temperature: 0.1
            });

            const content = response.data.choices[0].message.content;
            const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJsonStr);
        } catch (error) {
            console.error("Grok Medicine Details Error:", error.response?.data || error.message);
            throw new Error("Failed to get medicine details with Grok AI");
        }
    }
}

module.exports = GrokService;
