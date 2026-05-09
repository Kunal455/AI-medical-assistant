const axios = require("axios");

class InfermedicaService {
    static getClient() {
        return axios.create({
            baseURL: "https://api.infermedica.com/v3",
            headers: {
                "App-Id": process.env.INFERMEDICA_APP_ID,
                "App-Key": process.env.INFERMEDICA_APP_KEY,
                "Content-Type": "application/json"
            }
        });
    }

    static async analyzeSymptoms(symptomsText, age = 30, sex = "male") {
        try {
            const client = this.getClient();
            
            // 1. Parse natural language symptoms into Infermedica format
            const parseResponse = await client.post("/parse", {
                text: symptomsText
            });
            
            const evidence = parseResponse.data.mentions.map(mention => ({
                id: mention.id,
                choice_id: mention.choice_id,
                source: "initial"
            }));

            if (evidence.length === 0) {
                return {
                    possibleConditions: [],
                    severity: "unknown",
                    specialistRecommendation: "General Practitioner",
                    message: "Could not clearly identify medical symptoms from the text."
                };
            }

            // 2. Get diagnosis (possible conditions)
            const diagnosisResponse = await client.post("/diagnosis", {
                sex: sex,
                age: { value: age },
                evidence: evidence
            });

            // 3. Get triage (severity and specialist recommendation)
            const triageResponse = await client.post("/triage", {
                sex: sex,
                age: { value: age },
                evidence: evidence
            });

            // Map and format results
            const possibleConditions = diagnosisResponse.data.conditions
                .slice(0, 5) // Top 5 conditions
                .map(c => ({
                    name: c.name,
                    probability: (c.probability * 100).toFixed(1) + "%"
                }));

            return {
                possibleConditions,
                severity: triageResponse.data.triage_level,
                specialistRecommendation: triageResponse.data.recommended_specialist || "General Practitioner",
                description: triageResponse.data.description || "Please consult a healthcare professional for an accurate diagnosis."
            };
            
        } catch (error) {
            console.error("Infermedica API Error:", error.response?.data || error.message);
            throw new Error("Failed to analyze symptoms using Infermedica");
        }
    }
}

module.exports = InfermedicaService;
