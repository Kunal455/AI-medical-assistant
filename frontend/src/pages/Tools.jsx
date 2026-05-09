import { useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

function Tools() {
    const [activeTab, setActiveTab] = useState("report");
    const [file, setFile] = useState(null);
    const [textInput, setTextInput] = useState("");
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUploadSubmit = async (endpoint) => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }
        setLoading(true);
        setError(null);
        setResponse(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`http://localhost:5000/api/v1/analyze/${endpoint}`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Analysis failed");
            setResponse(data.aiResponse);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTextSubmit = async (endpoint, key) => {
        if (!textInput) {
            setError("Please enter details first.");
            return;
        }
        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            const res = await fetch(`http://localhost:5000/api/v1/analyze/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [key]: textInput })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Analysis failed");
            setResponse(data.aiResponse);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#090507] text-white flex flex-col font-sans">
            {/* Header */}
            <header className="flex justify-between items-center px-8 py-5 border-b border-white/5 bg-[#090507]">
                <div>
                    <h2 className="font-semibold text-xl flex items-center gap-3">
                        <div className="bg-[#c13024] p-1.5 rounded-lg flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
                        </div>
                        MedAssist Tools
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Advanced AI analysis for reports, prescriptions, and more.</p>
                </div>
                <div className="flex items-center gap-6">
                    <Link to="/chat" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Chat</Link>
                    <Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Home</Link>
                </div>
            </header>

            <div className="flex flex-1 max-w-7xl mx-auto w-full p-8 gap-8">
                {/* Sidebar Navigation */}
                <div className="w-64 space-y-2">
                    <button 
                        onClick={() => { setActiveTab("report"); setResponse(null); setFile(null); }}
                        className={`w-full text-left p-4 rounded-xl transition-all ${activeTab === "report" ? "bg-[#c13024] text-white shadow-lg shadow-red-900/20" : "bg-[#130f11] text-gray-400 hover:bg-[#1a1518]"}`}
                    >
                        <h3 className="font-semibold">Medical Report</h3>
                        <p className="text-xs opacity-80 mt-1">Upload PDF or Image</p>
                    </button>
                    <button 
                        onClick={() => { setActiveTab("prescription"); setResponse(null); setFile(null); }}
                        className={`w-full text-left p-4 rounded-xl transition-all ${activeTab === "prescription" ? "bg-[#c13024] text-white shadow-lg shadow-red-900/20" : "bg-[#130f11] text-gray-400 hover:bg-[#1a1518]"}`}
                    >
                        <h3 className="font-semibold">Prescription Reader</h3>
                        <p className="text-xs opacity-80 mt-1">Extract medicines from image</p>
                    </button>
                    <button 
                        onClick={() => { setActiveTab("medicine"); setResponse(null); setTextInput(""); }}
                        className={`w-full text-left p-4 rounded-xl transition-all ${activeTab === "medicine" ? "bg-[#c13024] text-white shadow-lg shadow-red-900/20" : "bg-[#130f11] text-gray-400 hover:bg-[#1a1518]"}`}
                    >
                        <h3 className="font-semibold">Medicine Lookup</h3>
                        <p className="text-xs opacity-80 mt-1">Uses & side effects</p>
                    </button>
                    <button 
                        onClick={() => { setActiveTab("diet"); setResponse(null); setTextInput(""); }}
                        className={`w-full text-left p-4 rounded-xl transition-all ${activeTab === "diet" ? "bg-[#c13024] text-white shadow-lg shadow-red-900/20" : "bg-[#130f11] text-gray-400 hover:bg-[#1a1518]"}`}
                    >
                        <h3 className="font-semibold">Diet & Lifestyle</h3>
                        <p className="text-xs opacity-80 mt-1">Personalized health plan</p>
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-[#130f11] border border-white/5 rounded-2xl p-8 overflow-y-auto">
                    {/* Medical Report & Prescription (File Upload) */}
                    {(activeTab === "report" || activeTab === "prescription") && (
                        <div>
                            <h2 className="text-2xl font-bold mb-2">{activeTab === "report" ? "Analyze Medical Report" : "Read Prescription"}</h2>
                            <p className="text-gray-400 mb-8">
                                {activeTab === "report" ? "Upload your lab results (PDF or Image) and the AI will extract and explain the key findings." : "Upload an image of a prescription to identify medications and usage instructions."}
                            </p>
                            
                            <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center bg-[#0c0406] mb-6">
                                <input type="file" onChange={handleFileChange} className="mb-4 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#c13024] file:text-white hover:file:bg-[#a6251a] cursor-pointer" />
                                <button 
                                    onClick={() => handleUploadSubmit(activeTab)}
                                    disabled={loading}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors disabled:opacity-50"
                                >
                                    {loading ? "Analyzing..." : "Analyze File"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Medicine & Diet (Text Input) */}
                    {(activeTab === "medicine" || activeTab === "diet") && (
                        <div>
                            <h2 className="text-2xl font-bold mb-2">{activeTab === "medicine" ? "Medicine Information" : "Diet & Health Plan"}</h2>
                            <p className="text-gray-400 mb-8">
                                {activeTab === "medicine" ? "Enter the name of a medication to instantly learn its uses, side effects, and warnings." : "Enter your health goals, weight, and lifestyle details to receive personalized dietary advice."}
                            </p>
                            
                            <div className="flex flex-col gap-4 mb-6">
                                <textarea 
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    placeholder={activeTab === "medicine" ? "e.g., Amoxicillin 500mg" : "e.g., 25yo male, 80kg, trying to lose weight and need more iron."}
                                    className="w-full bg-[#0c0406] border border-white/10 rounded-xl p-4 min-h-[120px] outline-none focus:border-white/30 text-white placeholder-gray-600 transition-colors"
                                />
                                <button 
                                    onClick={() => handleTextSubmit(activeTab, activeTab === "medicine" ? "medicineName" : "userData")}
                                    disabled={loading}
                                    className="self-start px-8 py-3 bg-[#c13024] hover:bg-[#a6251a] rounded-lg text-white transition-colors font-medium disabled:opacity-50"
                                >
                                    {loading ? "Generating..." : "Get Information"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6">
                            {error}
                        </div>
                    )}

                    {/* Response Area */}
                    {response && (
                        <div className="mt-8 border-t border-white/10 pt-8">
                            <h3 className="text-lg font-bold mb-6 text-[#e87a71]">AI Analysis Result</h3>
                            <div className="markdown-body bg-[#0c0406] p-8 rounded-2xl border border-white/5 shadow-inner">
                                <ReactMarkdown>{response}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Tools;
