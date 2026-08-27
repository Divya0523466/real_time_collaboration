const Features = () => {
  const features = [
    {
      icon: "fa-building",
      title: "Workspaces",
      description: "Create and organize dedicated workspaces for your teams and conversations.",
    },
    {
      icon: "fa-comments",
      title: "Real-Time Messaging",
      description: "Send messages instantly and see conversations update in real time without refreshing.",
    },
    {
      icon: "fa-hashtag",
      title: "Channels & Messaging",
      description: "Keep conversations organized by team, topic, or purpose with public and private channels.",
    },
    {
      icon: "fa-users",
      title: "Direct Messaging",
      description: "Have private one-to-one conversations with other members of your workspace.",
    },
    {
      icon: "fa-paperclip",
      title: "File Sharing",
      description: "Share images, documents, and other files directly inside conversations.",
    },
    {
      icon: "fa-bell",
      title: "Notifications & Presence",
      description: "Know who is online and receive notifications for important messages, mentions, and activity.",
    },
  ]

  return (
    <section
      id="features"
      className="w-full scroll-mt-8 px-2 pt-8 md:pt-10"
    >
      <div className="w-full text-center">
        <h2 className="w-full text-center text-3xl font-semibold leading-tight tracking-tight text-[#25292a] md:text-4xl">
          Everything you need, in one workspace
        </h2>
        <p className="mt-3 w-full text-center text-lg leading-relaxed text-[#52656a]">
          Purpose-built for teams that move fast and stay aligned.
        </p>
      </div>

      <div className="mx-auto mt-10 grid w-full max-w-300 auto-rows-fr gap-6 md:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-7">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="flex h-full min-h-48 flex-col rounded-xl border border-[#dbe9e8] bg-white p-5 shadow-[0_4px_12px_rgba(57,91,100,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-[#b8d9d6] hover:shadow-[0_8px_18px_rgba(57,91,100,0.09)]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d0e9e7] bg-[#e9f6f4] text-xl text-[#395B64]">
              <i className={`fa-solid ${feature.icon}`} aria-hidden="true"></i>
            </div>
            <h3 className="mt-4 min-h-6 text-lg font-semibold leading-6 tracking-tight text-[#263638]">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm font-normal leading-6 text-[#607278]">
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default Features