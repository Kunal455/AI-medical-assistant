import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { API_BASE_URL } from "../config";

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

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

  const [isUploading, setIsUploading] = useState(false);

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
      e.target.value = null; // reset input
    } catch (err) {
      console.log(err);
      setIsUploading(false);
      setMessages((prev) => [...prev, { role: "ai", text: "Error uploading the file." }]);
    }
  };

  return (
    <div className="h-screen bg-[#090507] text-white flex font-sans overflow-hidden">
      {/* Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 md:hidden flex">
          <div className="w-[280px] bg-[#0c0406] border-r border-red-900/20 flex flex-col h-full relative p-6">
            {/* Close Button */}
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
          {/* Overlay Click Area */}
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      {/* Sidebar */}
      <div className="hidden md:flex w-[280px] bg-[#0c0406] border-r border-red-900/20 flex-col">
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
              {history.map(chat => (
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
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="flex justify-between items-center px-4 md:px-8 py-5 border-b border-white/5 bg-[#090507] z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile */}
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div>
              <h2 className="font-semibold text-base md:text-lg">Medical assistant</h2>
              <p className="text-gray-500 text-[10px] md:text-xs">Informational only · Not a substitute for professional care</p>
            </div>
          </div>
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-xs md:text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Home
          </Link>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
              <div className="bg-[#c13024] p-4 rounded-2xl mb-6 shadow-[0_0_30px_rgba(193,48,36,0.4)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
              </div>
              <h1 className="text-3xl font-bold mb-3">How can I help <span className="text-[#e87a71]">today?</span></h1>
              <p className="text-gray-400 mb-10">Ask about symptoms, medications, or general medical topics.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {[
                  "I've had a sore throat and mild fever for 3 days — what could it be?",
                  "Explain the difference between ibuprofen and acetaminophen.",
                  "What should I do for a suspected sprained ankle?",
                  "Help me understand a basic lipid panel result."
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(suggestion)}
                    className="bg-[#130f11] hover:bg-[#1a1518] border border-white/5 p-5 rounded-2xl text-left text-sm text-gray-300 transition-colors leading-relaxed"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 max-w-3xl mx-auto w-full pb-8">
              {messages.map((msg, index) => (
                <div key={index} className={`mb-6 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-[#c13024] text-white rounded-br-sm" : "bg-[#130f11] border border-white/5 text-gray-200 rounded-bl-sm markdown-body"}`}>
                    {msg.role === "user" ? msg.text : <ReactMarkdown>{msg.text}</ReactMarkdown>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-[#090507] border-t border-white/5">
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
              className="w-full bg-[#130f11] border border-white/10 p-4 pl-14 pr-16 rounded-2xl outline-none focus:border-white/30 text-white placeholder-gray-500 transition-colors text-sm disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isUploading}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors text-gray-300 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>
          <p className="text-center text-gray-600 text-xs mt-4">
            In an emergency, call your local emergency services immediately.
          </p>
        </div>

        <button className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:bg-white/20 transition-colors z-20">
          ?
        </button>
      </div>
    </div>
  );
}

export default Chat;