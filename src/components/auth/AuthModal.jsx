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
        className="m-auto w-full max-w-115 animate-[auth-modal-in_240ms_ease-out] rounded-2xl bg-white p-5 shadow-[0_24px_70px_rgba(44,51,51,0.3)] sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
       

        <div className="text-left">
          <h2
            id="auth-title"
            className="text-[1.7rem] font-bold tracking-[-0.02em] text-[#2C3333]"
          >
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
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
