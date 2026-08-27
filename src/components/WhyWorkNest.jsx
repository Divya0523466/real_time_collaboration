import whyWorkNestImage from "../assets/whyworknest.jpg"

const benefits = [
  ["01", "Stay Connected", "Keep your team connected through real-time conversations."],
  ["02", "Organize Conversations", "Use workspaces and channels to keep communication structured."],
  ["03", "Communicate Instantly", "Send and receive messages in real time without refreshing."],
  ["04", "Share Everything", "Share files directly within conversations and keep important information accessible."],
]

const WhyWorkNest = () => {
  return (
    <section id="why" className="why-worknest relative w-full overflow-hidden bg-[#2C3333] px-4 py-14 md:px-8 md:py-18">
      <div className="relative z-10 mx-auto w-full max-w-300">
        <header className="mx-auto max-w-190 text-center">
          <p className="text-sm font-bold tracking-[0.2em] text-[#A5C9CA]">WHY WORKNEST</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
            Everything your team needs to stay connected.
          </h2>
        </header>

        <div className="mt-12 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="order-1">
            <div className="overflow-hidden rounded-2xl border border-[rgba(165,201,202,0.2)] bg-[#E7F6F2] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.2)]">
              <div className="overflow-hidden rounded-xl bg-white">
                <img src={whyWorkNestImage} alt="WorkNest team collaboration" className="h-full max-h-105 w-full object-cover" />
              </div>
            </div>
          </div>

          <div className="order-2 text-left">
            {benefits.map(([number, title, description]) => (
              <article key={number} className="flex gap-5 border-t border-[rgba(165,201,202,0.2)] py-5">
                <span className="pt-1 text-sm font-bold tracking-[0.15em] text-[#A5C9CA]">{number}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#A5C9CA]">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default WhyWorkNest
