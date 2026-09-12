const Chat = require("../Model/Chat");
const Medication = require("../Model/Medication");
const GeminiService = require("../Service/GeminiService");
const MedicationReminderAgent = require("../Service/MedicationReminderAgent");

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

        // Check Medication Reminder Agent first
        const reminderResult = MedicationReminderAgent.run(symptoms);
        let aiResponseText = "";
        let medicationAction = null;

        if (reminderResult.handled) {
            aiResponseText = reminderResult.response;
            medicationAction = reminderResult.medication || null;

            // Persist to MongoDB Medication collection
            if (reminderResult.action === "add_medication" && medicationAction && medicationAction.name && medicationAction.times) {
                const formattedName = medicationAction.name.trim().charAt(0).toUpperCase() + medicationAction.name.trim().slice(1);
                let med = await Medication.findOne({
                    userId,
                    name: { $regex: new RegExp(`^${formattedName}$`, 'i') }
                });

                if (med) {
                    const mergedTimes = Array.from(new Set([...med.times, ...medicationAction.times])).sort();
                    med.times = mergedTimes;
                    med.active = true;
                    await med.save();
                } else {
                    med = new Medication({
                        userId,
                        name: formattedName,
                        times: medicationAction.times.sort(),
                        active: true
                    });
                    await med.save();
                }
            } else if (reminderResult.action === "delete_medication" && medicationAction && medicationAction.name) {
                await Medication.findOneAndDelete({
                    userId,
                    name: { $regex: new RegExp(`^${medicationAction.name.trim()}$`, 'i') }
                });
            } else if (reminderResult.action === "clear_memory") {
                await Medication.deleteMany({ userId });
            }
        } else {
            // Call GeminiService for standard medical consultations
            try {
                aiResponseText = await GeminiService.chat(messageHistory);
            } catch (apiError) {
                console.error("Gemini API Error:", apiError);
                aiResponseText = "Sorry, I could not process that request at this time.";
            }
        }

        // Save AI response
        chat.messages.push({ role: 'ai', text: aiResponseText });
        await chat.save();

        res.json({
            chatId: chat._id,
            response: aiResponseText,
            medicationAction,
            action: reminderResult.action || null
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
