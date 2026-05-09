const express = require("express");
const Router = express.Router();
const { chatWithAI, getChatHistory, getChatDetails } = require("../Controller/ChatController");
const authMiddleware = require("../Middleware/AuthMiddleware");

// Protect the chat route with authMiddleware
Router.post("/", authMiddleware, chatWithAI);
Router.get("/", authMiddleware, getChatHistory);
Router.get("/:id", authMiddleware, getChatDetails);

module.exports = Router;