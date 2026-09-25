import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiX, FiLock } from "react-icons/fi";
import { toast } from "react-toastify";
const API_URL = import.meta.env.VITE_API_URL;

const SetPassword = () => {
  const location = useLocation();
  const email = location.state?.email || "";
  const otp = location.state?.otp || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError("Please fill all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!email || !otp) {
      setError("Missing reset information. Start over.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, { credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to reset password");
        return;
      }

      toast.success(data.message);
      navigate("/");
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 grid overflow-y-auto bg-[#2C3333]/70 px-4 py-6 backdrop-blur-md sm:px-6">
      <div className="m-auto w-full max-w-md animate-[auth-modal-in_240ms_ease-out] rounded-3xl bg-white dark:bg-[#1E2525] dark:border dark:border-[#395B64]/40 p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] sm:p-10">
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Close modal"
            className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-full text-[#52656A] hover:bg-[#F3F4F6] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-[#E7F6F2] transition"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="text-center mb-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F6F2] dark:bg-[#395B64]/30 mb-5">
            <FiLock className="text-2xl text-[#395B64] dark:text-[#A5C9CA]" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#2C3333] dark:text-[#E7F6F2]">
            Set New Password
          </h2>
          <p className="mt-3 text-sm text-[#52656A] dark:text-[#A5C9CA]/80">
            Create a strong, new password that you haven't used before.
          </p>
        </div>

        <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#52656A] dark:text-[#A5C9CA]">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
              className="h-11 w-full rounded-xl border border-[#D5E1E0] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] p-3 text-sm text-[#2C3333] dark:text-[#E7F6F2] outline-none transition dark:placeholder:text-[#A5C9CA]/50 hover:border-[#A5C9CA] focus:border-[#395B64]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#52656A] dark:text-[#A5C9CA]">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              className="h-11 w-full rounded-xl border border-[#D5E1E0] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] p-3 text-sm text-[#2C3333] dark:text-[#E7F6F2] outline-none transition dark:placeholder:text-[#A5C9CA]/50 hover:border-[#A5C9CA] focus:border-[#395B64]"
            />
          </div>
          {error && (
            <p className="flex items-start gap-2 rounded-xl border border-[#E8CACA] dark:border-rose-900/50 bg-[#FFF7F7] dark:bg-rose-950/30 px-3 py-2.5 text-xs leading-5 text-[#9B4D4D] dark:text-rose-300">
              <i
                className="fa-solid fa-circle-exclamation mt-0.5"
                aria-hidden="true"
              />
              {error}
            </p>
          )}
          <button
            type="submit"
            className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#395B64] px-6 text-sm font-bold text-white shadow-[0_4px_12px_rgba(57,91,100,0.15)] transition hover:bg-[#2C3333] dark:hover:bg-[#4E717B] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Updating..." : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;