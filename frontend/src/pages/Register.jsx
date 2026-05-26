import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch("API_BASE_URL/api/v1/user/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name: email.split("@")[0], email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Registration failed");
      }
      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-white font-sans">
      {/* Left Pane */}
      <div className="w-full md:w-1/2 relative flex flex-col justify-center p-10 md:p-16 bg-gradient-to-br from-[#3b0d18] to-[#0a0204] min-h-[40vh] md:min-h-screen">
        <div className="absolute top-8 left-8 flex items-center gap-2">
          <div className="bg-[#c13024] p-1.5 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
          </div>
          <span className="font-bold text-xl">MedAssist</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-6xl font-extrabold mb-6 leading-tight">
            Care,<br />clarified.
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            A trusted medical companion that listens, explains, and guides you to the next right step.
          </p>
        </div>

        <div className="mt-12 md:absolute md:bottom-8 md:left-8 text-gray-500 text-sm">
          © MedAssist · For informational purposes only
        </div>
      </div>

      {/* Right Pane */}
      <div className="w-full md:w-1/2 flex justify-center items-center bg-[#09090b] relative p-8 md:p-0 min-h-[60vh] md:min-h-screen">
        <form onSubmit={handleRegister} className="w-full max-w-[400px]">
          <h2 className="text-4xl font-bold mb-2">Create your account</h2>
          <p className="text-gray-400 mb-8">Start chatting with MedAssist in seconds</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full p-3 bg-[#131315] border border-white/10 rounded-lg outline-none focus:border-white/30 text-white placeholder-gray-600 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full p-3 bg-[#131315] border border-white/10 rounded-lg outline-none focus:border-white/30 text-white placeholder-gray-600 transition-colors pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 bg-[#c13024] hover:bg-[#a6251a] p-3 rounded-lg text-white font-medium transition-all shadow-[0_0_15px_rgba(193,48,36,0.3)]"
            >
              Create account
            </button>
          </div>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Have an account?{" "}
            <Link to="/login" className="text-[#c13024] hover:text-[#a6251a] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </form>

        <button className="hidden md:flex absolute bottom-8 right-8 w-8 h-8 rounded-full bg-white/10 items-center justify-center text-gray-400 hover:bg-white/20 transition-colors">
          ?
        </button>
      </div>
    </div>
  );
}

export default Register;