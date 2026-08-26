const ContactUs = () => {
  return (
    <section id="contact" className="site-contact w-full bg-[#E7F6F2] px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto grid max-w-300 gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
        <div className="self-center">
          <p className="text-sm font-bold tracking-[0.2em] text-[#395B64]">CONTACT US</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-[#2C3333] md:text-4xl">Let's build better teamwork.</h2>
          <p className="mt-4 max-w-125 text-lg leading-7 text-[#395B64]">Have questions about WorkNest or want to learn more about the platform? Get in touch with team.</p>
          <dl className="mt-6 space-y-3 text-[#2C3333]">
            <div><dt className="text-sm font-bold text-[#395B64]">General</dt><dd className="mt-1 font-semibold">info@shnoor.com</dd></div>
            <div><dt className="text-sm font-bold text-[#395B64]">Sales</dt><dd className="mt-1 font-semibold">admin@shnoor.com</dd></div>
          </dl>
        </div>

        <form className="rounded-2xl border border-[#A5C9CA] bg-white p-5 shadow-[0_8px_18px_rgba(57,91,100,0.07)] md:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-[#2C3333]">Name<input type="text" name="name" className="mt-1.5 w-full rounded-lg border border-[#A5C9CA] px-4 py-2.5 font-normal outline-none transition focus:border-[#395B64]" /></label>
            <label className="text-sm font-semibold text-[#2C3333]">Email<input type="email" name="email" className="mt-1.5 w-full rounded-lg border border-[#A5C9CA] px-4 py-2.5 font-normal outline-none transition focus:border-[#395B64]" /></label>
          </div>
          <label className="mt-3 block text-sm font-semibold text-[#2C3333]">Subject<input type="text" name="subject" className="mt-1.5 w-full rounded-lg border border-[#A5C9CA] px-4 py-2.5 font-normal outline-none transition focus:border-[#395B64]" /></label>
          <label className="mt-3 block text-sm font-semibold text-[#2C3333]">Message<textarea name="message" rows="4" className="mt-1.5 w-full resize-y rounded-lg border border-[#A5C9CA] px-4 py-2.5 font-normal outline-none transition focus:border-[#395B64]" /></label>
          <button type="button" className="mt-4 cursor-pointer rounded-full bg-[#395B64] px-7 py-2.5 font-semibold text-white transition hover:bg-[#2C3333]">Send Message</button>
        </form>
      </div>
    </section>
  )
}

export default ContactUs
