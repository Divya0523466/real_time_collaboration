import { useState, useEffect } from "react"
import { Route, Routes, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import "./App.css"
import AboutUs from "./components/AboutUs"
import ContactUs from "./components/ContactUs"
import Features from "./components/Features"
import Footer from "./components/Footer" 
import FinalCta from "./components/FinalCta"
import Hero from "./components/Hero"
import HowItWorks from "./components/HowItWorks"
import Navbar from "./components/Navbar"
import WhyWorkNest from "./components/WhyWorkNest"
import AuthModal from "./components/auth/AuthModal"
import GlobalDashboard from "./components/dashboard/GlobalDashboard"
import SlackShell from "./components/dashboard/SlackShell"
import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import ForgotPassword from "./components/ForgotPassword";
import OTP from "./components/OTP";
import SetPassword from "./components/SetPassword";
import { Navigate } from "react-router-dom"
import { isSuperAdminUser, isDeactivatedAccount } from "./utils/adminAuth";

const LandingPage = () => {
  const [authMode, setAuthMode] = useState(null)
  const navigate = useNavigate()
  const { initializeFromAuth } = useWorkspace()

  return (
    <div id="top" className="min-h-screen bg-white dark:bg-[#121717] text-[#2C3333] dark:text-[#E7F6F2] transition-colors duration-200">
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
            setAuthMode(null)
            if (isDeactivatedAccount(user)) {
              localStorage.removeItem("worknestToken");
              localStorage.removeItem("worknestUser");
              localStorage.removeItem("worknestWorkspaces");
              toast.error("Your account has been deactivated. Please contact the administrator.");
              return;
            }
            const effectiveUser = isSuperAdminUser(user)
              ? { ...user, platformRole: "super_admin", role: "admin", isSuperAdmin: true }
              : user;
            if (isSuperAdminUser(effectiveUser) && token) {
              localStorage.setItem("worknest_admin_token", token);
            }
            initializeFromAuth(effectiveUser, workspaces || [], token)
            if (isSuperAdminUser(effectiveUser)) {
              navigate("/admin")
            } else {
              navigate("/app/dashboard")
            }
          }}
        />
      )}
    </div>
  )
}

const SimpleLoading = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFB] dark:bg-[#121717] text-[#2C3333] dark:text-[#E7F6F2]">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-[#395B64] dark:border-t-[#A5C9CA]" />
      <span className="text-sm text-[#52656A] dark:text-[#A5C9CA]">Loading...</span>
    </div>
  </div>
);

export { isSuperAdminUser, isDeactivatedAccount } from "./utils/adminAuth";

const PublicRoute = ({ children }) => {
  const { user, isInitializing } = useWorkspace();

  if (isInitializing) {
    return <SimpleLoading />;
  }

  if (user) {
    if (isSuperAdminUser(user)) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/app/dashboard" replace />;
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
  const { user, isInitializing } = useWorkspace();

  if (isInitializing) {
    return <SimpleLoading />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isSuperAdminUser(user)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};



import SuperAdminDashboard from "./components/admin/SuperAdminDashboard";
import { requestNotificationPermission } from "./utils/desktopNotification"


const AppRoutes = () => {
  useEffect(() => {
    // Automatically ask for permission when the website opens
    if ("Notification" in window && Notification.permission === "default") {
      requestNotificationPermission();
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/app/dashboard" element={<ProtectedRoute><GlobalDashboard /></ProtectedRoute>} />
      <Route path="/app/workspace/:workspaceId" element={<ProtectedRoute><SlackShell /></ProtectedRoute>} />
      <Route path="/app/workspace/:workspaceId/channel/:channelId" element={<ProtectedRoute><SlackShell /></ProtectedRoute>} />
      <Route path="/app/workspace/:workspaceId/space/:spaceId" element={<ProtectedRoute><SlackShell /></ProtectedRoute>} />
      <Route path="/admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
      <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
      <Route path="/app/admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword/></PublicRoute>} />
      <Route path="/enter-otp" element={<PublicRoute><OTP/></PublicRoute>} />
      <Route path="/set-password" element={<PublicRoute><SetPassword/></PublicRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

const App = () => {
  return (
    <WorkspaceProvider>
      <AppRoutes />
    </WorkspaceProvider>
  )
}

export default App