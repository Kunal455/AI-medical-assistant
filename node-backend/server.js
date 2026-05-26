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
const allowedOrigins = [
    "http://localhost:3000",
    process.env.FRONTEND_URL
].filter(Boolean).map(url => url.replace(/\/$/, ""));

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(cleanOrigin) || cleanOrigin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        console.error(`CORS Blocked: Origin ${origin} is not in allowed origins:`, allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
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