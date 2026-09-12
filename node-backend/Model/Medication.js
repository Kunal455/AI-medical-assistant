const mongoose = require("mongoose");

const DoseHistorySchema = new mongoose.Schema({
    doseKey: {
        type: String,
        required: true
    },
    medName: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    takenAt: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['taken', 'taken_late'],
        default: 'taken'
    }
}, { _id: false });

const MissedDoseSchema = new mongoose.Schema({
    doseKey: {
        type: String,
        required: true
    },
    medName: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    formatted12: {
        type: String
    },
    date: {
        type: String,
        required: true
    },
    missedAt: {
        type: String
    }
}, { _id: false });

const MedicationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    times: {
        type: [String],
        required: true,
        default: []
    },
    active: {
        type: Boolean,
        default: true
    },
    doseHistory: [DoseHistorySchema],
    missedDoses: [MissedDoseSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model("Medication", MedicationSchema);
