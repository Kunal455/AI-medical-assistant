require("dotenv").config();

const express = require("express");

const cors = require("cors");

const cookieParser = require("cookie-parser");

const connectDB = require("./Config/db");

const UserRouter = require("./Router/UserRouter");
const MedicalRouter = require("./Router/MedicalRouter");
const ChatRouter = require("./Router/ChatRouter");
const AnalyzeRouter = require("./Router/AnalyzeRouter");

const app = express();

// ================= MIDDLEWARE =================
app.use(
  cors({
    origin: [
        "http://localhost:3000",
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ================= DATABASE =================
connectDB();

// ================= ROUTES =================
app.use("/api/v1/user", UserRouter);
app.use("/api/v1/medical", MedicalRouter);
app.use("/api/v1/chat", ChatRouter);
app.use("/api/v1/analyze", AnalyzeRouter);



// ================= SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Node server running on port ${PORT}`);
});