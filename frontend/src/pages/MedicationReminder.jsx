import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { API_BASE_URL } from "../config";

function MedicationReminder() {
  const navigate = useNavigate();

  // Auth guard: strictly allow access only after login
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/user/profile`, {
          credentials: "include"
        });
        if (res.status === 401 || !res.ok) {
          navigate("/login");
        }
      } catch (err) {
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [schedules, setSchedules] = useState(() => {
    const saved = localStorage.getItem("medassist_schedules");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse saved schedules", e);
      }
    }
    const now = new Date();
    const currH = String(now.getHours()).padStart(2, "0");
    const currM = String(now.getMinutes()).padStart(2, "0");
    return [
      { id: "1", name: "Paracetamol", times: [`${currH}:${currM}`], active: true },
      { id: "2", name: "Thicolochine", times: ["21:30"], active: true },
      { id: "3", name: "D", times: ["21:34"], active: true }
    ];
  });

  const [doseHistory, setDoseHistory] = useState(() => {
    const saved = localStorage.getItem("medassist_dose_history");
    return saved ? JSON.parse(saved) : [];
  });

  const [missedDoses, setMissedDoses] = useState(() => {
    const saved = localStorage.getItem("medassist_missed_doses");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        key: "Paracetamol-21:00-demo",
        medName: "Paracetamol",
        time: "21:00",
        formatted12: "09:00 PM",
        date: new Date().toDateString()
      }
    ];
  });

  const [activeReminders, setActiveReminders] = useState([]);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const [messages, setMessages] = useState([
    {
      id: "init-1",
      role: "ai",
      text: "👋 Hello! I am your **MedAssist Medication Reminder Agent**.\n\nYou can tell me what medications to track (e.g. *\"Add paracetamol at 9pm\"* or *\"Add Amoxicillin at 08:00 and 20:00\"*), ask *\"What is my next dose?\"*, or check your schedule anytime."
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedTime, setNewMedTime] = useState("");

  const chatEndRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("medassist_schedules", JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem("medassist_dose_history", JSON.stringify(doseHistory));
  }, [doseHistory]);

  useEffect(() => {
    localStorage.setItem("medassist_missed_doses", JSON.stringify(missedDoses));
  }, [missedDoses]);

  const playChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMinutes = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const currentSeconds = now.getSeconds();
      const currentRemaining = 60 - currentSeconds;
      setSecondsRemaining(currentRemaining);

      const todayDateStr = now.toDateString();
      const dueRightNow = [];

      schedules.forEach((med) => {
        if (!med.active) return;
        med.times.forEach((timeStr) => {
          const doseKey = `${med.name}-${timeStr}-${todayDateStr}`;

          const alreadyTaken = doseHistory.some((item) => item.key === doseKey);
          const alreadyMissed = missedDoses.some((item) => item.key === doseKey);

          if (timeStr === currentTimeStr && !alreadyTaken && !alreadyMissed) {
            const [h, m] = timeStr.split(":").map(Number);
            const ampm = h >= 12 ? "PM" : "AM";
            const h12 = String(h % 12 || 12).padStart(2, "0");
            const time12Str = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;

            dueRightNow.push({
              key: doseKey,
              medId: med.id,
              medName: med.name,
              time: timeStr,
              formatted12: time12Str,
              dueAt: now
            });
          }

          const [schH, schM] = timeStr.split(":").map(Number);
          const scheduledDate = new Date(now);
          scheduledDate.setHours(schH, schM, 59, 999);

          if (now > scheduledDate && !alreadyTaken && !alreadyMissed) {
            const ampm = schH >= 12 ? "PM" : "AM";
            const h12 = String(schH % 12 || 12).padStart(2, "0");
            const time12Str = `${h12}:${String(schM).padStart(2, "0")} ${ampm}`;

            setMissedDoses((prev) => [
              ...prev,
              {
                key: doseKey,
                medName: med.name,
                time: timeStr,
                formatted12: time12Str,
                date: todayDateStr,
                missedAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }
        });
      });

      if (dueRightNow.length > 0) {
        setActiveReminders(dueRightNow);
        if (currentSeconds === 0 || currentSeconds === 1) {
          playChime();
        }
      } else {
        setActiveReminders([]);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [schedules, doseHistory, missedDoses]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMarkTaken = (reminder) => {
    const now = new Date();
    const todayDateStr = now.toDateString();
    const doseKey = reminder.key || `${reminder.medName}-${reminder.time}-${todayDateStr}`;

    setDoseHistory((prev) => [
      ...prev,
      {
        key: doseKey,
        medName: reminder.medName,
        time: reminder.time,
        takenAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: todayDateStr
      }
    ]);

    setActiveReminders((prev) => prev.filter((r) => r.key !== doseKey));

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "system",
        text: `✓ Confirmed: Marked **${reminder.medName}** (${reminder.time}) as **TAKEN** at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
      }
    ]);
  };

  const handleTakeLate = (missedItem) => {
    const now = new Date();
    const todayDateStr = now.toDateString();

    setDoseHistory((prev) => [
      ...prev,
      {
        key: missedItem.key,
        medName: missedItem.medName,
        time: missedItem.time,
        takenAt: `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Late)`,
        date: todayDateStr
      }
    ]);

    setMissedDoses((prev) => prev.filter((m) => m.key !== missedItem.key));
  };

  const handleClearMemory = () => {
    setSchedules([]);
    setDoseHistory([]);
    setMissedDoses([]);
    setActiveReminders([]);
    localStorage.removeItem("medassist_schedules");
    localStorage.removeItem("medassist_dose_history");
    localStorage.removeItem("medassist_missed_doses");

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "system",
        text: "🧹 All medication memory and active schedules have been cleared."
      }
    ]);
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      processNaturalLanguageCommand(text);
      setIsTyping(false);
    }, 400);
  };

  const processNaturalLanguageCommand = (rawText) => {
    const lower = rawText.toLowerCase();

    if (lower.includes("clear memory") || lower.includes("reset all") || lower.includes("clear all")) {
      handleClearMemory();
      return;
    }

    if (lower.includes("quick dose") || lower.includes("dose for now") || lower.includes("right now")) {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const timeStr = `${h}:${m}`;
      
      let name = "Paracetamol";
      const nameMatch = lower.match(/add (?:quick dose for |medicine |dose for )?([a-zA-Z0-9\s]+?)(?: at| right now| now|$)/i);
      if (nameMatch && nameMatch[1] && !nameMatch[1].includes("now") && !nameMatch[1].includes("dose")) {
        name = nameMatch[1].trim();
      }

      const newMed = {
        id: Date.now().toString(),
        name: name.charAt(0).toUpperCase() + name.slice(1),
        times: [timeStr],
        active: true
      };

      setSchedules((prev) => [...prev, newMed]);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: `Added **${newMed.name}** with scheduled time **${timeStr}** (Due right now!). The active reminder banner is now active.`
        }
      ]);
      return;
    }

    if (lower.includes("next dose") || lower.includes("what is next") || lower.includes("upcoming dose")) {
      const now = new Date();
      const currentMinutesToday = now.getHours() * 60 + now.getMinutes();

      let nextDoseInfo = null;
      let minDiff = Infinity;

      schedules.forEach((med) => {
        med.times.forEach((t) => {
          const [h, m] = t.split(":").map(Number);
          const doseMinutes = h * 60 + m;
          let diff = doseMinutes - currentMinutesToday;
          if (diff <= 0) {
            diff += 24 * 60;
          }
          if (diff < minDiff) {
            minDiff = diff;
            nextDoseInfo = {
              name: med.name,
              time: t,
              diffHours: Math.floor(diff / 60),
              diffMins: diff % 60,
              isTomorrow: doseMinutes <= currentMinutesToday
            };
          }
        });
      });

      if (!nextDoseInfo) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "ai",
            text: "You currently have no scheduled doses. You can add one anytime by typing e.g., *\"Add Paracetamol at 21:00\"*."
          }
        ]);
      } else {
        const timeRemainingStr = nextDoseInfo.diffHours > 0 
          ? `${nextDoseInfo.diffHours}h ${nextDoseInfo.diffMins}m`
          : `${nextDoseInfo.diffMins} minute${nextDoseInfo.diffMins === 1 ? '' : 's'}`;

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "ai",
            text: `Your next scheduled dose is **${nextDoseInfo.name}** at **${nextDoseInfo.time}** (${nextDoseInfo.isTomorrow ? 'Tomorrow' : 'Today'}, in **${timeRemainingStr}**).`
          }
        ]);
      }
      return;
    }

    if (lower.includes("check my schedule") || lower.includes("schedule") || lower.includes("list") || lower.includes("my medicines")) {
      if (schedules.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "ai",
            text: "Your medication schedule is currently empty. Add a dose by saying *\"Add [Medicine] at [Time]\"*."
          }
        ]);
      } else {
        let scheduleText = "### 📋 Your Current Medication Schedule:\n\n";
        schedules.forEach((med) => {
          scheduleText += `- **${med.name}**: ${med.times.join(", ")}\n`;
        });
        scheduleText += `\n*Total scheduled medications: ${schedules.length}*`;
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "ai",
            text: scheduleText
          }
        ]);
      }
      return;
    }

    const addMatch = lower.match(/(?:add|remind me to take|schedule)\s+(?:medicine\s+|drug\s+)?([a-zA-Z0-9\s]+?)\s+(?:at|every)\s+([0-9ap\s,.:and]+)/i);

    if (addMatch) {
      const rawMedName = addMatch[1].trim();
      const rawTimeString = addMatch[2].trim();
      const formattedName = rawMedName.charAt(0).toUpperCase() + rawMedName.slice(1);
      const times = parseTimesFromString(rawTimeString);

      if (times.length > 0) {
        setSchedules((prev) => {
          const existingIndex = prev.findIndex(
            (m) => m.name.toLowerCase() === formattedName.toLowerCase()
          );
          if (existingIndex >= 0) {
            const updated = [...prev];
            const mergedTimes = Array.from(new Set([...updated[existingIndex].times, ...times])).sort();
            updated[existingIndex] = { ...updated[existingIndex], times: mergedTimes };
            return updated;
          } else {
            return [
              ...prev,
              {
                id: Date.now().toString(),
                name: formattedName,
                times: times.sort(),
                active: true
              }
            ];
          }
        });

        const timesFormatted = times.map((t) => `**${t}**`).join(" and ");
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "ai",
            text: `Added **${formattedName}** with scheduled times at ${timesFormatted}. Let me know if you'd like to see upcoming doses or add another medication!`
          }
        ]);
        return;
      }
    }

    const deleteMatch = lower.match(/(?:delete|remove|cancel)\s+(?:medicine\s+|drug\s+)?([a-zA-Z0-9\s]+)/i);
    if (deleteMatch) {
      const targetName = deleteMatch[1].trim().toLowerCase();
      const exists = schedules.some((m) => m.name.toLowerCase() === targetName);
      if (exists) {
        setSchedules((prev) => prev.filter((m) => m.name.toLowerCase() !== targetName));
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "ai",
            text: `Removed **${targetName}** from your medication reminder schedule.`
          }
        ]);
        return;
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: `I understood: *"${rawText}"*.\n\nYou can manage reminders using commands like:\n- **"Add Paracetamol at 09:00 and 21:00"**\n- **"Add Quick Dose for Now"**\n- **"What is my next dose?"**\n- **"Check my schedule"**\n- **"Clear memory"**`
      }
    ]);
  };

  const parseTimesFromString = (str) => {
    const times = [];
    const clean = str.toLowerCase().replace(/at|and|,/g, " ");

    // 1. Match 4-digit times with optional am/pm (e.g. 2341pm, 2341, 0930am, 0930)
    const match4Digit = clean.match(/\b([012]\d)([0-5]\d)\s*(am|pm)?\b/gi);
    if (match4Digit) {
      match4Digit.forEach(t => {
        const m = t.match(/(\d{2})(\d{2})\s*(am|pm)?/i);
        if (m) {
          let h = parseInt(m[1], 10);
          const min = m[2];
          const ampm = m[3] ? m[3].toLowerCase() : null;
          if (ampm === "pm" && h < 12) h += 12;
          if (ampm === "am" && h === 12) h = 0;
          if (h >= 0 && h <= 23) {
            times.push(`${String(h).padStart(2, "0")}:${min}`);
          }
        }
      });
    }

    // 2. Match standard 12h/24h times with colons (e.g. 23:41, 11:41pm, 9:00 am, 9:30pm)
    const matchColon = clean.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi);
    if (matchColon) {
      matchColon.forEach(t => {
        const m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
        if (m) {
          let h = parseInt(m[1], 10);
          const min = m[2];
          const ampm = m[3] ? m[3].toLowerCase() : null;
          if (ampm === "pm" && h < 12) h += 12;
          if (ampm === "am" && h === 12) h = 0;
          if (h >= 0 && h <= 23) {
            times.push(`${String(h).padStart(2, "0")}:${min}`);
          }
        }
      });
    }

    // 3. Match simple hour with am/pm (e.g. 9pm, 8am, 11pm)
    const matchSimple = clean.match(/\b(\d{1,2})\s*(am|pm)\b/gi);
    if (matchSimple) {
      matchSimple.forEach(t => {
        const m = t.match(/(\d{1,2})\s*(am|pm)/i);
        if (m) {
          let h = parseInt(m[1], 10);
          const ampm = m[2].toLowerCase();
          if (ampm === "pm" && h < 12) h += 12;
          if (ampm === "am" && h === 12) h = 0;
          if (h >= 0 && h <= 23) {
            times.push(`${String(h).padStart(2, "0")}:00`);
          }
        }
      });
    }

    return Array.from(new Set(times));
  };

  const getNextDueDoses = () => {
    const now = currentTime;
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const list = [];

    schedules.forEach((med) => {
      med.times.forEach((t) => {
        const [h, m] = t.split(":").map(Number);
        const doseMins = h * 60 + m;
        if (doseMins > currentMins) {
          const diff = doseMins - currentMins;
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = String(h % 12 || 12).padStart(2, "0");
          const time12 = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;

          list.push({
            name: med.name,
            time: t,
            time12,
            diffMinutes: diff,
            diffFormatted: diff > 60 ? `in ${Math.floor(diff / 60)}h ${diff % 60}m` : `in ${diff}m`,
            key: `${med.name}-${t}-${now.toDateString()}`
          });
        }
      });
    });

    return list.sort((a, b) => a.diffMinutes - b.diffMinutes);
  };

  const nextDueList = getNextDueDoses();
  const earliestNext = nextDueList.length > 0 ? nextDueList[0].time : null;

  const hours = currentTime.getHours();
  const minutes = String(currentTime.getMinutes()).padStart(2, "0");
  const seconds = String(currentTime.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = String(hours % 12 || 12).padStart(2, "0");
  const formattedLiveClock = `${displayHours}:${minutes}:${seconds} ${ampm}`;
  const formatted24H = `${String(hours).padStart(2, "0")}:${minutes}`;

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });

  const handleAddManualSchedule = (e) => {
    e.preventDefault();
    if (!newMedName.trim() || !newMedTime.trim()) return;

    const formattedName = newMedName.trim().charAt(0).toUpperCase() + newMedName.trim().slice(1);
    const newMed = {
      id: Date.now().toString(),
      name: formattedName,
      times: [newMedTime],
      active: true
    };

    setSchedules((prev) => [...prev, newMed]);
    setNewMedName("");
    setNewMedTime("");
    setShowAddModal(false);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "ai",
        text: `Manually added **${formattedName}** at **${newMedTime}** to your reminder schedule.`
      }
    ]);
  };

  return (
    <div className="min-h-screen bg-[#090507] text-white flex flex-col font-sans selection:bg-red-500/30">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 md:px-8 py-4 border-b border-white/5 bg-[#090507] gap-4 md:gap-0">
        <div className="flex items-center gap-3.5">
          {/* Brand Icon Badge */}
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-[#e87a71] shadow-[0_0_15px_rgba(193,48,36,0.3)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
              <path d="m8.5 8.5 7 7"/>
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-bold text-lg md:text-xl text-white tracking-tight">
                MedAssist - Medication Reminder Agent
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/80 border border-red-500/40 text-[#e87a71] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c13024] animate-pulse"></span>
                CSE476 • Live Reminders
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">
              1-Min Active Reminders • Next Due • Missed Detection • In-Memory Architecture
            </p>
          </div>
        </div>

        {/* Right Header: Digital Clock & Clear Memory */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="bg-[#130f11] border border-red-900/30 px-4 py-2 rounded-xl flex items-center gap-3 shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c13024] animate-pulse"></span>
            <div>
              <div className="font-mono font-bold text-sm text-[#e87a71] tracking-wider">
                {formattedLiveClock}
              </div>
              <div className="text-[10px] text-gray-500">
                {formattedDate} • Live System Clock
              </div>
            </div>
          </div>

          <button
            onClick={handleClearMemory}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-xs font-medium text-gray-300 transition-all active:scale-95"
            title="Clear all stored medication schedules"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M8 16H3v5"/>
            </svg>
            Clear Memory
          </button>

          <Link
            to="/tools"
            className="px-3.5 py-2.5 bg-[#c13024] hover:bg-[#a6251a] rounded-xl text-xs font-semibold text-white transition-all shadow-[0_0_12px_rgba(193,48,36,0.3)] flex items-center gap-1"
          >
            All Tools
          </Link>
        </div>
      </header>

      {/* ACTIVE REMINDER (DUE NOW) TOP BANNER */}
      {activeReminders.length > 0 && (
        <div className="bg-gradient-to-r from-[#1c080d] via-[#14080b] to-[#0c0406] border-b border-[#c13024]/60 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_4px_25px_rgba(193,48,36,0.3)]">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-[#e87a71] shadow-[0_0_15px_rgba(193,48,36,0.3)] animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-red-950/90 text-[#e87a71] border border-red-500/40 font-bold text-[10px] rounded tracking-wide">
                  ACTIVE REMINDER (DUE NOW)
                </span>
                <span className="font-semibold text-white text-sm md:text-base">
                  Time to take: <strong className="text-[#e87a71]">{activeReminders[0].medName}</strong> at {activeReminders[0].time}
                </span>
              </div>
              <p className="text-xs text-red-200/70 mt-0.5 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Reminder active for 1 minute: <strong className="text-red-400">{secondsRemaining}s</strong> remaining before marked as missed!
              </p>
            </div>
          </div>

          <button
            onClick={() => handleMarkTaken(activeReminders[0])}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#c13024] hover:bg-[#a6251a] active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(193,48,36,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            TAKEN
          </button>
        </div>
      )}

      {/* Main Grid: Left Chat Area & Right Schedule Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Column: Natural Language Agent Chat Interface (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-[#130f11] border border-white/5 rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden">
          {/* Disclaimer Banner */}
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between text-xs text-red-200/90">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#e87a71] flex-shrink-0">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span><strong>Reminder Only:</strong> This agent tracks schedules and does not provide medical advice or alter dosages.</span>
            </div>
            <span className="text-[10px] text-gray-500 italic hidden sm:inline">(Reminder tracking only -- not medical advice.)</span>
          </div>

          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-white/10 min-h-[340px] max-h-[500px]">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col">
                {msg.role === "system" ? (
                  <div className="self-start bg-red-950/30 border border-red-900/40 text-red-200/90 text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-2 my-1">
                    <span>⚡</span>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : msg.role === "user" ? (
                  <div className="self-end bg-[#c13024] text-white border border-red-500/30 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] text-sm shadow-md">
                    {msg.text}
                  </div>
                ) : (
                  <div className="self-start bg-[#0c0406] border border-white/10 text-gray-200 px-5 py-3.5 rounded-2xl rounded-tl-sm max-w-[90%] text-sm shadow-inner leading-relaxed">
                    <ReactMarkdown className="markdown-body">{msg.text}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="self-start bg-[#0c0406] border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 text-gray-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#c13024] animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-[#c13024] animate-bounce delay-150"></span>
                <span className="w-2 h-2 rounded-full bg-[#c13024] animate-bounce delay-300"></span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Action Prompt Chips */}
          <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2">
            <button
              onClick={() => handleSendMessage(`Add Quick Dose for Now (${formatted24H})`)}
              className="px-3 py-1.5 bg-[#181114] hover:bg-[#25181e] border border-red-900/30 hover:border-red-500/50 text-gray-300 hover:text-white rounded-lg text-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#c13024]"></span>
              Add Quick Dose for Now ({formatted24H})
            </button>

            <button
              onClick={() => handleSendMessage("What is my next dose?")}
              className="px-3 py-1.5 bg-[#181114] hover:bg-[#25181e] border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-lg text-xs transition-all active:scale-95"
            >
              What is my next dose?
            </button>

            <button
              onClick={() => handleSendMessage("Check my schedule")}
              className="px-3 py-1.5 bg-[#181114] hover:bg-[#25181e] border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-lg text-xs transition-all active:scale-95"
            >
              Check my schedule
            </button>

            <button
              onClick={() => handleSendMessage("Add Medicine A at 08:00 and 20:00")}
              className="px-3 py-1.5 bg-[#181114] hover:bg-[#25181e] border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-lg text-xs transition-all active:scale-95"
            >
              Add Medicine A at 08:00 and 20:00
            </button>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="mt-3 flex items-center gap-2 bg-[#0c0406] border border-white/10 focus-within:border-[#c13024] rounded-xl p-2 transition-colors"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="E.g., 'Add Paracetamol at 08:00 and 20:00' or 'What is my next scheduled dose?'..."
              className="flex-1 bg-transparent border-0 outline-none text-sm text-white placeholder-gray-600 px-3"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2 bg-[#c13024] hover:bg-[#a6251a] disabled:opacity-40 disabled:hover:bg-[#c13024] rounded-lg text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(193,48,36,0.3)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Send
            </button>
          </form>
        </div>

        {/* Right Column: Dose Reminder Schedule Sidebar (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          <div className="bg-[#130f11] border border-white/5 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-500/30 flex items-center justify-center text-[#e87a71]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Dose Reminder Schedule</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#e87a71]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c13024] animate-pulse"></span>
                    Live Clock ({formatted24H})
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                title="Manually add a dose"
              >
                +
              </button>
            </div>

            {/* Section 1: ACTIVE REMINDERS */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#e87a71]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#c13024]"></span>
                  1. ACTIVE REMINDERS ({activeReminders.length})
                </span>
                {activeReminders.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-950 text-[#e87a71] border border-red-500/40 text-[9px] rounded font-bold">
                    DUE RIGHT NOW
                  </span>
                )}
              </div>

              {activeReminders.length === 0 ? (
                <div className="bg-[#0c0406] border border-white/5 rounded-xl p-3.5 text-xs text-gray-500 italic">
                  No active doses due right now.
                </div>
              ) : (
                activeReminders.map((rem) => (
                  <div
                    key={rem.key}
                    className="bg-[#1a0c10] border border-red-500/40 rounded-xl p-3.5 flex items-center justify-between shadow-[0_0_15px_rgba(193,48,36,0.2)]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{rem.medName}</span>
                        <span className="px-2 py-0.5 bg-red-950/80 border border-red-500/30 text-red-200 text-[10px] rounded font-mono">
                          {rem.time}
                        </span>
                      </div>
                      <div className="text-[11px] text-red-300/80 mt-1 flex items-center gap-1">
                        <span>⏱️</span>
                        <span>1-min window: <strong>{secondsRemaining}s left</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleMarkTaken(rem)}
                      className="px-3.5 py-1.5 bg-[#c13024] hover:bg-[#a6251a] text-white font-bold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Taken
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Section 2: NEXT DUE */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#e87a71]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#c13024]"></span>
                  2. NEXT DUE ({nextDueList.length})
                </span>
                {earliestNext && (
                  <span className="text-[10px] font-mono text-[#e87a71]">
                    Earliest: {earliestNext}
                  </span>
                )}
              </div>

              {nextDueList.length === 0 ? (
                <div className="bg-[#0c0406] border border-white/5 rounded-xl p-3.5 text-xs text-gray-500 italic">
                  No upcoming doses scheduled for today.
                </div>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {nextDueList.map((item, idx) => (
                    <div
                      key={item.key || idx}
                      className="bg-[#170c10] border border-red-900/30 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-white">{item.name}</span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.2 bg-red-900/70 border border-red-500/40 text-[#e87a71] text-[9px] font-bold rounded">
                              NEXT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#e87a71] font-mono mt-0.5">{item.time} ({item.diffFormatted})</div>
                      </div>
                      <button
                        onClick={() => handleMarkTaken({ medName: item.name, time: item.time, key: item.key })}
                        className="px-2.5 py-1 rounded bg-[#c13024] hover:bg-[#a6251a] text-white text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Taken
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: MISSED */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-red-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  3. MISSED ({missedDoses.length})
                </span>
                <span className="px-2 py-0.5 bg-red-950 border border-red-500/40 text-red-300 font-bold text-[9px] rounded">
                  Action Needed
                </span>
              </div>

              {missedDoses.length === 0 ? (
                <div className="bg-[#0c0406] border border-rose-950/30 rounded-xl p-3.5 text-xs text-gray-500 italic">
                  No missed doses. All past doses were taken on time!
                </div>
              ) : (
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {missedDoses.map((m, idx) => (
                    <div
                      key={m.key || idx}
                      className="bg-[#200a0d] border border-red-900/40 rounded-xl p-2.5 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-xs text-red-200">{m.medName}</div>
                        <div className="text-[10px] text-red-300/80">{m.time} • Window Expired</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 bg-red-700 text-white rounded font-bold">
                          MISSED
                        </span>
                        <button
                          onClick={() => handleTakeLate(m)}
                          className="px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded text-[10px]"
                        >
                          Take Late
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: ALL REGISTERED MEDICATIONS */}
            <div className="pt-3 border-t border-white/5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>All Medications ({schedules.length})</span>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-[10px] text-[#e87a71] hover:underline"
                >
                  + Add New
                </button>
              </div>

              {schedules.length === 0 ? (
                <p className="text-xs text-gray-600 italic">No medications registered.</p>
              ) : (
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {schedules.map((med) => (
                    <div
                      key={med.id}
                      className="bg-[#0c0406] border border-white/5 rounded-lg p-2.5 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-medium text-white">{med.name}</span>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {med.times.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] font-mono px-1.5 py-0.5 bg-red-950/60 border border-red-900/30 rounded text-red-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSchedules((prev) => prev.filter((m) => m.id !== med.id));
                        }}
                        className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                        title="Delete schedule"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Manual Add Dose Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#130f11] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-white">Add Medication Schedule</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Medicine Name</label>
                <input
                  type="text"
                  required
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  placeholder="e.g. Paracetamol, Metformin, Vitamin D"
                  className="w-full bg-[#0c0406] border border-white/10 focus:border-[#c13024] rounded-xl p-3 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Dose Time (24-Hour HH:MM)</label>
                <input
                  type="time"
                  required
                  value={newMedTime}
                  onChange={(e) => setNewMedTime(e.target.value)}
                  className="w-full bg-[#0c0406] border border-white/10 focus:border-[#c13024] rounded-xl p-3 text-sm text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#c13024] hover:bg-[#a6251a] rounded-xl text-xs font-semibold text-white transition-all shadow-[0_0_15px_rgba(193,48,36,0.3)]"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MedicationReminder;
