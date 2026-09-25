import { useState } from "react";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL;

const RegisterForm = ({ onSwitchToLogin, onRegisterSuccess }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please complete all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, { credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to create your account.");
        return;
      }

      toast.success(data.message);
      onRegisterSuccess();
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      className="mt-2 grid gap-2"
      onSubmit={handleSubmit}
      noValidate
    >
      <label className="text-[14px] font-bold uppercase tracking-[0.12em] text-[#52656A] dark:text-[#A5C9CA]">Full name</label>
      <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your full name"
          className="h-11 w-full rounded-xl border border-[#D5E1E0] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] p-2 text-md font-normal tracking-normal text-[#2C3333] dark:text-[#E7F6F2] outline-none transition dark:placeholder:text-[#A5C9CA]/50 hover:border-[#A5C9CA] focus:border-[#395B64]"
        />

      <label className="text-[14px] font-bold uppercase tracking-[0.12em] text-[#52656A] dark:text-[#A5C9CA]">
        Email address   </label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="h-11 w-full rounded-xl border border-[#D5E1E0] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] p-3 text-md font-normal tracking-normal text-[#2C3333] dark:text-[#E7F6F2] outline-none transition placeholder:text-[#8A999B] dark:placeholder:text-[#A5C9CA]/50 hover:border-[#A5C9CA] focus:border-[#395B64]"
        />

      <label className="text-[14px] font-bold uppercase tracking-[0.12em] text-[#52656A] dark:text-[#A5C9CA]">
        Password    
      </label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          autoComplete="new-password"
          className="h-11 w-full rounded-xl border border-[#D5E1E0] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] p-3 text-md font-normal tracking-normal text-[#2C3333] dark:text-[#E7F6F2] outline-none transition placeholder:text-[#8A999B] dark:placeholder:text-[#A5C9CA]/50 hover:border-[#A5C9CA] focus:border-[#395B64]"
        />


      <label className="text-[14px] font-bold uppercase tracking-[0.12em] text-[#52656A] dark:text-[#A5C9CA]">
        Confirm password
      </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your password"
          autoComplete="new-password"
          className="h-11 w-full rounded-xl border border-[#D5E1E0] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] p-3 text-md font-normal tracking-normal text-[#2C3333] dark:text-[#E7F6F2] outline-none transition placeholder:text-[#8A999B] dark:placeholder:text-[#A5C9CA]/50 hover:border-[#A5C9CA] focus:border-[#395B64]"
        />

      {error && (
        <p className="flex items-start gap-2 rounded-xl border border-[#E8CACA] dark:border-rose-900/50 bg-[#FFF7F7] dark:bg-rose-950/30 px-3 py-2.5 text-xs leading-5 text-[#9B4D4D] dark:text-rose-300">
          <i className="fa-solid fa-circle-exclamation mt-0.5" aria-hidden="true" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#395B64] px-6 text-sm font-bold text-white shadow-[0_10px_20px_rgba(57,91,100,0.18)] transition hover:bg-[#2C3333] dark:hover:bg-[#4E717B] hover:shadow-[0_12px_24px_rgba(44,51,51,0.2)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Creating account..." : "Create account"}
        {!isLoading && <i className="fa-solid fa-arrow-right text-xs" />}
      </button>

      <p className="border-t border-[#E6EEED] dark:border-[#2C3333] pt-4 text-center text-sm text-[#52656A] dark:text-[#A5C9CA]">
        Already have an account?{" "}
        <button
          type="button"
          className="cursor-pointer font-semibold text-[#395B64] dark:text-white underline underline-offset-4"
          onClick={onSwitchToLogin}
        >
          Sign in
        </button>
      </p>
    </form>
  );
};

export default RegisterForm;