const AboutUs = () => {
  return (
    <section id="about" className="w-full px-2 py-12 md:py-16">
      <div className="mx-auto grid max-w-300 gap-8 lg:grid-cols-[0.4fr_0.6fr] lg:gap-20">
        <div>
          <p className="text-sm font-bold tracking-[0.2em] text-[#395B64]">ABOUT WORKNEST</p>
          <h2 className="mt-4 max-w-100 text-3xl font-semibold leading-tight tracking-tight text-[#2C3333] md:text-4xl">Built to keep teams connected.</h2>
        </div>
        <div className="max-w-150 lg:pt-8">
          <p className="text-lg leading-8 text-[#395B64]">WorkNest is a real-time collaboration platform designed to bring teams together through organized workspaces, channels, messaging, file sharing, notifications, and presence.</p>
          <a href="#contact" className="mt-7 inline-block font-semibold text-[#395B64] underline underline-offset-4 transition hover:text-[#2C3333]">Learn more about WorkNest →</a>
        </div>
      </div>
    </section>
  )
}

export default AboutUs
