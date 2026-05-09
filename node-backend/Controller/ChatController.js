const Chat = require("../Model/Chat");
const GeminiService = require("../Service/GeminiService");

const chatWithAI = async (req, res) => {
    try {
        const { symptoms, chatId } = req.body;
        
        if (!symptoms) {
            return res.status(400).json({ error: "Symptoms are required" });
        }

        const userId = req.user.id;
        let chat;
        let messageHistory = [];

        if (chatId) {
            chat = await Chat.findOne({ _id: chatId, userId });
            if (!chat) {
                return res.status(404).json({ error: "Chat not found" });
            }
            
            // Map previous messages
            messageHistory = chat.messages.map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.text
            }));
            
            chat.messages.push({ role: 'user', text: symptoms });
        } else {
            const title = symptoms.length > 30 ? symptoms.substring(0, 30) + "..." : symptoms;
            chat = new Chat({
                userId,
                title,
                messages: [
                    { role: 'user', text: symptoms }
                ]
            });
        }

        // Add current user message to history
        messageHistory.push({ role: 'user', content: symptoms });

        // Call GeminiService
        let aiResponseText = "";
        try {
            aiResponseText = await GeminiService.chat(messageHistory);
        } catch (apiError) {
            console.error("Gemini API Error:", apiError);
            aiResponseText = "Sorry, I could not process that request at this time.";
        }

        // Save AI response
        chat.messages.push({ role: 'ai', text: aiResponseText });
        await chat.save();

        res.json({
            chatId: chat._id,
            response: aiResponseText
        });
    } catch (error) {
        console.error("Chat Error:", error.message);
        res.status(500).json({ error: "Failed to communicate with AI service" });
    }
};

const getChatHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await Chat.find({ userId }).select('_id title updatedAt').sort({ updatedAt: -1 });
        res.json(history);
    } catch (error) {
        console.error("History Error:", error.message);
        res.status(500).json({ error: "Failed to fetch chat history" });
    }
};

const getChatDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const chatId = req.params.id;
        const chat = await Chat.findOne({ _id: chatId, userId });
        
        if (!chat) {
            return res.status(404).json({ error: "Chat not found" });
        }
        
        res.json(chat);
    } catch (error) {
        console.error("Chat Details Error:", error.message);
        res.status(500).json({ error: "Failed to fetch chat details" });
    }
};

module.exports = {
    chatWithAI,
    getChatHistory,
    getChatDetails
};
