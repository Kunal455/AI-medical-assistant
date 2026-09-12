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
  const [isReminderSidebarOpen, setIsReminderSidebarOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // --- Medication Reminder Engine State ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [activeReminders, setActiveReminders] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedTime, setNewMedTime] = useState("");

  const [schedules, setSchedules] = useState(() => {
    const saved = localStorage.getItem("medassist_schedules");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
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

  const navigate = useNavigate();
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

  // Audio Chime on Reminder
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

  // Clock tick & reminder evaluation
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

      // Check due right now
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

          // Check if window expired today
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

    setMessages([...messages, { role: "user", text }]);
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

    setMessages([...messages, { role: "user", text: `Uploaded file: ${file.name}` }]);
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

  // Reminder Actions
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

  const handleManualAddDose = (e) => {
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
  };

  // Helper: Next Due list for right widget
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
            key: `${med.name}-${t}-${now.toDateString()}`
          });
        }
      });
    });

    return list.sort((a, b) => a.diffMinutes - b.diffMinutes);
  };

  const nextDueList = getNextDueDoses();
  const earliestNext = nextDueList.length > 0 ? nextDueList[0].time : null;

  const current24HStr = `${String(currentTime.getHours()).padStart(2, "0")}:${String(currentTime.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="h-screen bg-[#090507] text-white flex flex-col font-sans overflow-hidden selection:bg-red-500/30">
      
      {/* 1. TOP ACTIVE REMINDER BANNER (DUE NOW) - MedAssist Crimson & Deep Wine Styling */}
      {activeReminders.length > 0 && (
        <div className="bg-gradient-to-r from-[#1c080d] via-[#14080b] to-[#0c0406] border-b border-[#c13024]/60 px-6 py-3 flex items-center justify-between shadow-[0_4px_25px_rgba(193,48,36,0.3)] z-30 transition-all">
          <div className="flex items-center gap-3">
            {/* Bell Icon */}
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-[#e87a71] shadow-[0_0_15px_rgba(193,48,36,0.3)] animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-red-950/90 text-[#e87a71] border border-red-500/40 font-bold text-[11px] rounded tracking-wide">
                  ACTIVE REMINDER (DUE NOW)
                </span>
                <span className="font-semibold text-white text-sm md:text-base">
                  Time to take: <strong className="text-[#e87a71]">{activeReminders[0].medName}</strong> at {activeReminders[0].formatted12}
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
            className="px-6 py-2.5 bg-[#c13024] hover:bg-[#a6251a] active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(193,48,36,0.4)] flex items-center gap-1.5 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            TAKEN
          </button>
        </div>
      )}

      {/* Main Body with Left History Sidebar, Center Chat, and Right Dose Reminder Schedule */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Mobile Left Sidebar Drawer */}
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
                    {history.map(chat => (
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

        {/* Left History Sidebar (Desktop) */}
        <div className="hidden md:flex w-[260px] bg-[#0c0406] border-r border-red-900/20 flex-col flex-shrink-0">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-6">
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

          <div className="flex-1 px-5 overflow-y-auto">
            <h3 className="text-gray-500 text-xs font-semibold tracking-wider mb-3 uppercase">History</h3>
            {history.length === 0 ? (
              <p className="text-gray-600 text-sm">No conversations yet</p>
            ) : (
              <div className="space-y-1.5">
                {history.map(chat => (
                  <button
                    key={chat._id}
                    onClick={() => loadChat(chat._id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-colors truncate text-xs ${activeChatId === chat._id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                  >
                    {chat.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-red-900/20">
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              Sign out
            </button>
          </div>
        </div>

        {/* Center Main Chat Column */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          
          {/* Header */}
          <header className="flex justify-between items-center px-4 md:px-8 py-4 border-b border-white/5 bg-[#090507] z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <div>
                <h2 className="font-semibold text-base md:text-lg">Medical assistant</h2>
                <p className="text-gray-500 text-[10px] md:text-xs">Informational only · Not a substitute for professional care</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 md:gap-5">
              <button
                onClick={() => setIsReminderSidebarOpen(!isReminderSidebarOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${isReminderSidebarOpen ? 'bg-red-950/80 border-red-500/40 text-[#e87a71] shadow-[0_0_10px_rgba(193,48,36,0.2)]' : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'}`}
                title="Toggle Dose Reminder Schedule Panel"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#c13024] animate-pulse"></span>
                Dose Schedule
                {activeReminders.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-[#c13024] text-white rounded-full text-[10px]">1</span>
                )}
              </button>

              <Link to="/tools" className="text-gray-400 hover:text-white transition-colors text-xs md:text-sm font-medium">
                Tools
              </Link>
              <Link to="/" className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-xs md:text-sm font-medium">
                Home
              </Link>
            </div>
          </header>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full my-auto">
                <div className="bg-[#c13024] p-4 rounded-2xl mb-5 shadow-[0_0_30px_rgba(193,48,36,0.4)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">How can I help <span className="text-[#e87a71]">today?</span></h1>
                <p className="text-gray-400 text-xs md:text-sm mb-8 text-center">Ask about symptoms, medications, or general medical topics.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
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
              <div className="flex-1 max-w-3xl mx-auto w-full pb-6 space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-[#c13024] text-white rounded-br-sm shadow-md" : "bg-[#130f11] border border-white/5 text-gray-200 rounded-bl-sm markdown-body"}`}>
                      {msg.role === "user" ? msg.text : <ReactMarkdown>{msg.text}</ReactMarkdown>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Chat Input Area */}
          <div className="p-4 md:p-5 bg-[#090507] border-t border-white/5 flex-shrink-0">
            <div className="max-w-3xl mx-auto relative flex items-center">
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
                className="w-full bg-[#130f11] border border-white/10 p-3.5 pl-14 pr-14 rounded-2xl outline-none focus:border-white/30 text-white placeholder-gray-500 transition-colors text-sm disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={isUploading || !message.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors text-gray-300 disabled:opacity-40 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </button>
            </div>
            <p className="text-center text-gray-600 text-[11px] mt-2">
              In an emergency, call your local emergency services immediately.
            </p>
          </div>
        </div>

        {/* 2. RIGHT SIDEBAR: DOSE REMINDER SCHEDULE PANEL - MedAssist Crimson & Coral Styling */}
        {isReminderSidebarOpen && (
          <div className="w-[340px] xl:w-[380px] bg-[#0c0406] border-l border-red-900/20 flex flex-col h-full flex-shrink-0 p-4 overflow-y-auto shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-[#e87a71] shadow-[0_0_10px_rgba(193,48,36,0.2)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Dose Reminder Schedule</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#e87a71] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c13024] animate-pulse"></span>
                    Live Clock ({current24HStr})
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white font-bold transition-all text-base"
                title="Add Medication Schedule"
              >
                +
              </button>
            </div>

            {/* Section 1: ACTIVE REMINDERS (Signature MedAssist Crimson Card) */}
            <div className="bg-[#150a0d] border border-red-500/40 rounded-2xl p-3.5 mb-4 shadow-[0_0_20px_rgba(193,48,36,0.15)]">
              <div className="flex items-center justify-between mb-3 text-xs font-semibold text-[#e87a71]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#c13024]"></span>
                  1. ACTIVE REMINDERS ({activeReminders.length})
                </span>
                <span className="px-2 py-0.5 bg-red-950 text-[#e87a71] border border-red-500/40 font-bold text-[10px] rounded tracking-wide">
                  DUE RIGHT NOW
                </span>
              </div>

              {activeReminders.length === 0 ? (
                <div className="bg-[#1c0c10] border border-red-900/30 rounded-xl p-3 text-xs text-red-200/60 italic text-center">
                  No active reminders right now.
                </div>
              ) : (
                activeReminders.map((rem) => (
                  <div key={rem.key} className="bg-[#1a0c10] border border-red-500/40 rounded-xl p-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{rem.medName}</span>
                          <span className="px-2 py-0.5 bg-red-950/80 border border-red-500/30 text-red-200 text-[11px] font-mono rounded">
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
                        className="px-4 py-1.5 bg-[#c13024] hover:bg-[#a6251a] active:scale-95 text-white font-bold rounded-lg text-xs transition-all shadow-[0_0_10px_rgba(193,48,36,0.3)] flex items-center gap-1 cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Taken
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Section 2: NEXT DUE (MedAssist Dark Card) */}
            <div className="bg-[#120a0d] border border-red-900/30 rounded-2xl p-3.5 mb-4 shadow-[0_0_20px_rgba(193,48,36,0.08)]">
              <div className="flex items-center justify-between mb-3 text-xs font-semibold text-[#e87a71]">
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                  </svg>
                  2. NEXT DUE ({nextDueList.length})
                </span>
                {earliestNext && (
                  <span className="text-[11px] font-mono text-[#e87a71]">
                    Earliest: {earliestNext}
                  </span>
                )}
              </div>

              {nextDueList.length === 0 ? (
                <div className="bg-[#170c10] border border-red-900/20 rounded-xl p-3 text-xs text-red-200/50 italic text-center">
                  No upcoming doses scheduled for today.
                </div>
              ) : (
                <div className="space-y-2">
                  {nextDueList.map((item, idx) => (
                    <div
                      key={item.key || idx}
                      className="bg-[#170c10] border border-white/5 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs md:text-sm">{item.name}</span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.2 bg-red-900/70 border border-red-500/40 text-[#e87a71] text-[9px] font-bold rounded">
                              NEXT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{item.time12}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-[#0c0406] border border-white/10 text-gray-300 text-[11px] font-mono rounded-lg">
                          {item.time}
                        </span>
                        <button
                          onClick={() => handleMarkTaken({ medName: item.name, time: item.time, key: item.key })}
                          className="px-3 py-1 bg-[#c13024] hover:bg-[#a6251a] active:scale-95 text-white font-bold rounded-lg text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer"
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

            {/* Section 3: MISSED (Dark Maroon Card) */}
            <div className="bg-[#18090b] border border-red-900/40 rounded-2xl p-3.5 mb-2 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <div className="flex items-center justify-between mb-1.5 text-xs font-semibold text-red-400">
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  3. MISSED ({missedDoses.length})
                </span>
                <span className="px-2 py-0.5 bg-red-950 border border-red-500/50 text-red-300 font-bold text-[10px] rounded">
                  Action Needed
                </span>
              </div>

              <p className="text-[10px] text-red-300/70 italic mb-2.5">
                Missed because "Taken" was not clicked during the 1-minute reminder:
              </p>

              {missedDoses.length === 0 ? (
                <div className="bg-[#200a0d] border border-red-900/30 rounded-xl p-3 text-xs text-red-300/50 italic text-center">
                  No missed doses. All past doses were taken on time!
                </div>
              ) : (
                <div className="space-y-2">
                  {missedDoses.map((m, idx) => (
                    <div
                      key={m.key || idx}
                      className="bg-[#200a0d] border border-red-500/20 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0 animate-pulse"></span>
                        <div>
                          <div className="font-bold text-white text-xs md:text-sm">{m.medName}</div>
                          <div className="text-[10px] text-red-300/80 mt-0.5">{m.formatted12 || m.time}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-red-950 border border-red-500/30 text-red-300 text-[10px] font-mono rounded">
                          {m.time}
                        </span>
                        <span className="px-2 py-0.5 bg-red-700 text-white font-bold text-[10px] rounded">
                          MISSED
                        </span>
                        <button
                          onClick={() => handleTakeLate(m)}
                          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded text-[11px] font-medium transition-colors"
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
        )}

      </div>

      {/* Manual Add Schedule Modal */}
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

            <form onSubmit={handleManualAddDose} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Medicine Name</label>
                <input
                  type="text"
                  required
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  placeholder="e.g. Paracetamol, Thicolochine, D"
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

export default Chat;