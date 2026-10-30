import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifySessionApi } from "../../services/billingService";
import { useWorkspace } from "../../context/WorkspaceContext";

const BillingSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const { setUser } = useWorkspace();

  const [status, setStatus] = useState("verifying"); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMessage("No session ID found in callback.");
      return;
    }

    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const verify = async () => {
      try {
        const res = await verifySessionApi(sessionId);
        if (res.success) {
          setStatus("success");
          if (setUser && res.user) {
            setUser((prev) => {
              const updated = {
                ...prev,
                ...res.user,
                subscription: res.subscription || { plan: "PRO", status: "active" },
              };
              localStorage.setItem("worknestUser", JSON.stringify(updated));
              return updated;
            });
          }
        } else {
          setStatus("error");
          setErrorMessage(res.message || "Could not verify your subscription.");
        }
      } catch (err) {
        console.error("Verification error:", err);
        setStatus("error");
        setErrorMessage(
          err.message || "Failed to confirm payment with Stripe server.",
        );
      }
    };

    verify();
  }, [sessionId, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB] dark:bg-[#121717] px-4 py-8 text-[#2C3333] dark:text-[#E7F6F2]">
      <div className="w-full max-w-md rounded-2xl border border-[#D8E2E1] dark:border-[#395B64]/50 bg-white dark:bg-[#1E2525] p-7 text-center shadow-xl">
        {status === "verifying" && (
          <div className="space-y-4 py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] mx-auto">
              <i className="fa-solid fa-circle-notch fa-spin text-xl" />
            </div>
            <h2 className="text-xl font-bold text-[#2C3333] dark:text-white">
              Activating WorkNest Pro...
            </h2>
            <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80">
              Please wait a moment while we confirm your payment with Stripe.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 py-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E7F6F2] text-[#395B64] dark:bg-[#395B64]/30 dark:text-[#A5C9CA] mx-auto">
              <i className="fa-solid fa-crown text-2xl" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#395B64] text-white dark:bg-[#A5C9CA] dark:text-[#1E2525] mb-2">
                <i className="fa-solid fa-check text-[10px]" />
                Pro Activated
              </span>
              <h2 className="text-xl font-bold text-[#2C3333] dark:text-white mt-1">
                Welcome to WorkNest Pro
              </h2>
              <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80 mt-1">
                Your payment was successful. Premium workspace features are now unlocked.
              </p>
            </div>

            <div className="rounded-xl border border-[#D8E2E1]/70 dark:border-[#2C3636] bg-[#F8FAFB] dark:bg-[#181F20] p-3 text-left space-y-1.5 text-xs text-[#2C3333] dark:text-[#E7F6F2]">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-check text-[#395B64] dark:text-[#A5C9CA] text-xs" />
                <span>Unlimited Workspaces and Channels</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-check text-[#395B64] dark:text-[#A5C9CA] text-xs" />
                <span>50 GB File & Document Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-check text-[#395B64] dark:text-[#A5C9CA] text-xs" />
                <span>Pro Member Badge on your Profile</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/app")}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-[#395B64] hover:bg-[#2C3333] dark:hover:bg-[#2C3636] shadow-xs transition cursor-pointer"
            >
              Continue to Workspace
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 mx-auto">
              <i className="fa-solid fa-circle-exclamation text-xl" />
            </div>
            <h2 className="text-lg font-bold text-[#2C3333] dark:text-white">
              Unable to verify payment
            </h2>
            <p className="text-xs text-rose-600 dark:text-rose-400">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => navigate("/app")}
              className="w-full py-2 px-4 rounded-xl font-medium text-xs border border-[#D8E2E1] dark:border-[#395B64]/50 text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F0F4F4] dark:hover:bg-[#242D2D] transition cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingSuccess;
