import {useState} from 'react';
import {useNavigate} from "react-router-dom";
import { FiX } from "react-icons/fi";
const API_URL = import.meta.env.VITE_API_URL;
import { toast } from "react-toastify";

const OTP = () => {
   const [otp, setOTP] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
     const handleSubmit = async (event) => {
        event.preventDefault();
        if (!otp.trim()) {
          setError("Please enter OTP");
          return;
        }
        setError("");
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/auth/verify-otp`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ OTP }),
          });
    
          const data = await response.json();
    
          if (!response.ok) {
            setError(data.message || "Unable to verify OTP");
            return;
          }
    
          toast.success(data.message);
          setOTP("");
          navigate("/set-password");
        } catch {
          setError("Unable to connect to the server.");
        } finally {
          setLoading(false);
        }
      };
  return (
     <div className="fixed inset-0 z-100 grid overflow-y-auto bg-[#2C3333]/55 px-4 py-6 backdrop-blur-sm sm:px-6">
          <div className="m-auto w-full max-w-115 animate-[auth-modal-in_240ms_ease-out] rounded-2xl bg-white dark:bg-[#1E2525] dark:border dark:border-[#395B64]/40 p-5 shadow-[0_24px_70px_rgba(44,51,51,0.3)] sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] sm:text-[1.7rem] font-bold tracking-[-0.02em] text-[#2C3333] dark:text-[#E7F6F2]">
                Enter OTP
              </h2>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                aria-label="Close modal"
                className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-[#E7F6F2] transition"
              >
                <FiX className="text-xl" />
              </button>
            </div>
    
            <form className="mt-2 grid gap-4" onSubmit={handleSubmit} noValidate>
              <label className="text-[16px] font-bold tracking-[0.12em] text-[#52656A] dark:text-[#A5C9CA]">
                Enter OTP Recieved
              </label>
              <input
                type="text"
                value={otp}
                onChange={(event) => setOTP(event.target.value)}
                placeholder="Enter OTP"
                className="h-11 w-full rounded-xl border border-[#D5E1E0] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] p-2 text-md font-normal tracking-normal text-[#2C3333] dark:text-[#E7F6F2] outline-none transition dark:placeholder:text-[#A5C9CA]/50 hover:border-[#A5C9CA] focus:border-[#395B64]"
              />
              {error && (
                <p className="flex items-start gap-2 rounded-xl border border-[#E8CACA] dark:border-rose-900/50 bg-[#FFF7F7] dark:bg-rose-950/30 px-3 py-2.5 text-xs leading-5 text-[#9B4D4D] dark:text-rose-300">
                  <i
                    className="fa-solid fa-circle-exclamation mt-0.5"
                    aria-hidden="true"
                  />
                  {error}
                </p>
              )}
              <div className="flex gap-[10px] mt-4">
              <button
                type="submit"
                className="flex h-12 w-[180px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#395B64] px-6 text-sm font-bold text-white shadow-[0_10px_20px_rgba(57,91,100,0.18)] transition hover:bg-[#2C3333] dark:hover:bg-[#4E717B] hover:shadow-[0_12px_24px_rgba(44,51,51,0.2)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Verifying OTP..." : "Verify"}
              </button>
               <button
                className="flex h-12 w-[180px] cursor-pointer border items-center gap-2 rounded-xl border-[#dbe4e4] dark:border-[#395B64] px-3 py-1.5 text-sm font-semibold text-[#303536] dark:text-[#E7F6F2] transition hover:bg-[#f1f7f6] dark:hover:bg-[#2C3333] sm:px-6 sm:py-2 sm:text-base disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              </div>
            </form>
          </div>
        </div>
  )
}

export default OTP