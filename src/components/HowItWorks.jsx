const steps = [
  {
    number: "01",
    icon: "fa-building",
    title: "Create Workspace",
    description: "Create a workspace and bring your team together.",
  },
  {
    number: "02",
    icon: "fa-user-plus",
    title: "Invite Members",
    description: "Invite team members to join your workspace.",
  },
  {
    number: "03",
    icon: "fa-hashtag",
    title: "Create Channels",
    description: "Organize conversations into public or private channels.",
  },
  {
    number: "04",
    icon: "fa-comments",
    title: "Start Conversations",
    description: "Communicate through real-time channel messaging or direct messages.",
  },
  {
    number: "05",
    icon: "fa-paperclip",
    title: "Share & Collaborate",
    description: "Share files and keep your team updated through real-time communication.",
  },
  {
    number: "06",
    icon: "fa-bell",
    title: "Stay Connected",
    description: "Receive notifications and see who's online or offline.",
  },
]

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="w-full px-2 py-12 md:py-16">
      <div className="w-full text-center">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-[#2C3333] md:text-4xl">
          How It Works
        </h2>
        <p className="mx-auto mt-4 max-w-150 text-lg leading-relaxed text-[#395B64]">
          From creating your workspace to staying connected, WorkNest keeps your team aligned at every step.
        </p>
      </div>

      <div className="relative mx-auto mt-14 max-w-300 lg:mt-16">
        <div className="absolute bottom-7 left-7 top-7 w-px bg-[#A5C9CA] lg:bottom-auto lg:left-8 lg:right-8 lg:top-14 lg:h-px lg:w-auto" />
        <div className="relative grid gap-8 lg:grid-cols-6 lg:gap-4">
          {steps.map((step) => (
            <article key={step.number} className="group relative grid grid-cols-[3.5rem_1fr] items-start gap-4 lg:block lg:text-center">
              <div className="relative z-10 flex flex-col items-center gap-2 lg:mx-auto lg:w-fit">
                <span className="text-sm font-bold tracking-[0.15em] text-[#395B64]">{step.number}</span>
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#A5C9CA] bg-[#E7F6F2] text-xl text-[#395B64] shadow-[0_3px_8px_rgba(57,91,100,0.06)] transition duration-200 group-hover:border-[#395B64] group-hover:bg-[#A5C9CA] group-hover:shadow-[0_6px_14px_rgba(57,91,100,0.1)]">
                  <i className={`fa-solid ${step.icon}`} aria-hidden="true"></i>
                </div>
              </div>
              <div className="rounded-xl border border-[#A5C9CA]/60 bg-white p-4 shadow-[0_3px_10px_rgba(57,91,100,0.04)] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-[#395B64]/60 group-hover:shadow-[0_7px_16px_rgba(57,91,100,0.08)] lg:mt-5 lg:min-h-40">
                <h3 className="text-lg font-semibold leading-6 text-[#2C3333]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#395B64]">{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
