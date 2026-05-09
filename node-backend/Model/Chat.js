const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'ai'],
        required: true
    },
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const ChatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    messages: [MessageSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model("Chat", ChatSchema);