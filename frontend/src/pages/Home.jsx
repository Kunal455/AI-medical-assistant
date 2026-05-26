import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config";

function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/user/profile`, {
          credentials: "include"
        });
        if (res.ok) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#090507] text-white font-sans selection:bg-red-500/30">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-red-900/20 blur-[120px] rounded-full pointer-events-none"></div>

      <nav className="flex justify-between items-center px-12 py-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="bg-[#c13024] p-1.5 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
          </div>
          <span className="font-bold text-xl">MedAssist</span>
        </div>

        <div className="space-x-6 text-sm font-medium">
          {isLoggedIn ? (
            <Link
              to="/chat"
              className="bg-[#c13024] hover:bg-[#a6251a] px-5 py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(193,48,36,0.3)]"
            >
              Go to Chat
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link
                to="/register"
                className="bg-[#c13024] hover:bg-[#a6251a] px-5 py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(193,48,36,0.3)]"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 text-center mt-12">
        <div className="border border-red-900/40 bg-red-950/10 text-red-200/80 text-xs font-medium px-4 py-1.5 rounded-full mb-8 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          Evidence-based · Private · Always available
        </div>

        <h1 className="text-7xl font-extrabold leading-tight max-w-4xl tracking-tight">
          Your AI <span className="text-[#e87a71]">medical</span>
          <br />
          assistant for <span className="text-[#e87a71]">clearer</span>
          <br />
          health <span className="text-[#e87a71]">answers</span>
        </h1>

        <p className="text-gray-400 mt-8 text-lg max-w-2xl leading-relaxed">
          Ask about symptoms, medications, conditions, and care pathways. MedAssist explains options in plain language and points you toward the right next step.
        </p>

        <div className="mt-10 flex gap-4">
          {isLoggedIn ? (
            <Link
              to="/chat"
              className="bg-[#c13024] hover:bg-[#a6251a] px-8 py-3.5 rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(193,48,36,0.4)] flex items-center gap-2"
            >
              Continue to Chat <span className="text-lg">→</span>
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="bg-[#c13024] hover:bg-[#a6251a] px-8 py-3.5 rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(193,48,36,0.4)] flex items-center gap-2"
              >
                Start free <span className="text-lg">→</span>
              </Link>
              <Link
                to="/login"
                className="border border-white/10 hover:bg-white/5 bg-transparent px-8 py-3.5 rounded-xl font-medium transition-colors"
              >
                I have an account
              </Link>
            </>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-24 mb-16 text-left">
          <div className="bg-[#120a0d] border border-red-900/20 p-8 rounded-2xl">
            <div className="w-10 h-10 bg-red-950/50 rounded-full flex items-center justify-center text-[#e87a71] mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
            </div>
            <h3 className="text-[#e87a71] font-semibold text-lg mb-2">Symptom guidance</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Differentials and red-flag warnings, in plain language.</p>
          </div>

          <div className="bg-[#120a0d] border border-red-900/20 p-8 rounded-2xl">
            <div className="w-10 h-10 bg-red-950/50 rounded-full flex items-center justify-center text-[#e87a71] mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <h3 className="text-[#e87a71] font-semibold text-lg mb-2">Private by design</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Your conversations stay tied to your account.</p>
          </div>

          <div className="bg-[#120a0d] border border-red-900/20 p-8 rounded-2xl">
            <div className="w-10 h-10 bg-red-950/50 rounded-full flex items-center justify-center text-[#e87a71] mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
            </div>
            <h3 className="text-[#e87a71] font-semibold text-lg mb-2">Clinician-friendly</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Switch to clinical mode for terminology and depth.</p>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 border-t border-white/5 text-gray-500 text-xs px-6 flex justify-between items-center relative">
        <p className="w-full text-center">MedAssist provides general information and is not a substitute for professional medical advice, diagnosis, or treatment. In an emergency, call your local emergency services.</p>
        <button className="absolute right-6 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:bg-white/20 transition-colors">
          ?
        </button>
      </footer>
    </div>
  );
}

export default Home;