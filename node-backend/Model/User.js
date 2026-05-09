const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({

    name: {

        type: String,

        required: [true, "Name is required"],

        trim: true,

        minlength: [3, "Name must be at least 3 characters"],

        maxlength: [30, "Name too long"]
    },

    email: {

        type: String,

        required: [true, "Email is required"],

        unique: true,

        lowercase: true,

        trim: true,

        match: [
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            "Please enter a valid email address"
        ]
    },

    password: {

        type: String,

        required: [true, "Password is required"],

        minlength: [6, "Password must be at least 6 characters"]
    },

    createdAt: {

        type: Date,

        default: Date.now
    }
});

module.exports = mongoose.model("User", UserSchema);