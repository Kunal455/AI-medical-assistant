const express = require("express");
const Router = express.Router();
const authMiddleware = require("../Middleware/AuthMiddleware");
const {
    getMedications,
    addMedication,
    markDoseTaken,
    markDoseLate,
    recordMissedDose,
    deleteMedication,
    clearAllMedications
} = require("../Controller/MedicationController");

// All medication routes protected by authMiddleware
Router.use(authMiddleware);

Router.get("/", getMedications);
Router.post("/", addMedication);
Router.post("/taken", markDoseTaken);
Router.post("/take-late", markDoseLate);
Router.post("/missed", recordMissedDose);
Router.delete("/clear-all", clearAllMedications);
Router.delete("/:id", deleteMedication);

module.exports = Router;
