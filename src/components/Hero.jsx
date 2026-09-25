import HeroImage from "/src/assets/hero_image.jpg";

const Hero = ({ onOpenAuth }) => {
  return (
    <main className="mx-auto grid max-w-300 items-center gap-10 px-4 pb-8 pt-10 md:grid-cols-[0.9fr_1.1fr] md:gap-7 md:px-6 md:pt-12 lg:gap-12 lg:px-2 lg:pb-10 lg:pt-18">
      <section className="flex max-w-145 flex-col gap-4 text-center mx-auto md:mx-0 md:text-left">
        <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-[#25292a] dark:text-white md:text-4xl lg:text-5xl">
          Everything Your Team Needs to Stay Connected.
        </h1>

        <p className="max-w-125 text-lg leading-[1.45] text-[#52656a] dark:text-[#A5C9CA] lg:text-xl mx-auto md:mx-0">
          Bring your team together with real-time messaging, organized
          channels, direct messages, file sharing, notifications, and
          presence - all in one workspace.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap gap-4 mt-2 justify-center md:justify-start">
          <button
            type="button"
            onClick={() => onOpenAuth("register")} 
            className="w-full sm:w-auto cursor-pointer rounded-full bg-[#395B64] px-9 py-4 font-semibold text-white shadow-[0_10px_20px_rgba(57,91,100,0.22)] transition hover:bg-[#2C3333] dark:hover:bg-[#4E717B] text-center"
          >
            Start Collaborating
          </button>

          <a
            href="#features"
            className="w-full sm:w-auto rounded-full border border-[#dbe4e4] dark:border-[#395B64] px-9 py-4 font-semibold text-[#303536] dark:text-[#E7F6F2] transition hover:bg-[#f1f7f6] dark:hover:bg-[#2C3333] text-center"
          >
            Explore Features
          </a>
        </div>
      </section>

      <img
        src={HeroImage}
        alt="WorkNest collaboration workspace"
        loading="lazy"
        decoding="async"
        className="w-full max-w-180 mx-auto md:mx-0 justify-self-center md:justify-self-end object-contain rounded-2xl dark:border dark:border-[#2C3333] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition mt-4 md:mt-0"
      />
    </main>
  );
};

export default Hero;