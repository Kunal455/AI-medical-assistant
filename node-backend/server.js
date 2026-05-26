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
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
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

app.listen(5000, ()=>{

    console.log("Node server running on port 5000");
});