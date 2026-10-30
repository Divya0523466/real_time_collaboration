import { useNavigate } from "react-router-dom";

const BillingCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB] dark:bg-[#121717] px-4 py-8 text-[#2C3333] dark:text-[#E7F6F2]">
      <div className="w-full max-w-md rounded-2xl border border-[#D8E2E1] dark:border-[#395B64]/50 bg-white dark:bg-[#1E2525] p-7 text-center shadow-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F6F2] text-[#395B64] dark:bg-[#395B64]/30 dark:text-[#A5C9CA] mx-auto mb-4">
          <i className="fa-solid fa-arrow-rotate-left text-xl" />
        </div>

        <h2 className="text-xl font-bold text-[#2C3333] dark:text-white">
          Payment Cancelled
        </h2>
        <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80 mt-1.5 mb-6">
          You were not charged. Your account remains on the <strong>Free</strong> plan. You can upgrade anytime.
        </p>

        <button
          type="button"
          onClick={() => navigate("/app")}
          className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-[#395B64] hover:bg-[#2C3333] dark:hover:bg-[#2C3636] transition cursor-pointer"
        >
          Return to Workspace
        </button>
      </div>
    </div>
  );
};

export default BillingCancel;
