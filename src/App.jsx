import { useState } from "react"
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
          onLoginSuccess={(user, workspaces) => {
            setAuthMode(null)
            initializeFromAuth(user, workspaces || [])
            navigate("/app/dashboard")
          }}
        />
      )}
    </div>
  )
}

const ProtectedRoute = ({ children }) => {
  const { user } = useWorkspace();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/dashboard" element={<ProtectedRoute><GlobalDashboard /></ProtectedRoute>} />
      <Route path="/app/workspace/:workspaceId" element={<ProtectedRoute><SlackShell /></ProtectedRoute>} />
      <Route path="/app/workspace/:workspaceId/channel/:channelId" element={<ProtectedRoute><SlackShell /></ProtectedRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword/>} />
      <Route path="/enter-otp" element={<OTP/>} />
      <Route path="/set-password" element={<SetPassword/>} />
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