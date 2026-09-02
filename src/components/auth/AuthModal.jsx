import { useEffect, useRef } from "react";
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
        className="m-auto w-full max-w-115 animate-[auth-modal-in_240ms_ease-out] rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgba(44,51,51,0.3)] sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <div className="flex justify-end">
          <button
            ref={closeButton}
            type="button"
            aria-label="Close authentication dialog"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-xl text-[#395B64] transition hover:bg-[#E7F6F2]"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="text-center">
          <h2
            id="auth-title"
            className="mt-1 text-2xl font-semibold tracking-tight text-[#2C3333]"
          >
            {mode === "login" ? "Welcome back" : "Create your WorkNest account"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#52656A]">
            {mode === "login"
              ? "Sign in to continue to your WorkNest workspace."
              : "Bring your team together and start collaborating in real time."}
          </p>
        </div>

        {mode === "login" ? (
          <LoginForm
            onSwitchToRegister={() => onSwitchMode("register")}
            onLoginSuccess={(user, workspaces) => onLoginSuccess(user, workspaces)}
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
