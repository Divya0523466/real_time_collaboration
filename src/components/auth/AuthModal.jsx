import { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

const AuthModal = ({ mode, onClose, onSwitchMode, onLoginSuccess }) => {
  const closeButton = useRef(null);

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-100 grid overflow-y-auto bg-[#2C3333]/55 px-4 py-6 backdrop-blur-sm sm:px-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="m-auto w-full max-w-115 animate-[auth-modal-in_240ms_ease-out] rounded-2xl bg-white dark:bg-[#1E2525] dark:border dark:border-[#395B64]/40 p-5 shadow-[0_24px_70px_rgba(44,51,51,0.3)] sm:p-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id="auth-title"
            className="text-[1.7rem] font-bold tracking-[-0.02em] text-[#2C3333] dark:text-[#E7F6F2]"
          >
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-[#E7F6F2] transition"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {mode === "login" ? (
          <LoginForm
            onSwitchToRegister={() => onSwitchMode("register")}
            onLoginSuccess={onLoginSuccess}
          />
        ) : (
          <RegisterForm
            onSwitchToLogin={() => onSwitchMode("login")}
            onRegisterSuccess={() => onSwitchMode("login")}
          />
        )}
      </div>
    </div>
  );
};

export default AuthModal;
