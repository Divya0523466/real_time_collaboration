import { useState, useEffect } from "react"
import { Route, Routes, useNavigate } from "react-router-dom"
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
            initializeFromAuth(user, workspaces || [], token)
            navigate("/app/dashboard")
          }}
        />
      )}
    </div>
  )
}

const PublicRoute = ({ children }) => {
  const { user, isInitializing } = useWorkspace();

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-[#121717]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#395B64] border-t-transparent"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return children;
};

const ProtectedRoute = ({ children }) => {
  const { user, isInitializing } = useWorkspace();

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-[#121717]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#395B64] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
};



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