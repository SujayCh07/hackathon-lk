export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/60 bg-offwhite/80">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-charcoal/70 md:flex-row">
        <p className="font-inter">© {new Date().getFullYear()} PPP Pocket · Travel smarter with every dollar.</p>
        <div className="flex items-center gap-4">
          <a href="#accessibility" className="hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
            Accessibility
          </a>
          <a href="#privacy" className="hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
