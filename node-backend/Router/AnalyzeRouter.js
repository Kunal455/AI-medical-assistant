const express = require("express");
const Router = express.Router();
const multer = require("multer");
const fs = require("fs");

const {
    analyzeReport,
    analyzePrescription,
    analyzeMedicine,
    analyzeDiet
} = require("../Controller/AnalyzeController");

// Ensure uploads directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

Router.post("/report", upload.single("file"), analyzeReport);
Router.post("/prescription", upload.single("file"), analyzePrescription);
Router.post("/medicine", analyzeMedicine);
Router.post("/diet", analyzeDiet);

module.exports = Router;
