import { useState } from "react"
import logo from "../assets/worknestlogo.png"

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-y-3 border-b border-[#dbe9e8] bg-white px-4 pb-4 pt-2 lg:flex-nowrap lg:px-8 lg:pb-6">
      <div className="flex shrink-0 items-center gap-3">
        <img src={logo} alt="WorkNest logo" className="h-9 w-9 lg:h-10 lg:w-10" />
        <p className="text-xl font-bold tracking-tight text-[#395B64] lg:text-2xl">WorkNest</p>
      </div>

      <ul className="hidden items-center gap-8 font-medium text-[1rem] text-[#5E6868] lg:flex">
        <li><a href="#top" className="transition-colors duration-200 hover:text-[#395B64] hover:underline hover:underline-offset-4">Home</a></li>
        <li><a href="#features" className="transition-colors duration-200 hover:text-[#395B64] hover:underline hover:underline-offset-4">Features</a></li>
        <li><a href="#how-it-works" className="transition-colors duration-200 hover:text-[#395B64] hover:underline hover:underline-offset-4">How It Works</a></li>
        <li><a href="#why" className="transition-colors duration-200 hover:text-[#395B64] hover:underline hover:underline-offset-4">Why WorkNest</a></li>
        <li><a href="#about" className="transition-colors duration-200 hover:text-[#395B64] hover:underline hover:underline-offset-4">About Us</a></li>
        <li><a href="#contact" className="transition-colors duration-200 hover:text-[#395B64] hover:underline hover:underline-offset-4">Contact Us</a></li>
      </ul>

      <div className="flex gap-1 sm:gap-3">
        <button className="cursor-pointer rounded-full border border-[#dbe4e4] px-3 py-1.5 text-sm font-semibold text-[#303536] transition hover:bg-[#f1f7f6] sm:px-6 sm:py-2 sm:text-base">Login</button>
        <button className="cursor-pointer rounded-full bg-[#395B64] px-3 py-1.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(57,91,100,0.22)] transition hover:bg-[#2C3333] sm:px-6 sm:py-2 sm:text-base">Get Started</button>
      </div>

      <button
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        aria-label="Toggle navigation menu"
        className="order-last flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#dbe4e4] text-[#395B64] lg:hidden"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <i className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"}`} aria-hidden="true" />
      </button>

      {menuOpen && (
        <ul id="mobile-navigation" className="order-last grid w-full gap-3 border-t border-[#dbe9e8] pt-3 font-medium text-[#5E6868] lg:hidden">
          <li><a href="#features" onClick={() => setMenuOpen(false)}>Features</a></li>
          <li><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a></li>
          <li><a href="#why" onClick={() => setMenuOpen(false)}>Why WorkNest</a></li>
          <li><a href="#about" onClick={() => setMenuOpen(false)}>About Us</a></li>
          <li><a href="#contact" onClick={() => setMenuOpen(false)}>Contact Us</a></li>
        </ul>
      )}
    </nav>
  )
}

export default Navbar