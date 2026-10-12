import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL;

const LoginForm = ({ onSwitchToRegister, onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 2FA in-memory state (never persisted to localStorage/sessionStorage)
  const [twoFactorState, setTwoFactorState] = useState(null); // { isPending: true, tempToken: string, maskedEmail: string }
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [challengeExhausted, setChallengeExhausted] = useState(false);

  const otpInputRefs = useRef([]);

  // Auto-focus first digit input when entering 2FA mode
  useEffect(() => {
    if (twoFactorState?.isPending) {
      otpInputRefs.current[0]?.focus();
    }
  }, [twoFactorState?.isPending]);

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (twoFactorState?.isPending && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [twoFactorState?.isPending, resendCooldown]);

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setError("");

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);
    setError("");
    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const handleBackToLogin = () => {
    setTwoFactorState(null);
    setOtpDigits(["", "", "", "", "", ""]);
    setError("");
    setChallengeExhausted(false);
  };

  const handleVerify2FA = async (event) => {
    if (event) event.preventDefault();
    if (isVerifying) return;

    const code = otpDigits.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setError("");
    setIsVerifying(true);

    try {
      const response = await fetch(`${API_URL}/auth/verify-2fa`, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tempToken: twoFactorState.tempToken,
          otp: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid verification code.");
        if (data.challengeExhausted || data.sessionExpired) {
          setChallengeExhausted(true);
        }
        return;
      }

      // Check if user is deactivated
      let isDeactivated = data.user?.isActive === false || data.user?.status === "inactive";
      try {
        const stored = localStorage.getItem("worknest_deactivated_users");
        const deactList = stored ? JSON.parse(stored) : [];
        const deactSet = new Set(deactList.map((x) => String(x).toLowerCase().trim()));
        const uid = String(data.user?.id || data.user?._id || "").toLowerCase().trim();
        const uemail = String(data.user?.email || email || "").toLowerCase().trim();
        if (deactSet.has(uid) || deactSet.has(uemail)) {
          isDeactivated = true;
        }
      } catch {
        // ignore
      }

      if (isDeactivated) {
        localStorage.removeItem("worknestToken");
        localStorage.removeItem("worknestUser");
        localStorage.removeItem("worknestWorkspaces");
        setError("Your account has been deactivated. Please contact the administrator.");
        return;
      }

      if (data.token) {
        localStorage.setItem("worknestToken", data.token);
        if (
          data.user?.email?.toLowerCase() === "admin@gmail.com" ||
          data.user?.role === "super_admin" ||
          data.user?.platformRole === "super_admin"
        ) {
          localStorage.setItem("worknest_admin_token", data.token);
        }
      }
      localStorage.setItem("worknestUser", JSON.stringify(data.user));
      localStorage.setItem("worknestWorkspaces", JSON.stringify(data.workspaces || []));

      toast.success(data.message || "Signed in successfully");
      onLoginSuccess(data.user, data.workspaces, data.token);
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend2FA = async () => {
    if (resendCooldown > 0 || isResending || challengeExhausted) return;

    setError("");
    setIsResending(true);

    try {
      const response = await fetch(`${API_URL}/auth/resend-2fa-otp`, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tempToken: twoFactorState.tempToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to resend code.");
        if (data.limitReached || data.sessionExpired) {
          setChallengeExhausted(true);
        }
        return;
      }

      toast.success(data.message || "A new verification code has been sent.");
      setResendCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // Check if this email is already marked deactivated
      try {
        const stored = localStorage.getItem("worknest_deactivated_users");
        const deactList = stored ? JSON.parse(stored) : [];
        const deactSet = new Set(deactList.map((x) => String(x).toLowerCase().trim()));
        if (deactSet.has(email.toLowerCase().trim())) {
          setError("Your account has been deactivated. Please contact the administrator.");
          setIsLoading(false);
          return;
        }
      } catch {
        // continue
      }

      const response = await fetch(`${API_URL}/auth/login`, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to sign in.");
        return;
      }

      // Check if 2FA challenge is required
      if (data.requires2FA) {
        setTwoFactorState({
          isPending: true,
          tempToken: data.tempToken,
          maskedEmail: data.maskedEmail || email,
        });
        setOtpDigits(["", "", "", "", "", ""]);
        setResendCooldown(60);
        setError("");
        setPassword("");
        setChallengeExhausted(false);
        return;
      }

      // Check if user is deactivated via API data or local deactivated store
      let isDeactivated = data.user?.isActive === false || data.user?.status === "inactive";
      try {
        const stored = localStorage.getItem("worknest_deactivated_users");
        const deactList = stored ? JSON.parse(stored) : [];
        const deactSet = new Set(deactList.map((x) => String(x).toLowerCase().trim()));
        const uid = String(data.user?.id || data.user?._id || "").toLowerCase().trim();
        const uemail = String(data.user?.email || email || "").toLowerCase().trim();
        if (deactSet.has(uid) || deactSet.has(uemail)) {
          isDeactivated = true;
        }
      } catch {
        // ignore
      }

      if (isDeactivated) {
        localStorage.removeItem("worknestToken");
        localStorage.removeItem("worknestUser");
        localStorage.removeItem("worknestWorkspaces");
        setError("Your account has been deactivated. Please contact the administrator.");
        return;
      }

      if (data.token) {
        localStorage.setItem("worknestToken", data.token);
        if (
          data.user?.email?.toLowerCase() === "admin@gmail.com" ||
          data.user?.role === "super_admin" ||
          data.user?.platformRole === "super_admin"
        ) {
          localStorage.setItem("worknest_admin_token", data.token);
        }
      }
      localStorage.setItem("worknestUser", JSON.stringify(data.user));
      localStorage.setItem("worknestWorkspaces", JSON.stringify(data.workspaces || []));

      toast.success(data.message || "Login successful");
      onLoginSuccess(data.user, data.workspaces, data.token);
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  // ── Render Two-Factor Verification Screen ──────────────────────────────
  if (twoFactorState?.isPending) {
    return (
      <div className="mt-1 grid gap-4 animate-[auth-modal-in_200ms_ease-out]">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F6F2] dark:bg-[#2C3333] text-[#395B64] dark:text-[#A5C9CA] text-xl shadow-xs">
            <i className="fa-solid fa-shield-halved" />
          </div>
          <h3 className="text-lg font-bold text-[#2C3333] dark:text-[#E7F6F2]">
            Two-Factor Authentication
          </h3>
          <p className="mt-1 text-xs text-[#52656A] dark:text-[#A5C9CA]/80 leading-relaxed max-w-xs mx-auto">
            We sent a 6-digit verification code to{" "}
            <span className="font-semibold text-[#2C3333] dark:text-[#E7F6F2]">
              {twoFactorState.maskedEmail}
            </span>
            . Enter it below to complete sign-in.
          </p>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#E8CACA] dark:border-rose-900/50 bg-[#FFF7F7] dark:bg-rose-950/30 px-3 py-2.5 text-xs leading-5 text-[#9B4D4D] dark:text-rose-300">
            <i className="fa-solid fa-circle-exclamation mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        {!challengeExhausted ? (
          <form onSubmit={handleVerify2FA} className="grid gap-4" noValidate>
            {/* 6 Digit Input Group */}
            <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpInputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  disabled={isVerifying}
                  className="h-12 w-10 sm:w-12 rounded-xl border border-[#D5E1E0] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] text-center text-xl font-bold text-[#2C3333] dark:text-[#E7F6F2] outline-none transition focus:border-[#395B64] dark:focus:border-[#A5C9CA] focus:bg-white dark:focus:bg-[#242D2D] disabled:opacity-50"
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isVerifying || otpDigits.join("").length !== 6}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#395B64] px-6 text-sm font-bold text-white shadow-xs transition hover:bg-[#2C3333] dark:hover:bg-[#4E717B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-xs" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify and Sign in</span>
                  <i className="fa-solid fa-arrow-right text-xs" />
                </>
              )}
            </button>

            {/* Resend Code Section */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E6EEED] dark:border-[#2C3333]">
              <span className="text-[#52656A] dark:text-[#A5C9CA]/80">
                Didn't receive the code?
              </span>
              <button
                type="button"
                onClick={handleResend2FA}
                disabled={resendCooldown > 0 || isResending}
                className="cursor-pointer font-semibold text-[#395B64] dark:text-[#A5C9CA] hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
              >
                {isResending
                  ? "Sending..."
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend Code"}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-2">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="px-4 py-2 rounded-xl bg-[#395B64] text-xs font-bold text-white hover:bg-[#2C3333] transition cursor-pointer"
            >
              Return to Sign in
            </button>
          </div>
        )}

        {/* Back to Login Link */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="cursor-pointer text-xs font-medium text-[#52656A] dark:text-[#A5C9CA]/70 hover:text-[#2C3333] dark:hover:text-white transition flex items-center justify-center gap-1.5 mx-auto"
          >
            <i className="fa-solid fa-arrow-left text-[10px]" />
            <span>Back to Login</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Render Standard Email / Password Form ──────────────────────────────
  return (
    <form
      className="mt-2 grid gap-3"
      onSubmit={handleSubmit}
      noValidate
    >
      <label className="text-[14px] font-bold uppercase tracking-[0.12em] text-[#52656A] dark:text-[#A5C9CA]">
        Email address
      </label>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="h-11 w-full rounded-xl border border-[#D5E1E0] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] p-3 font-normal tracking-normal text-[#2C3333] dark:text-[#E7F6F2] outline-none transition placeholder:text-[#8A999B] dark:placeholder:text-[#A5C9CA]/50 hover:border-[#A5C9CA] focus:border-[#395B64]"
      />

      <label className="text-[14px] font-bold uppercase tracking-[0.12em] text-[#52656A] dark:text-[#A5C9CA]">
        Password
      </label>
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter your password"
        className="h-11 w-full rounded-xl border border-[#D5E1E0] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] p-3 text-lg font-normal tracking-normal text-[#2C3333] dark:text-[#E7F6F2] outline-none transition placeholder:text-[#8A999B] dark:placeholder:text-[#A5C9CA]/50 hover:border-[#A5C9CA] focus:border-[#395B64]"
      />

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#E8CACA] dark:border-rose-900/50 bg-[#FFF7F7] dark:bg-rose-950/30 px-3 py-2.5 text-xs leading-5 text-[#9B4D4D] dark:text-rose-300">
          <i className="fa-solid fa-circle-exclamation mt-0.5" aria-hidden="true" />
          {error}
        </p>
      )}

      <p className="mb-3 text-right text-sm text-[#364042] dark:text-[#A5C9CA]">
        <a href="/forgot-password" className="underline underline-offset-4">
          Forgot Password?
        </a>
      </p>

      <button
        type="submit"
        disabled={isLoading}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#395B64] px-6 text-sm font-bold text-white shadow-[0_10px_20px_rgba(57,91,100,0.18)] transition hover:bg-[#2C3333] dark:hover:bg-[#4E717B] hover:shadow-[0_12px_24px_rgba(44,51,51,0.2)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Signing in..." : "Sign in"}
        {!isLoading && <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true" />}
      </button>

      <p className="border-t border-[#E6EEED] dark:border-[#2C3333] pt-3 text-center text-sm text-[#52656A] dark:text-[#A5C9CA]">
        Don't have an account?{" "}
        <button
          type="button"
          className="cursor-pointer font-semibold text-[#395B64] dark:text-white underline underline-offset-4"
          onClick={onSwitchToRegister}
        >
          Create one
        </button>
      </p>

      <button
        type="button"
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-[#dadce0] dark:border-[#8e918f] bg-white dark:bg-[#131314] px-6 text-[14px] font-medium text-[#3c4043] dark:text-[#e3e3e3] transition hover:bg-[#f8f9fa] dark:hover:bg-[#1e1e1e]"
        onClick={handleGoogleLogin}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-[18px] w-[18px]">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Continue with Google
      </button>
    </form>
  );
};

export default LoginForm;