import logo from "../assets/worknestlogo.png";

const Footer = () => {
  return (
    <footer className="w-full bg-[#2C3333] px-4 py-6 text-[#A5C9CA] md:px-8 md:py-8">
      <div className="mx-auto max-w-300">
        <div className="grid gap-5 border-b border-[#395B64] pb-6 md:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_1fr_0.9fr_1.1fr]">
          <div className="max-w-75">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="WorkNest logo"
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-white">
                WORKNEST
              </span>
            </div>
            <p className="mt-3 text-sm leading-5">
              Bring workspaces, channels, messaging, files, notifications,
              and presence together in one collaborative workspace.
            </p>
            <p className="mt-3 text-xs font-bold tracking-[0.12em] text-white">
              Developed by SHNOOR International LLC
            </p>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Quick Links
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <a
                  href="#top"
                  className="transition hover:text-[#E7F6F2]"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="transition hover:text-[#E7F6F2]"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="transition hover:text-[#E7F6F2]"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#why"
                  className="transition hover:text-[#E7F6F2]"
                >
                  Why WorkNest
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  className="transition hover:text-[#E7F6F2]"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="transition hover:text-[#E7F6F2]"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Features
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>Workspaces</li>
              <li>Channels</li>
              <li>Messaging</li>
              <li>Direct Messaging</li>
              <li>File Sharing</li>
              <li>Notifications</li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Resources
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>Documentation</li>
              <li>Help Center</li>
              <li>Privacy Policy</li>
              <li>Terms &amp; Conditions</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">
              Contact Us
            </h3>

            <address className="mt-2 space-y-1 text-sm not-italic leading-5">
              <p>
                <span className="font-bold text-white">
                  General:
                </span>
                <br />
                info@shnoor.com
              </p>

              <p>
                <span className="font-bold text-white">
                  Sales:
                </span>
                <br />
                admin@shnoor.com
              </p>
            </address>
          </div>
        </div>

        <div className="flex flex-col gap-1 pt-4 text-xs md:flex-row md:items-center md:justify-between">
          <p>
            © 2026 SHNOOR International LLC. All rights reserved.
          </p>

          <p>
            Privacy Policy
            <span className="mx-2 text-[#395B64]">
              |
            </span>
            Terms &amp; Conditions
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;