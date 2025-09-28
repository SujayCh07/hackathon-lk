import HeroCarousel from '../components/hero/HeroCarousel.jsx';
import ParallaxSection from '../components/hero/ParallaxSection.jsx';

export function Home() {
  return (
    <div className="flex flex-col bg-offwhite text-charcoal">
      <div className="relative">
        {/* Pass showLogo to surface the Parity mark above the hero headline when desired */}
        <HeroCarousel showLogo />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-offwhite/40 to-offwhite"
          aria-hidden="true"
        />
      </div>
      <section className="relative -mt-16 space-y-16 pb-20 pt-24 md:-mt-24 md:pt-32">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 text-left md:grid-cols-3">
          <div className="space-y-4">
            <h2 className="font-poppins text-3xl font-semibold text-navy">Why PPP?</h2>
            <p className="text-base text-charcoal/80">
              Purchasing power parity reframes your Capital One™ balance as a travel compass. Instantly see how familiar dollars
              unlock premium experiences around the world.
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="font-poppins text-3xl font-semibold text-navy">Real-time runway</h2>
            <p className="text-base text-charcoal/80">
              Forecast months of runway across destinations with PPP multipliers, live FX hooks, and guided travel budgeting.
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="font-poppins text-3xl font-semibold text-navy">Shareable insights</h2>
            <p className="text-base text-charcoal/80">
              Craft export-ready summaries that align travel partners and keep every journey grounded in financial confidence.
            </p>
          </div>
        </div>
        <ParallaxSection />
      </section>
    </div>
  );
}

export default Home;
