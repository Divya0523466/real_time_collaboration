import HeroImage from "/src/assets/hero_image.jpg"

const Hero = () => {
  return (
    <main className="mx-auto grid max-w-300 items-center gap-10 px-4 pb-8 pt-10 md:grid-cols-[0.9fr_1.1fr] md:gap-7 md:px-6 md:pt-12 lg:gap-12 lg:px-2 lg:pb-10 lg:pt-18">
      <section className="flex max-w-145 flex-col gap-4">
        <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-[#25292a] md:text-4xl lg:text-5xl">Work Together. Stay Connected. Get Things Done.</h1>
        <p className="max-w-125 text-lg leading-[1.45] text-[#52656a] lg:text-xl">Manage projects, collaborate with your team, communicate in real time, share files, and track progress all from one place.</p>
        <div className="flex flex-wrap gap-4">
          <button className="cursor-pointer rounded-full bg-[#395B64] px-9 py-4 font-semibold text-white shadow-[0_10px_20px_rgba(57,91,100,0.22)] transition hover:bg-[#2C3333]">Start Collaborating</button>
          <button className="cursor-pointer rounded-full border border-[#dbe4e4] px-9 py-4 font-semibold text-[#303536] transition hover:bg-[#f1f7f6]">Explore Features</button>
        </div>
      </section>
      <img src={HeroImage} alt="WorkNest collaboration workspace" className="w-full max-w-180 justify-self-end object-contain" />
    </main>
  )
}

export default Hero