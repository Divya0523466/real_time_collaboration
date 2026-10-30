import { useState, useEffect, lazy, Suspense } from "react";
import { Route, Routes, useNavigate, Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./App.css";
import AboutUs from "./components/AboutUs";
import ContactUs from "./components/ContactUs";
import Features from "./components/Features";
import Footer from "./components/Footer";
import FinalCta from "./components/FinalCta";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import Navbar from "./components/Navbar";
import WhyWorkNest from "./components/WhyWorkNest";
import AuthModal from "./components/auth/AuthModal";
import CreateWorkspaceModal from "./components/dashboard/CreateWorkspaceModal";
import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import { isSuperAdminUser, isDeactivatedAccount } from "./utils/adminAuth";
import { requestNotificationPermission } from "./utils/desktopNotification";

const SlackShell = lazy(() => import("./components/dashboard/SlackShell"));
const ChannelManagementPage = lazy(
  () => import("./components/dashboard/ChannelManagementPage"),
);
const ForgotPassword = lazy(() => import("./components/ForgotPassword"));
const OTP = lazy(() => import("./components/OTP"));
const SetPassword = lazy(() => import("./components/SetPassword"));
const SuperAdminDashboard = lazy(
  () => import("./components/admin/SuperAdminDashboard"),
);
const BillingSuccess = lazy(
  () => import("./components/billing/BillingSuccess"),
);
const BillingCancel = lazy(
  () => import("./components/billing/BillingCancel"),
);

const LandingPage = () => {
  const [authMode, setAuthMode] = useState(null);
  const navigate = useNavigate();
  const { initializeFromAuth } = useWorkspace();

  return (
    <div
      id="top"
      className="min-h-screen bg-white dark:bg-[#121717] text-[#2C3333] dark:text-[#E7F6F2] transition-colors duration-200"
    >
      <Navbar onOpenAuth={setAuthMode} />
      <Hero onOpenAuth={setAuthMode} />
      <Features />
      <HowItWorks />
      <WhyWorkNest />
      <AboutUs />
      <ContactUs />
      <FinalCta onOpenAuth={setAuthMode} />
      <Footer />
      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitchMode={setAuthMode}
          onLoginSuccess={(user, workspaces, token) => {
            setAuthMode(null);
            if (isDeactivatedAccount(user)) {
              localStorage.removeItem("worknestToken");
              localStorage.removeItem("worknestUser");
              localStorage.removeItem("worknestWorkspaces");
              toast.error(
                "Your account has been deactivated. Please contact the administrator.",
              );
              return;
            }
            const effectiveUser = isSuperAdminUser(user)
              ? {
                  ...user,
                  platformRole: "super_admin",
                  role: "admin",
                  isSuperAdmin: true,
                }
              : user;
            if (isSuperAdminUser(effectiveUser) && token) {
              localStorage.setItem("worknest_admin_token", token);
            }
            initializeFromAuth(effectiveUser, workspaces || [], token);
            if (isSuperAdminUser(effectiveUser)) {
              navigate("/admin");
            } else {
              const targetWs =
                workspaces && workspaces[0]
                  ? workspaces[0].id || workspaces[0]._id
                  : null;
              if (targetWs) {
                navigate(`/app/workspace/${targetWs}`);
              } else {
                navigate("/app");
              }
            }
          }}
        />
      )}
    </div>
  );
};

const SimpleLoading = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFB] dark:bg-[#121717] text-[#2C3333] dark:text-[#E7F6F2]">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-[#395B64] dark:border-t-[#A5C9CA]" />
      <span className="text-sm text-[#52656A] dark:text-[#A5C9CA]">
        Loading...
      </span>
    </div>
  </div>
);

const NoWorkspaceFallback = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { selectWorkspace, fetchUserWorkspaces } = useWorkspace();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFB] dark:bg-[#121717] px-6 text-[#2C3333] dark:text-[#E7F6F2]">
      <div className="w-full max-w-md rounded-3xl border border-[#D8E2E1] dark:border-[#395B64]/50 bg-white dark:bg-[#1E2525] p-8 text-center shadow-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E7F6F2] dark:bg-[#395B64]/40 text-3xl text-[#395B64] dark:text-[#A5C9CA] mx-auto mb-4">
          <i className="fa-solid fa-layer-group" />
        </div>
        <h2 className="text-xl font-bold text-[#2C3333] dark:text-white">
          Create your first workspace
        </h2>
        <p className="mt-2 text-sm text-[#52656A] dark:text-[#A5C9CA]">
          Bring your team together in one place to start collaborating.
        </p>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#395B64] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#2C3333] transition"
        >
          <i className="fa-solid fa-plus text-xs" /> Create workspace
        </button>
      </div>

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={async (ws) => {
            setShowCreateModal(false);
            await fetchUserWorkspaces().catch(() => {});
            const targetId = ws?.id || ws?._id;
            if (targetId) {
              selectWorkspace(targetId);
              navigate(`/app/workspace/${targetId}`);
            }
          }}
        />
      )}
    </div>
  );
};

const WorkspaceResolver = () => {
  const { user, workspaces, workspaceData, fetchUserWorkspaces, loading } =
    useWorkspace();
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  useEffect(() => {
    if (!hasAttemptedFetch && (!workspaces || workspaces.length === 0)) {
      setHasAttemptedFetch(true);
      fetchUserWorkspaces().catch(() => {});
    }
  }, [hasAttemptedFetch, workspaces, fetchUserWorkspaces]);

  if (isSuperAdminUser(user)) {
    return <Navigate to="/admin" replace />;
  }

  const preferredId =
    workspaceData?.id ||
    workspaceData?._id ||
    workspaces?.[0]?.id ||
    workspaces?.[0]?._id;

  if (preferredId) {
    return <Navigate to={`/app/workspace/${preferredId}`} replace />;
  }

  if (loading && !hasAttemptedFetch) {
    return <SimpleLoading />;
  }

  return <NoWorkspaceFallback />;
};

const PublicRoute = ({ children }) => {
  const { user, isInitializing, workspaces, workspaceData } = useWorkspace();

  if (isInitializing) {
    return <SimpleLoading />;
  }

  if (user) {
    if (isSuperAdminUser(user)) {
      return <Navigate to="/admin" replace />;
    }
    const targetWs =
      workspaceData?.id ||
      workspaceData?._id ||
      workspaces?.[0]?.id ||
      workspaces?.[0]?._id;
    if (targetWs) {
      return <Navigate to={`/app/workspace/${targetWs}`} replace />;
    }
    return <Navigate to="/app" replace />;
  }
  return children;
};

const ProtectedRoute = ({ children }) => {
  const { user, isInitializing } = useWorkspace();

  if (isInitializing) {
    return <SimpleLoading />;
  }

  if (!user || isDeactivatedAccount(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const SuperAdminRoute = ({ children }) => {
  const { user, isInitializing, workspaces, workspaceData } = useWorkspace();

  if (isInitializing) {
    return <SimpleLoading />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isSuperAdminUser(user)) {
    const targetWs =
      workspaceData?.id ||
      workspaceData?._id ||
      workspaces?.[0]?.id ||
      workspaces?.[0]?._id;
    if (targetWs) {
      return <Navigate to={`/app/workspace/${targetWs}`} replace />;
    }
    return <Navigate to="/app" replace />;
  }

  return children;
};

const AppRoutes = () => {
  useEffect(() => {
    // Automatically ask for permission when the website opens
    if ("Notification" in window && Notification.permission === "default") {
      requestNotificationPermission();
    }
  }, []);

  return (
    <Suspense fallback={<SimpleLoading />}>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <WorkspaceResolver />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/dashboard"
          element={
            <ProtectedRoute>
              <WorkspaceResolver />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/workspace"
          element={
            <ProtectedRoute>
              <WorkspaceResolver />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/workspace/:workspaceId/channels-manage"
          element={
            <ProtectedRoute>
              <ChannelManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/workspace/:workspaceId"
          element={
            <ProtectedRoute>
              <SlackShell />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/workspace/:workspaceId/channel/:channelId"
          element={
            <ProtectedRoute>
              <SlackShell />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/workspace/:workspaceId/space/:spaceId"
          element={
            <ProtectedRoute>
              <SlackShell />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          }
        />
        <Route
          path="/super-admin"
          element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          }
        />
        <Route
          path="/app/admin"
          element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/enter-otp"
          element={
            <PublicRoute>
              <OTP />
            </PublicRoute>
          }
        />
        <Route
          path="/set-password"
          element={
            <PublicRoute>
              <SetPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/billing/success"
          element={
            <ProtectedRoute>
              <BillingSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing/cancel"
          element={
            <ProtectedRoute>
              <BillingCancel />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  return (
    <WorkspaceProvider>
      <AppRoutes />
    </WorkspaceProvider>
  );
};

export default App;
