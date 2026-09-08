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
      const response = await fetch(`${API_URL}/auth/register`, {
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
      className="mt-6 grid gap-4"
      onSubmit={handleSubmit}
      noValidate
    >
      <label className="grid gap-1.5 text-md font-semibold text-[#2C3333]">
        Full Name

        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your full name"
          autoComplete="name"
          className="w-full rounded-lg border border-[#A5C9CA] bg-white px-4 py-3 font-normal text-[#2C3333] outline-none transition placeholder:text-[#52656A]/55 focus:border-[#395B64] focus:ring-2 focus:ring-[#E7F6F2]"
        />
      </label>

      <label className="grid gap-1.5 text-md font-semibold text-[#2C3333]">
        Email

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full rounded-lg border border-[#A5C9CA] bg-white px-4 py-3 font-normal text-[#2C3333] outline-none transition placeholder:text-[#52656A]/55 focus:border-[#395B64] focus:ring-2 focus:ring-[#E7F6F2]"
        />
      </label>

      <label className="grid gap-1.5 text-md font-semibold text-[#2C3333]">
        Password

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          autoComplete="new-password"
          className="w-full rounded-lg border border-[#A5C9CA] bg-white px-4 py-3 font-normal text-[#2C3333] outline-none transition placeholder:text-[#52656A]/55 focus:border-[#395B64] focus:ring-2 focus:ring-[#E7F6F2]"
        />
      </label>

      <label className="grid gap-1.5 text-md font-semibold text-[#2C3333]">
        Confirm Password

        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your password"
          autoComplete="new-password"
          className="w-full rounded-lg border border-[#A5C9CA] bg-white px-4 py-3 font-normal text-[#2C3333] outline-none transition placeholder:text-[#52656A]/55 focus:border-[#395B64] focus:ring-2 focus:ring-[#E7F6F2]"
        />
      </label>

      {error && (
        <p className="text-xs text-[#9B4D4D]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full cursor-pointer rounded-full bg-[#395B64] px-6 py-3 font-semibold text-white shadow-[0_10px_20px_rgba(57,91,100,0.18)] transition hover:bg-[#2C3333] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Creating Account..." : "Create Account"}
      </button>

      <p className="text-center text-sm text-[#52656A]">
        Already have an account?{" "}
        <button
          type="button"
          className="cursor-pointer font-semibold text-[#395B64] underline underline-offset-4"
          onClick={onSwitchToLogin}
        >
          Sign in
        </button>
      </p>
    </form>
  );
};

export default RegisterForm;