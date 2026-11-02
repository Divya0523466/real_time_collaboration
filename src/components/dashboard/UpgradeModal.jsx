import { useState, useEffect } from "react";
import {
  createCheckoutSessionApi,
  submitManualPaymentApi,
  getMyManualPaymentStatusApi,
} from "../../services/billingService";
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
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [transactionRef, setTransactionRef] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [existingPayment, setExistingPayment] = useState(null);

  useEffect(() => {
    getMyManualPaymentStatusApi()
      .then((data) => {
        if (data?.payment) {
          setExistingPayment(data.payment);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshotFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleStripeCheckout = async () => {
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
      setError(err.message || "Could not start Stripe checkout.");
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!transactionRef.trim()) {
      setError("Please enter your transaction ID or reference number.");
      return;
    }

    if (!screenshotFile) {
      setError("Please upload a screenshot of your payment receipt.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("transactionReference", transactionRef.trim());
      formData.append("amount", "12");
      formData.append("screenshot", screenshotFile);

      const response = await submitManualPaymentApi(formData);
      setExistingPayment(response.payment);
      toast.success("Payment proof submitted successfully!");
    } catch (err) {
      setError(err.message || "Failed to submit payment proof.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPaymentId = () => {
    navigator.clipboard.writeText("worknest.pay@okaxis");
    toast.success("Payment ID copied to clipboard!");
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
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] hover:bg-[#F0F4F4] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3636] dark:hover:text-white transition cursor-pointer disabled:opacity-50"
          aria-label="Close"
        >
          <i className="fa-solid fa-xmark text-base" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] border border-[#A5C9CA]/40 dark:border-[#395B64]/40">
            <i className="fa-solid fa-crown text-xs" />
            <span>WorkNest Pro</span>
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-[#2C3333] dark:text-white tracking-tight">
          Upgrade to WorkNest Pro
        </h2>
        <p className="text-xs sm:text-sm text-[#52656A] dark:text-[#A5C9CA]/80 mt-1 mb-4">
          Get unlimited workspaces, channels, spaces, and 50GB file storage.
        </p>

        {/* Pricing Summary */}
        <div className="rounded-xl bg-[#E7F6F2] dark:bg-[#182121] border border-[#A5C9CA]/60 dark:border-[#395B64]/40 p-3.5 mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-[#2C3333] dark:text-white">
                $12
              </span>
              <span className="text-xs font-medium text-[#52656A] dark:text-[#A5C9CA]">
                / month
              </span>
            </div>
            <p className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70 mt-0.5">
              Pro access • 30 days validity
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#395B64] dark:text-[#A5C9CA] bg-white/80 dark:bg-[#2C3636] px-2.5 py-1 rounded-md border border-[#A5C9CA]/40 dark:border-[#395B64]/50">
            <i className="fa-solid fa-check text-[10px]" />
            <span>All Pro Features</span>
          </span>
        </div>

        {/* Payment Method Selector Tabs */}
        <div className="flex rounded-xl bg-[#F0F4F4] dark:bg-[#161D1D] p-1 mb-4 border border-[#D8E2E1] dark:border-[#2C3333]">
          <button
            type="button"
            onClick={() => {
              setPaymentMethod("stripe");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
              paymentMethod === "stripe"
                ? "bg-white dark:bg-[#242D2D] text-[#2C3333] dark:text-white shadow-xs"
                : "text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333]"
            }`}
          >
            <i className="fa-solid fa-credit-card text-xs" />
            <span>Payments</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPaymentMethod("qr");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
              paymentMethod === "qr"
                ? "bg-white dark:bg-[#242D2D] text-[#2C3333] dark:text-white shadow-xs"
                : "text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333]"
            }`}
          >
            <i className="fa-solid fa-qrcode text-xs" />
            <span>Manual Payment</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0 text-sm mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Stripe Card Checkout */}
        {paymentMethod === "stripe" && (
          <div className="space-y-4">
            <div className="space-y-2">
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

            <button
              type="button"
              onClick={handleStripeCheckout}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-[#395B64] hover:bg-[#2C3333] dark:hover:bg-[#2C3636] shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-sm" />
                  <span>Connecting to Stripe...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-lock text-xs" />
                  <span>Pay with Card • $12/month</span>
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
              Card payment failing? Click <strong>Scan QR Code</strong> above to
              pay via phone.
            </p>
          </div>
        )}

        {paymentMethod === "qr" && (
          <div>
            {existingPayment && existingPayment.status === "PENDING" ? (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-4 text-center space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-xl">
                  <i className="fa-solid fa-clock-rotate-left" />
                </div>
                <h3 className="text-sm font-bold text-[#2C3333] dark:text-white">
                  Payment Verification Pending
                </h3>
                <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]">
                  Your payment screenshot has been submitted and is waiting for
                  Super Admin verification.
                </p>
                <div className="rounded-lg bg-white dark:bg-[#1E2525] p-2.5 text-xs border border-amber-200 dark:border-amber-900/40 text-left">
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#52656A] dark:text-[#A5C9CA]">
                      Reference:
                    </span>
                    <span className="font-semibold text-[#2C3333] dark:text-white">
                      {existingPayment.transactionReference}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#52656A] dark:text-[#A5C9CA]">
                      Amount:
                    </span>
                    <span className="font-semibold text-[#2C3333] dark:text-white">
                      ${existingPayment.amount}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                {existingPayment && existingPayment.status === "REJECTED" && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-400">
                    <p className="font-semibold">
                      Previous submission rejected:
                    </p>
                    <p>
                      {existingPayment.adminNotes ||
                        "Could not verify payment."}
                    </p>
                    <p className="mt-1 text-[11px]">
                      Please review and submit a fresh payment screenshot below.
                    </p>
                  </div>
                )}

                {/* QR Code and Info */}
                <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-[#D8E2E1] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#182121] p-3.5">
                  <div className="h-32 w-32 flex-shrink-0 bg-white p-1.5 rounded-lg border border-[#D8E2E1] shadow-xs flex items-center justify-center">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=worknest.pay@okaxis&pn=WorkNest&am=12&cu=USD&tn=WorkNest%20Pro"
                      alt="WorkNest Payment QR Code"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5 text-center sm:text-left">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#395B64] dark:text-[#A5C9CA]">
                      Scan & Pay on Phone
                    </p>
                    <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]">
                      Scan using Google Pay, PhonePe, Paytm, or any banking app.
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <span className="text-xs font-mono font-semibold text-[#2C3333] dark:text-white bg-white dark:bg-[#242D2D] px-2 py-1 rounded border border-[#D8E2E1] dark:border-[#395B64]/40">
                        worknest.pay@okaxis
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPaymentId}
                        className="text-xs text-[#395B64] dark:text-[#A5C9CA] hover:underline cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transaction Reference Input */}
                <div>
                  <label className="block text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2] mb-1">
                    Transaction ID / Reference Number *
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UPI Ref / UTR / Order ID"
                    required
                    className="w-full rounded-xl border border-[#A5C9CA] dark:border-[#395B64] bg-white dark:bg-[#242D2D] px-3.5 py-2 text-xs text-[#2C3333] dark:text-[#E7F6F2] placeholder-[#7B8B8F] dark:placeholder-[#A5C9CA]/50 focus:border-[#395B64] focus:outline-none"
                  />
                </div>

                {/* Screenshot Upload */}
                <div>
                  <label className="block text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2] mb-1">
                    Upload Payment Screenshot *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    required
                    className="w-full text-xs text-[#52656A] dark:text-[#A5C9CA] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#395B64] file:text-white hover:file:bg-[#2C3333] file:cursor-pointer"
                  />

                  {previewUrl && (
                    <div className="mt-2.5 rounded-lg border border-[#D8E2E1] dark:border-[#395B64] p-1 max-w-[140px] bg-white dark:bg-[#242D2D]">
                      <img
                        src={previewUrl}
                        alt="Receipt preview"
                        className="h-20 w-full object-cover rounded"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-[#395B64] hover:bg-[#2C3333] dark:hover:bg-[#2C3636] shadow-xs transition cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-sm" />
                      <span>Submitting Proof...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane text-xs" />
                      <span>Submit Payment Proof for Approval</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpgradeModal;
