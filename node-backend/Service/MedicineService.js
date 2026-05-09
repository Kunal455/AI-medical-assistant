const axios = require("axios");

class MedicineService {
    static async getMedicineDetails(name) {
        try {
            // 1. Fetch from OpenFDA
            let fdaData = null;
            try {
                // Search anywhere in the label for the medicine name
                const fdaResponse = await axios.get(`https://api.fda.gov/drug/label.json?search="${name}"&limit=1`);
                if (fdaResponse.data.results && fdaResponse.data.results.length > 0) {
                    const result = fdaResponse.data.results[0];
                    fdaData = {
                        brandName: result.openfda?.brand_name?.[0] || name,
                        genericName: result.openfda?.generic_name?.[0] || "Unknown",
                        purpose: result.purpose?.[0] || result.indications_and_usage?.[0] || "Information not provided in label",
                        warnings: result.warnings?.[0] || result.boxed_warning?.[0] || "Information not provided in label",
                        precautions: result.precautions?.[0] || "Information not provided in label",
                        sideEffects: result.adverse_reactions?.[0] || "Information not provided in label"
                    };
                }
            } catch (error) {
                console.warn(`OpenFDA data not found for ${name}`);
            }

            // 2. Fetch from RxNav (RxNorm)
            let rxNavData = null;
            try {
                const rxResponse = await axios.get(`https://rxnav.nlm.nih.gov/REST/drugs.json?name=${name}`);
                if (rxResponse.data.drugGroup?.conceptGroup) {
                    // Find the first concept group that actually has properties
                    const conceptGroup = rxResponse.data.drugGroup.conceptGroup.find(g => g.conceptProperties);
                    if (conceptGroup && conceptGroup.conceptProperties.length > 0) {
                        const concept = conceptGroup.conceptProperties[0];
                        rxNavData = {
                            rxcui: concept.rxcui,
                            name: concept.name,
                            synonym: concept.synonym
                        };
                    }
                }
            } catch (error) {
                console.warn(`RxNav data not found for ${name}`);
            }

            if (!fdaData && !rxNavData) {
                throw new Error("Medicine not found in medical databases.");
            }

            return {
                searchName: name,
                fdaInfo: fdaData,
                rxNavInfo: rxNavData
            };
        } catch (error) {
            console.error("Medicine Service Error:", error.message);
            throw new Error(error.message || "Failed to fetch medicine details");
        }
    }
}

module.exports = MedicineService;
