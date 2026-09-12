const Medication = require("../Model/Medication");

// 1. Get all medications and history for authenticated user
const getMedications = async (req, res) => {
    try {
        const userId = req.user.id;
        const medications = await Medication.find({ userId }).sort({ createdAt: 1 });
        
        let allDoseHistory = [];
        let allMissedDoses = [];

        medications.forEach(med => {
            if (med.doseHistory && med.doseHistory.length > 0) {
                allDoseHistory.push(...med.doseHistory);
            }
            if (med.missedDoses && med.missedDoses.length > 0) {
                allMissedDoses.push(...med.missedDoses);
            }
        });

        res.json({
            medications,
            doseHistory: allDoseHistory,
            missedDoses: allMissedDoses
        });
    } catch (error) {
        console.error("Get Medications Error:", error.message);
        res.status(500).json({ error: "Failed to fetch medications from database" });
    }
};

// 2. Add or update medication schedule
const addMedication = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, times } = req.body;

        if (!name || !times || !Array.isArray(times) || times.length === 0) {
            return res.status(400).json({ error: "Medicine name and at least one time are required" });
        }

        const formattedName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
        
        let med = await Medication.findOne({ 
            userId, 
            name: { $regex: new RegExp(`^${formattedName}$`, 'i') } 
        });

        if (med) {
            const mergedTimes = Array.from(new Set([...med.times, ...times])).sort();
            med.times = mergedTimes;
            med.active = true;
            await med.save();
        } else {
            med = new Medication({
                userId,
                name: formattedName,
                times: times.sort(),
                active: true
            });
            await med.save();
        }

        res.json({
            message: "Medication scheduled successfully",
            medication: med
        });
    } catch (error) {
        console.error("Add Medication Error:", error.message);
        res.status(500).json({ error: "Failed to save medication to database" });
    }
};

// 3. Mark dose as TAKEN
const markDoseTaken = async (req, res) => {
    try {
        const userId = req.user.id;
        const { doseKey, medName, time, date, takenAt } = req.body;

        if (!doseKey || !medName || !time) {
            return res.status(400).json({ error: "Dose details are required" });
        }

        const med = await Medication.findOne({
            userId,
            name: { $regex: new RegExp(`^${medName.trim()}$`, 'i') }
        });

        const record = {
            doseKey,
            medName: medName.trim(),
            time,
            date: date || new Date().toDateString(),
            takenAt: takenAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'taken'
        };

        if (med) {
            // Remove from missedDoses if present
            med.missedDoses = med.missedDoses.filter(m => m.doseKey !== doseKey);
            med.doseHistory.push(record);
            await med.save();
        } else {
            // Create medication container if doesn't exist
            const newMed = new Medication({
                userId,
                name: medName.trim(),
                times: [time],
                doseHistory: [record]
            });
            await newMed.save();
        }

        res.json({ message: "Dose marked as taken", record });
    } catch (error) {
        console.error("Mark Taken Error:", error.message);
        res.status(500).json({ error: "Failed to record dose completion" });
    }
};

// 4. Mark missed dose as TAKEN LATE
const markDoseLate = async (req, res) => {
    try {
        const userId = req.user.id;
        const { doseKey, medName, time, date, takenAt } = req.body;

        const med = await Medication.findOne({
            userId,
            name: { $regex: new RegExp(`^${medName.trim()}$`, 'i') }
        });

        const record = {
            doseKey,
            medName: medName.trim(),
            time,
            date: date || new Date().toDateString(),
            takenAt: takenAt || `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Late)`,
            status: 'taken_late'
        };

        if (med) {
            med.missedDoses = med.missedDoses.filter(m => m.doseKey !== doseKey);
            med.doseHistory.push(record);
            await med.save();
        }

        res.json({ message: "Dose recorded as taken late", record });
    } catch (error) {
        console.error("Take Late Error:", error.message);
        res.status(500).json({ error: "Failed to record late dose" });
    }
};

// 5. Record missed dose
const recordMissedDose = async (req, res) => {
    try {
        const userId = req.user.id;
        const { doseKey, medName, time, formatted12, date, missedAt } = req.body;

        const med = await Medication.findOne({
            userId,
            name: { $regex: new RegExp(`^${medName.trim()}$`, 'i') }
        });

        if (med) {
            const exists = med.missedDoses.some(m => m.doseKey === doseKey);
            if (!exists) {
                med.missedDoses.push({
                    doseKey,
                    medName: medName.trim(),
                    time,
                    formatted12,
                    date: date || new Date().toDateString(),
                    missedAt: missedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                await med.save();
            }
        }

        res.json({ message: "Missed dose recorded" });
    } catch (error) {
        console.error("Record Missed Error:", error.message);
        res.status(500).json({ error: "Failed to record missed dose" });
    }
};

// 6. Delete a specific medication
const deleteMedication = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        await Medication.findOneAndDelete({
            userId,
            $or: [
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
                { name: { $regex: new RegExp(`^${id.trim()}$`, 'i') } }
            ]
        });

        res.json({ message: "Medication deleted from database" });
    } catch (error) {
        console.error("Delete Medication Error:", error.message);
        res.status(500).json({ error: "Failed to delete medication" });
    }
};

// 7. Clear all medication memory & schedules for the user
const clearAllMedications = async (req, res) => {
    try {
        const userId = req.user.id;
        await Medication.deleteMany({ userId });
        res.json({ message: "All medication schedules and memory cleared from database" });
    } catch (error) {
        console.error("Clear All Error:", error.message);
        res.status(500).json({ error: "Failed to clear medication database" });
    }
};

module.exports = {
    getMedications,
    addMedication,
    markDoseTaken,
    markDoseLate,
    recordMissedDose,
    deleteMedication,
    clearAllMedications
};
