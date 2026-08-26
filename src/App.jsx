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

const App = () => {
  return (
    <div id="top">
      <Navbar /> 
      <Hero />
      <Features />
      <HowItWorks />
      <WhyWorkNest />
      <AboutUs />
      <ContactUs />
      <FinalCta />
      <Footer />
    </div>
  )
}

export default App;