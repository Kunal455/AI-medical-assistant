const express = require("express");
const Router = express.Router();
const multer = require("multer");
const fs = require("fs");
const MedicalController = require("../Controller/MedicalController");

// Ensure uploads directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Config
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

// Routes
Router.post("/upload-report", upload.single("file"), MedicalController.uploadReport);
Router.post("/analyze-symptoms", MedicalController.analyzeSymptoms);
Router.get("/medicine/:name", MedicalController.getMedicine);
Router.post("/chat", MedicalController.chat);

module.exports = Router;
