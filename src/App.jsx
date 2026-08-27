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
import Dashboard from "./pages/Dashboard"

const LandingPage = () => {
  const [authMode, setAuthMode] = useState(null)
  const navigate = useNavigate()

  return (
    <div id="top">
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
          onLoginSuccess={() => {
            setAuthMode(null)
            navigate("/dashboard")
          }}
        />
      )}
    </div>
  )
}

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}

export default App;