import { useState } from "react";
import { createCheckoutSessionApi } from "../../services/billingService";
import { toast } from "react-toastify";

const PRO_FEATURES = [
  {
    icon: "fa-solid fa-layer-group",
    title: "Unlimited Workspaces",
    desc: "Create and join multiple team workspaces without restrictions.",
  },
  {
    icon: "fa-solid fa-hashtag",
    title: "Unlimited Channels & Spaces",
    desc: "Organize communication across unlimited public and private channels.",
  },
  {
    icon: "fa-solid fa-cloud-arrow-up",
    title: "50 GB File & Media Storage",
    desc: "Share large documents, media files, and attachments with your team.",
  },
];

const UpgradeModal = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await createCheckoutSessionApi();
      if (data?.url) {
        toast.info("Redirecting to Stripe Checkout...");
        window.location.href = data.url;
      } else {
        throw new Error("Unable to start checkout session.");
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      setError(
        err.message ||
          "Could not start checkout. Please check if STRIPE_SECRET_KEY is configured in backend/.env",
      );
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid overflow-y-auto bg-[#2C3333]/60 px-4 py-6 backdrop-blur-xs sm:px-6 animate-[fadeIn_0.15s_ease-out]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        className="m-auto w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#1E2525] border border-[#D8E2E1] dark:border-[#395B64]/50 p-5 sm:p-7 shadow-2xl transition-colors relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] hover:bg-[#F0F4F4] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3636] dark:hover:text-white transition cursor-pointer disabled:opacity-50"
          aria-label="Close"
        >
          <i className="fa-solid fa-xmark text-base" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] border border-[#A5C9CA]/40 dark:border-[#395B64]/40">
            <i className="fa-solid fa-crown text-xs" />
            <span>WorkNest Pro</span>
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-[#2C3333] dark:text-white tracking-tight">
          Upgrade to WorkNest Pro
        </h2>
        <p className="text-xs sm:text-sm text-[#52656A] dark:text-[#A5C9CA]/80 mt-1 mb-4">
          Get unlimited workspaces, channels, and enhanced storage for your team.
        </p>

        {/* Pricing Card */}
        <div className="rounded-xl bg-[#E7F6F2] dark:bg-[#182121] border border-[#A5C9CA]/60 dark:border-[#395B64]/40 p-4 mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#2C3333] dark:text-white">
                $12
              </span>
              <span className="text-xs sm:text-sm font-medium text-[#52656A] dark:text-[#A5C9CA]">
                / month
              </span>
            </div>
            <p className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70 mt-0.5">
              Monthly billing • Cancel anytime
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#395B64] dark:text-[#A5C9CA] bg-white/80 dark:bg-[#2C3636] px-2.5 py-1 rounded-md border border-[#A5C9CA]/40 dark:border-[#395B64]/50">
            <i className="fa-solid fa-check text-[10px]" />
            <span>Pro Access</span>
          </span>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0 text-sm mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Feature List */}
        <div className="space-y-2 mb-5">
          {PRO_FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="flex items-start gap-3 rounded-lg border border-[#D8E2E1]/60 dark:border-[#2C3636] bg-[#F8FAFB] dark:bg-[#1C2324] p-2.5"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#E7F6F2] text-[#395B64] dark:bg-[#395B64]/30 dark:text-[#A5C9CA] text-xs">
                <i className={feat.icon} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2]">
                  {feat.title}
                </h4>
                <p className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/80">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-[#395B64] hover:bg-[#2C3333] dark:hover:bg-[#2C3636] shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-sm" />
                <span>Connecting to Stripe...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-lock text-xs" />
                <span>Upgrade to Pro • $12/month</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
            <i className="fa-solid fa-shield-halved text-[10px]" />
            <span>Secure checkout powered by Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
