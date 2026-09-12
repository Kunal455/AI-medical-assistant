import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { API_BASE_URL } from "../config";

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedTime, setNewMedTime] = useState("");
  const navigate = useNavigate();

  // --- MEDICATION REMINDER STATE ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [activeReminders, setActiveReminders] = useState([]);

  const [schedules, setSchedules] = useState(() => {
    const saved = localStorage.getItem("medassist_schedules");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();
    const h1 = String(curH).padStart(2, "0");
    const m1 = String(curM).padStart(2, "0");
    const h2 = String((curH + (curM + 25 >= 60 ? 1 : 0)) % 24).padStart(2, "0");
    const m2 = String((curM + 25) % 60).padStart(2, "0");
    const h3 = String((curH + (curM + 40 >= 60 ? 1 : 0)) % 24).padStart(2, "0");
    const m3 = String((curM + 40) % 60).padStart(2, "0");

    return [
      { id: "1", name: "Paracetamol", times: [`${h1}:${m1}`], active: true },
      { id: "2", name: "Thicolochine", times: [`${h2}:${m2}`], active: true },
      { id: "3", name: "Vitamin D", times: [`${h3}:${m3}`], active: true }
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        key: "Paracetamol-21:00-prev",
        medName: "Paracetamol",
        time: "21:00",
        formatted12: "09:00 PM",
        date: new Date().toDateString(),
        missedAt: "09:01 PM"
      }
    ];
  });

  const audioContextRef = useRef(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("medassist_schedules", JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem("medassist_dose_history", JSON.stringify(doseHistory));
  }, [doseHistory]);

  useEffect(() => {
    localStorage.setItem("medassist_missed_doses", JSON.stringify(missedDoses));
  }, [missedDoses]);

  // Web Audio Synth Chime
  const playChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") ctx.resume();
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

  // Live Timer Tick & Evaluation
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMinutes = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const currentSeconds = now.getSeconds();
      setSecondsRemaining(60 - currentSeconds);

      const todayDateStr = now.toDateString();
      const dueRightNow = [];

      schedules.forEach((med) => {
        if (!med.active) return;
        med.times.forEach((timeStr) => {
          const doseKey = `${med.name}-${timeStr}-${todayDateStr}`;
          const alreadyTaken = doseHistory.some((item) => item.key === doseKey);
          const alreadyMissed = missedDoses.some((item) => item.key === doseKey);

          const [h, m] = timeStr.split(":").map(Number);
          const h12 = h % 12 || 12;
          const ampm = h >= 12 ? "PM" : "AM";
          const formatted12 = `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;

          if (timeStr === currentTimeStr && !alreadyTaken && !alreadyMissed) {
            dueRightNow.push({
              key: doseKey,
              medId: med.id,
              medName: med.name,
              time: timeStr,
              formatted12: formatted12,
              dueAt: now
            });
          }

          // If scheduled minute elapsed today without being taken
          const scheduledDate = new Date(now);
          scheduledDate.setHours(h, m, 59, 999);

          if (now > scheduledDate && !alreadyTaken && !alreadyMissed) {
            setMissedDoses((prev) => [
              ...prev,
              {
                key: doseKey,
                medName: med.name,
                time: timeStr,
                formatted12: formatted12,
                date: todayDateStr,
                missedAt: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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

  // Mark Dose as Taken
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
        takenAt: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date: todayDateStr
      }
    ]);

    setActiveReminders((prev) => prev.filter((r) => r.key !== doseKey));
    playChime();
  };

  // Mark Missed Dose as Taken Late
  const handleTakeLate = (missedItem) => {
    const now = new Date();
    setMissedDoses((prev) => prev.filter((m) => m.key !== missedItem.key));
    setDoseHistory((prev) => [
      ...prev,
      {
        key: missedItem.key,
        medName: missedItem.medName,
        time: missedItem.time,
        takenAt: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " (Late)",
        date: new Date().toDateString()
      }
    ]);
  };

  // Fetch Consultations History
  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/chat`, {
        credentials: "include"
      });
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadChat = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/chat/${id}`, {
        credentials: "include"
      });
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setActiveChatId(data._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startNewConsultation = () => {
    setMessages([]);
    setActiveChatId(null);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/user/logout`, {
        credentials: "include"
      });
      navigate("/login");
    } catch (err) {
      console.log(err);
    }
  };

  const sendMessage = async (textToSend) => {
    const text = textToSend || message;
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ symptoms: text, chatId: activeChatId })
      });

      if (res.status === 401) {
        navigate("/login");
        return;
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.response || "Sorry, I could not process that request." }]);
      
      if (!activeChatId && data.chatId) {
        setActiveChatId(data.chatId);
        fetchHistory();
      }
    } catch (err) {
      console.log(err);
      setMessages((prev) => [...prev, { role: "ai", text: "Error connecting to the server." }]);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMessages((prev) => [...prev, { role: "user", text: `Uploaded file: ${file.name}` }]);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/medical/upload-report`, {
        method: "POST",
        credentials: "include",
        body: formData
      });

      if (res.status === 401) {
        navigate("/login");
        return;
      }

      const data = await res.json();
      setIsUploading(false);
      
      let aiText = "Sorry, I could not analyze this report.";
      if (data.aiAnalysis) {
        if (data.aiAnalysis.isMedical === false) {
          aiText = data.aiAnalysis.simpleExplanation || "This does not appear to be a medical document. I can only assist with medical reports, lab results, and prescriptions.";
        } else {
          aiText = `**Analysis of ${file.name}:**\n\n`;
          if (data.aiAnalysis.simpleExplanation) {
            aiText += `**Summary:** ${data.aiAnalysis.simpleExplanation}\n\n`;
          }
          if (data.aiAnalysis.importantFindings?.length > 0) {
            aiText += `**Key Findings:**\n${data.aiAnalysis.importantFindings.map(f => `- ${f}`).join('\n')}\n\n`;
          }
          if (data.aiAnalysis.abnormalValues?.length > 0) {
            aiText += `**Abnormal Values:**\n${data.aiAnalysis.abnormalValues.map(f => `- ${f}`).join('\n')}\n\n`;
          }
          if (data.aiAnalysis.precautions?.length > 0) {
            aiText += `**Precautions:**\n${data.aiAnalysis.precautions.map(f => `- ${f}`).join('\n')}\n\n`;
          }
        }
      }

      setMessages((prev) => [...prev, { role: "ai", text: aiText }]);
      e.target.value = null;
    } catch (err) {
      console.log(err);
      setIsUploading(false);
      setMessages((prev) => [...prev, { role: "ai", text: "Error uploading the file." }]);
    }
  };

  // Formatted Live Clocks
  const currentHours = currentTime.getHours();
  const currentMinutes = String(currentTime.getMinutes()).padStart(2, "0");
  const formatted24H = `${String(currentHours).padStart(2, "0")}:${currentMinutes}`;

  // Next Due Items calculation
  const getNextDueList = () => {
    const currentMins = currentHours * 60 + currentTime.getMinutes();
    const list = [];

    schedules.forEach((med) => {
      if (!med.active) return;
      med.times.forEach((t) => {
        const [h, m] = t.split(":").map(Number);
        const doseMins = h * 60 + m;
        const h12 = h % 12 || 12;
        const ampm = h >= 12 ? "PM" : "AM";
        const formatted12 = `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;

        if (doseMins > currentMins) {
          list.push({
            medId: med.id,
            name: med.name,
            time: t,
            formatted12: formatted12,
            diff: doseMins - currentMins
          });
        }
      });
    });

    return list.sort((a, b) => a.diff - b.diff);
  };

  const nextDueList = getNextDueList();

  const handleAddManualSchedule = (e) => {
    e.preventDefault();
    if (!newMedName.trim() || !newMedTime.trim()) return;
    const name = newMedName.trim().charAt(0).toUpperCase() + newMedName.trim().slice(1);
    setSchedules((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: name,
        times: [newMedTime],
        active: true
      }
    ]);
    setNewMedName("");
    setNewMedTime("");
    setShowAddModal(false);
  };

  return (
    <div className="h-screen bg-[#090507] text-white flex flex-col font-sans overflow-hidden">
      
      {/* 1. TOP ACTIVE REMINDER (DUE NOW) BANNER */}
      {activeReminders.length > 0 && (
        <div className="bg-gradient-to-r from-[#200e2b] via-[#170a24] to-[#0c181a] border-b border-purple-500/40 px-6 py-2.5 flex items-center justify-between gap-4 z-50 animate-fadeIn shadow-[0_4px_25px_rgba(168,85,247,0.25)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-950/90 border border-purple-400/50 flex items-center justify-center text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-purple-600/40 text-purple-200 border border-purple-400/50 rounded text-[10px] font-bold tracking-wide flex items-center gap-1">
                  ⏰ ACTIVE REMINDER (DUE NOW)
                </span>
                <span className="font-semibold text-white text-sm">
                  Time to take: <strong className="text-purple-200 font-bold">{activeReminders[0].medName}</strong> at {activeReminders[0].formatted12}
                </span>
              </div>
              <p className="text-[11px] text-purple-300/80 mt-0.5 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Reminder active for 1 minute: <span className="font-bold text-amber-300">{secondsRemaining}s</span> remaining before marked as missed!
              </p>
            </div>
          </div>

          <button
            onClick={() => handleMarkTaken(activeReminders[0])}
            className="px-5 py-1.5 bg-[#00b27b] hover:bg-[#00c98b] active:scale-95 text-gray-950 font-bold rounded-lg text-xs transition-all shadow-[0_0_15px_rgba(0,178,123,0.5)] flex items-center gap-1.5 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            TAKEN
          </button>
        </div>
      )}

      {/* Main Body Area with 3 Columns: Left Sidebar | Center Chat | Right Dose Schedule */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Mobile Sidebar Drawer */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 md:hidden flex">
            <div className="w-[280px] bg-[#0c0406] border-r border-red-900/20 flex flex-col h-full relative p-6">
              <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              
              <div className="flex items-center gap-2 mb-8 mt-4">
                <div className="bg-[#c13024] p-1.5 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
                </div>
                <span className="font-bold text-xl">MedAssist</span>
              </div>

              <button onClick={() => { startNewConsultation(); setIsSidebarOpen(false); }} className="w-full bg-[#c13024] hover:bg-[#a6251a] p-3 rounded-xl font-medium transition-colors flex items-center gap-2 justify-center shadow-[0_0_15px_rgba(193,48,36,0.2)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                New consultation
              </button>

              <div className="flex-1 overflow-y-auto mt-6">
                <h3 className="text-gray-500 text-xs font-semibold tracking-wider mb-4 uppercase">History</h3>
                {history.length === 0 ? (
                  <p className="text-gray-600 text-sm">No conversations yet</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((chat) => (
                      <button
                        key={chat._id}
                        onClick={() => { loadChat(chat._id); setIsSidebarOpen(false); }}
                        className={`w-full text-left p-3 rounded-xl transition-colors truncate text-sm ${activeChatId === chat._id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                      >
                        {chat.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-red-900/20">
                <button onClick={() => { handleLogout(); setIsSidebarOpen(false); }} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                  Sign out
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
          </div>
        )}

        {/* 2. LEFT SIDEBAR (Desktop) */}
        <div className="hidden md:flex w-[260px] lg:w-[280px] bg-[#0c0406] border-r border-red-900/20 flex-col flex-shrink-0">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <div className="bg-[#c13024] p-1.5 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
              </div>
              <span className="font-bold text-xl">MedAssist</span>
            </div>

            <button onClick={startNewConsultation} className="w-full bg-[#c13024] hover:bg-[#a6251a] p-3 rounded-xl font-medium transition-colors flex items-center gap-2 justify-center shadow-[0_0_15px_rgba(193,48,36,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              New consultation
            </button>
          </div>

          <div className="flex-1 px-6 overflow-y-auto">
            <h3 className="text-gray-500 text-xs font-semibold tracking-wider mb-4 uppercase">History</h3>
            {history.length === 0 ? (
              <p className="text-gray-600 text-sm">No conversations yet</p>
            ) : (
              <div className="space-y-2">
                {history.map((chat) => (
                  <button
                    key={chat._id}
                    onClick={() => loadChat(chat._id)}
                    className={`w-full text-left p-3 rounded-xl transition-colors truncate text-sm ${activeChatId === chat._id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                  >
                    {chat.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-red-900/20">
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              Sign out
            </button>
          </div>
        </div>

        {/* 3. CENTER CHAT AREA */}
        <div className="flex-1 flex flex-col relative min-w-0 bg-[#090507]">
          {/* Header */}
          <header className="flex justify-between items-center px-4 md:px-8 py-4 border-b border-white/5 bg-[#090507] z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <div>
                <h2 className="font-semibold text-base md:text-lg text-white">Medical assistant</h2>
                <p className="text-gray-500 text-[10px] md:text-xs">Informational only · Not a substitute for professional care</p>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-5">
              <button
                onClick={() => setIsReminderOpen(!isReminderOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isReminderOpen ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                title="Toggle Dose Reminder Schedule Panel"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Dose Schedule ({schedules.length})
              </button>
              <Link to="/reminder" className="hidden sm:inline text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                Full Reminders App
              </Link>
              <Link to="/tools" className="text-gray-400 hover:text-white transition-colors text-xs font-medium">
                Tools
              </Link>
              <Link to="/" className="text-gray-400 hover:text-white transition-colors text-xs font-medium">
                Home
              </Link>
            </div>
          </header>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
                <div className="bg-[#c13024] p-4 rounded-2xl mb-6 shadow-[0_0_30px_rgba(193,48,36,0.4)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">How can I help <span className="text-[#e87a71]">today?</span></h1>
                <p className="text-gray-400 text-xs md:text-sm mb-8 text-center">Ask about symptoms, medications, or general medical topics.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                  {[
                    "I've had a sore throat and mild fever for 3 days — what could it be?",
                    "Explain the difference between ibuprofen and acetaminophen.",
                    "What should I do for a suspected sprained ankle?",
                    "Help me understand a basic lipid panel result."
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(suggestion)}
                      className="bg-[#130f11] hover:bg-[#1a1518] border border-white/5 p-4 rounded-2xl text-left text-xs text-gray-300 transition-colors leading-relaxed"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 max-w-2xl mx-auto w-full pb-8">
                {messages.map((msg, index) => (
                  <div key={index} className={`mb-5 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${msg.role === "user" ? "bg-[#c13024] text-white rounded-br-sm shadow-md" : "bg-[#130f11] border border-white/5 text-gray-200 rounded-bl-sm markdown-body"}`}>
                      {msg.role === "user" ? msg.text : <ReactMarkdown>{msg.text}</ReactMarkdown>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 md:p-6 bg-[#090507] border-t border-white/5 flex-shrink-0">
            <div className="max-w-2xl mx-auto relative flex items-center">
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                onChange={handleFileUpload} 
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <label 
                htmlFor="file-upload"
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors text-gray-300 z-10"
                title="Upload medical report"
              >
                {isUploading ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                )}
              </label>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isUploading && sendMessage()}
                disabled={isUploading}
                placeholder={isUploading ? "Analyzing report..." : "Describe symptoms, ask about a medication, or paste a lab result..."}
                className="w-full bg-[#130f11] border border-white/10 p-3.5 pl-14 pr-14 rounded-2xl outline-none focus:border-white/30 text-white placeholder-gray-500 transition-colors text-xs md:text-sm disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={isUploading}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors text-gray-300 disabled:opacity-50 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </button>
            </div>
            <p className="text-center text-gray-600 text-[10px] md:text-xs mt-3">
              In an emergency, call your local emergency services immediately.
            </p>
          </div>
        </div>

        {/* 4. RIGHT PANEL: DOSE REMINDER SCHEDULE WIDGET (Matching Screenshot 2) */}
        {isReminderOpen && (
          <div className="w-[340px] xl:w-[380px] bg-[#0c080e] border-l border-purple-900/30 p-4 flex flex-col flex-shrink-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            
            {/* Widget Container */}
            <div className="bg-[#110d18] border border-purple-900/40 rounded-2xl p-4 shadow-2xl flex flex-col gap-4">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-tight">Dose Reminder Schedule</h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live Clock ({formatted24H})
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors text-base font-bold"
                  title="Add new dose"
                >
                  +
                </button>
              </div>

              {/* 1. ACTIVE REMINDERS BOX */}
              <div className="bg-[#181126] border border-purple-600/50 rounded-2xl p-3.5 shadow-[0_0_20px_rgba(147,51,234,0.15)]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-purple-200 tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                    1. ACTIVE REMINDERS ({activeReminders.length})
                  </span>
                  <span className="px-2 py-0.5 bg-[#4c1d95] text-purple-200 rounded text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
                    DUE RIGHT NOW
                  </span>
                </div>

                {activeReminders.length === 0 ? (
                  <div className="bg-[#120b1e]/60 rounded-xl p-3 text-center text-xs text-purple-300/60 italic">
                    No active reminders due right now.
                  </div>
                ) : (
                  activeReminders.map((rem) => (
                    <div key={rem.key} className="bg-[#1f1333] border border-purple-400/40 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-sm">{rem.medName}</span>
                          <span className="px-2 py-0.5 bg-purple-900/80 border border-purple-500/40 text-purple-200 text-[10px] rounded font-mono font-bold">
                            {rem.time}
                          </span>
                        </div>
                        <div className="text-[11px] text-purple-200 mt-1 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          1-min window: <strong className="text-white font-bold">{secondsRemaining}s left</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => handleMarkTaken(rem)}
                        className="px-3.5 py-1.5 bg-[#00d694] hover:bg-[#00f0a5] active:scale-95 text-gray-950 font-bold rounded-lg text-xs transition-all shadow-[0_0_12px_rgba(0,214,148,0.4)] flex items-center gap-1 cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Taken
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* 2. NEXT DUE BOX */}
              <div className="bg-[#081a17] border border-emerald-600/50 rounded-2xl p-3.5 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-emerald-300 tracking-wide flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                    </svg>
                    2. NEXT DUE ({nextDueList.length})
                  </span>
                  {nextDueList.length > 0 && (
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                      Earliest: {nextDueList[0].time}
                    </span>
                  )}
                </div>

                {nextDueList.length === 0 ? (
                  <div className="bg-[#041210]/60 rounded-xl p-3 text-center text-xs text-emerald-400/60 italic">
                    No upcoming doses scheduled for today.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {nextDueList.map((item, idx) => (
                      <div key={idx} className="bg-[#0b2420] border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">{item.name}</span>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.2 bg-teal-500 text-gray-950 font-black text-[9px] rounded uppercase">
                                NEXT
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.formatted12}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-emerald-950 border border-emerald-600/40 text-emerald-300 text-xs font-mono font-bold rounded-lg">
                            {item.time}
                          </span>
                          <button
                            onClick={() => handleMarkTaken({ medName: item.name, time: item.time })}
                            className="px-2.5 py-1 bg-[#00d694] hover:bg-[#00f0a5] text-gray-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Taken
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. MISSED BOX */}
              <div className="bg-[#200b0e] border border-rose-600/50 rounded-2xl p-3.5 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-rose-300 tracking-wide flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    3. MISSED ({missedDoses.length})
                  </span>
                  {missedDoses.length > 0 && (
                    <span className="px-2 py-0.5 bg-[#881337] text-rose-200 rounded text-[9px] font-extrabold uppercase tracking-wider">
                      Action Needed
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-rose-300/70 italic mb-2.5">
                  Missed because "Taken" was not clicked during the 1-minute reminder:
                </p>

                {missedDoses.length === 0 ? (
                  <div className="bg-[#150608]/60 rounded-xl p-3 text-center text-xs text-rose-400/60 italic">
                    No missed doses. All past doses were taken on time!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                    {missedDoses.map((m, idx) => (
                      <div key={idx} className="bg-[#2c1015] border border-rose-500/30 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <div>
                            <div className="font-bold text-white text-xs">{m.medName}</div>
                            <div className="text-[10px] text-rose-300/80 font-mono mt-0.5">{m.formatted12 || m.time}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-rose-950 border border-rose-700/50 text-rose-300 text-[10px] font-mono rounded">
                            {m.time}
                          </span>
                          <span className="px-1.5 py-0.5 bg-[#e11d48] text-white font-black text-[9px] rounded uppercase">
                            MISSED
                          </span>
                          <button
                            onClick={() => handleTakeLate(m)}
                            className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-[10px] font-medium rounded transition-colors cursor-pointer"
                          >
                            Take Late
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Manual Add Dose Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#130f11] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-white">Add Medication Schedule</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddManualSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Medicine Name</label>
                <input
                  type="text"
                  required
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  placeholder="e.g. Paracetamol, Amoxicillin"
                  className="w-full bg-[#0c0406] border border-white/10 focus:border-[#c13024] rounded-xl p-3 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Dose Time (24-Hour format)</label>
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

export default Chat;