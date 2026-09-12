/**
 * Medication Reminder Agent (T19) for MedAssist backend.
 * Direct JavaScript implementation of the Plan-Act-Observe Medication Reminder Agent.
 */

class MedicationReminderAgent {
    constructor() {
        this.pending = {};
        this.medicines = [];
        this.history = [];
    }

    setPending(intent, partial) {
        this.pending = { intent, partial };
    }

    getPending() {
        return Object.keys(this.pending).length > 0 ? { ...this.pending } : null;
    }

    clearPending() {
        this.pending = {};
    }

    detectIntent(text) {
        const t = text.toLowerCase();
        if (/\b(clear memory|reset memory|clear reminders|reset all|clear all|clean memory)\b/i.test(t)) {
            return 'CLEAR_MEMORY';
        }
        if (/\b(delete|remove|cancel)\b/i.test(t) && /\b(medicine|medication|dose|drug|pill|reminder)\b/i.test(t)) {
            return 'DELETE';
        }
        if (/\b(miss|missed|check my schedule|check schedule|what.*next|next dose|next medicine|when (should|do) i|what is due|what medicine|what should i take|what is urgent|which.*urgent|most urgent|my schedule|list medications)\b/i.test(t)) {
            return 'CHECK_SCHEDULE';
        }
        if (/\b(add|set|create|schedule|i (need to |want to |have to )?take|i am taking|put|remind me|start|also add|quick dose)\b/i.test(t)) {
            return 'ADD';
        }
        return 'UNKNOWN';
    }

    extractTimes(text) {
        const t = text.toLowerCase();
        const times = new Set();

        // 1. Colon check for invalid values (e.g. 24:00, 25:99, hour >= 24, minute >= 60)
        const colonMatches = [...t.matchAll(/\b(\d{1,2}):(\d{2})\b/g)];
        for (const match of colonMatches) {
            const h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            if (h >= 24 || m >= 60) {
                return ['INVALID_TIME'];
            }
        }

        // 2. Quick dose / right now
        if (/\b(quick dose|right now|dose for now|now)\b/i.test(t)) {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            times.add(`${h}:${m}`);
            return Array.from(times);
        }

        // 3. 4-digit military times (e.g. 2341pm, 2341, 0930am, 0930)
        const digit4Matches = [...t.matchAll(/\b([012]\d)([0-5]\d)\s*(am|pm)?\b/gi)];
        for (const match of digit4Matches) {
            let h = parseInt(match[1], 10);
            const m = match[2];
            const ap = match[3] ? match[3].toLowerCase() : null;
            if (ap === 'pm' && h < 12) h += 12;
            if (ap === 'am' && h === 12) h = 0;
            if (h >= 0 && h <= 23) {
                times.add(`${String(h).padStart(2, '0')}:${m}`);
            }
        }

        // 4. Standard 12h with colon and am/pm (e.g. 1:30 pm, 09:30 am)
        const match12 = [...t.matchAll(/\b(1[0-2]|0?[1-9]):([0-5]\d)\s*(am|pm)\b/gi)];
        for (const match of match12) {
            let h = parseInt(match[1], 10);
            const mn = match[2];
            const ap = match[3].toLowerCase();
            if (ap === 'pm' && h !== 12) h += 12;
            if (ap === 'am' && h === 12) h = 0;
            times.add(`${String(h).padStart(2, '0')}:${mn}`);
        }

        // 5. Simple hour with am/pm (e.g. 8am, 8pm, 11pm)
        const matchSimple = [...t.matchAll(/(?<!:)\b(1[0-2]|0?[1-9])\s*(am|pm)\b/gi)];
        for (const match of matchSimple) {
            let h = parseInt(match[1], 10);
            const ap = match[2].toLowerCase();
            if (ap === 'pm' && h !== 12) h += 12;
            if (ap === 'am' && h === 12) h = 0;
            times.add(`${String(h).padStart(2, '0')}:00`);
        }

        // 6. Standard 24h with colon (e.g. 08:00, 20:00, 23:41)
        const match24 = [...t.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b(?!\s*(am|pm))/gi)];
        for (const match of match24) {
            const h = parseInt(match[1], 10);
            const mn = match[2];
            times.add(`${String(h).padStart(2, '0')}:${mn}`);
        }

        return Array.from(times).sort();
    }

    extractName(text) {
        let t = text.trim();

        // Special case: "Medicine A", "Medicine 1"
        const mSpec = t.match(/\bmedicine\s+([A-Za-z0-9])\b/i);
        if (mSpec) {
            return `Medicine ${mSpec[1].toUpperCase()}`;
        }

        // Match pattern: "add paracetamol at 9pm"
        const m2 = t.match(/(?:add|also add|take|remind me to take)\s+(?:my\s+)?(?:medicine\s+)?([^,\.]+?)\s+at\s+\d/i);
        if (m2) {
            return this.titleCase(m2[1].trim());
        }

        const removePrefixes = [
            /^(add|set|create|schedule|register|please\s+add|can you add|could you add|also\s+add)\s+/i,
            /^(remind me to take|i need to take|i want to take|i have to take|i take|i am taking)\s+/i,
            /^(my medicine is|my medication is|put|start)\s+/i,
            /^(add my medicine|add my medication|add a medicine|add a medication|also add my)\s+/i,
            /^(my|a|an|the)\s+/i,
        ];

        for (const p of removePrefixes) {
            t = t.replace(p, '').trim();
        }

        t = t.replace(/\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?/gi, '');
        t = t.replace(/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/gi, '');
        t = t.replace(/\b\d{1,2}:\d{2}\b/gi, '');
        t = t.replace(/\b([012]\d)([0-5]\d)\s*(am|pm)?\b/gi, '');
        t = t.replace(/\band\b/gi, '');
        t = t.replace(/\bevery\s+day\b|\bdaily\b/gi, '');
        t = t.replace(/\b(medication|drug|pill|tablet|cap|capsule|dose|reminder|my|the|a|an|please|from|to|for|right now|now|quick dose)\b/gi, '');
        t = t.replace(/^\s*medicine\s+/i, '');
        t = t.replace(/\s+/g, ' ').trim();
        t = t.replace(/^[\s\-.,;:]+|[\s\-.,;:]+$/g, '');

        const stopwords = new Set(['at', 'on', 'for', 'to', 'in', 'daily', 'every', 'day', 'time', 'pm', 'am', 'now', 'today', 'quick', 'dose']);
        if (t && !stopwords.has(t.toLowerCase()) && /^[A-Za-z]/.test(t) && t.length >= 1 && t.length <= 60) {
            return this.titleCase(t);
        }
        return null;
    }

    titleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    run(userMessage) {
        const msgClean = userMessage.trim().replace(/^["']|["']$/g, '');

        // 1. Safety Keywords Check
        const safetyKws = ['how much should i take', 'is it safe to take', 'overdose', 'side effects', 'can i take too much', 'safe dose', 'recommended dose'];
        if (safetyKws.some(k => msgClean.toLowerCase().includes(k))) {
            return {
                handled: true,
                action: 'safety',
                response: 'This application provides medication scheduling and reminders only. It does not provide medical advice, diagnosis, or dosage recommendations.'
            };
        }

        // 2. Clear Memory
        if (/\b(clear memory|reset memory|clear reminders|reset all|clear all|clean memory)\b/i.test(msgClean)) {
            this.clearPending();
            this.medicines = [];
            return {
                handled: true,
                action: 'clear_memory',
                response: '🧹 All medication memory and schedules have been cleared.'
            };
        }

        // 3. Multi-turn Pending State Handling
        const pending = this.getPending();
        if (pending && pending.intent === 'ADD') {
            const partial = pending.partial || {};
            const timesCandidate = this.extractTimes(msgClean);
            const nameCandidate = this.extractName(msgClean);

            if (timesCandidate && timesCandidate.length > 0) {
                this.clearPending();
                if (timesCandidate.includes('INVALID_TIME')) {
                    return {
                        handled: true,
                        action: 'error',
                        response: '❌ Invalid time. Please enter a valid time between 00:00 and 23:59.'
                    };
                }
                const medName = partial.name || nameCandidate || 'Medication';
                const timesFmt = timesCandidate.join(', ');
                return {
                    handled: true,
                    action: 'add_medication',
                    medication: { name: medName, times: timesCandidate },
                    response: `Added **${medName}** with scheduled times at **${timesFmt}**. Let me know if you'd like to see upcoming doses or add another medication!`
                };
            } else if (!partial.name && nameCandidate) {
                this.clearPending();
                this.setPending('ADD', { name: nameCandidate, times: [] });
                return {
                    handled: true,
                    action: 'clarify',
                    response: `What time should I add ${nameCandidate} to your schedule?`
                };
            } else if (this.detectIntent(msgClean) !== 'UNKNOWN' || /what|why|who|where|how|check|schedule|dose/i.test(msgClean)) {
                this.clearPending();
            } else {
                this.clearPending();
                return {
                    handled: true,
                    action: 'unsupported',
                    response: 'I can only do two things:\n1. Add a medicine with its name and time (e.g., \'Add Aspirin at 08:00 and 20:00\')\n2. Check your schedule (e.g., \'Check my schedule\' or \'What is my next dose?\')'
                };
            }
        }

        const intent = this.detectIntent(msgClean);

        if (intent === 'ADD') {
            const times = this.extractTimes(msgClean);
            if (times.includes('INVALID_TIME')) {
                return {
                    handled: true,
                    action: 'error',
                    response: '❌ Invalid time. Please enter a valid time between 00:00 and 23:59.'
                };
            }

            let name = this.extractName(msgClean);
            if (/\b(quick dose|dose for now|right now)\b/i.test(msgClean) && !name) {
                name = 'Paracetamol';
            }

            if (!name) {
                this.setPending('ADD', { name: null, times });
                return {
                    handled: true,
                    action: 'clarify',
                    response: "What is the name of the medicine you'd like to add?"
                };
            }

            if (!times || times.length === 0) {
                this.setPending('ADD', { name, times: [] });
                return {
                    handled: true,
                    action: 'clarify',
                    response: `What time should I add ${name} to your schedule?`
                };
            }

            const timesFmt = times.join(', ');
            return {
                handled: true,
                action: 'add_medication',
                medication: { name, times },
                response: `Added **${name}** with scheduled times at **${timesFmt}**. Let me know if you'd like to see upcoming doses or add another medication!`
            };
        }

        if (intent === 'CHECK_SCHEDULE') {
            return {
                handled: true,
                action: 'check_schedule',
                response: 'Checking your medication schedule now...'
            };
        }

        if (intent === 'DELETE') {
            const name = this.extractName(msgClean);
            if (name) {
                return {
                    handled: true,
                    action: 'delete_medication',
                    medication: { name },
                    response: `Removed **${name}** from your medication reminder schedule.`
                };
            }
        }

        return {
            handled: false
        };
    }
}

module.exports = new MedicationReminderAgent();
