import HeroCarousel from '../components/hero/HeroCarousel.jsx';
import ParallaxSection from '../components/hero/ParallaxSection.jsx';

export function Home() {
  return (
    <div className="flex flex-col gap-20 bg-mist pb-20">
      <div className="mx-auto w-full max-w-6xl px-6 pt-12">
        <HeroCarousel />
      </div>
      <section className="bg-offwhite/60 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 text-left md:grid-cols-3">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-navy">Why PPP?</h2>
            <p className="text-sm text-slate/80">
              Purchasing power parity reframes your Capital One balance as a travel compass. Instantly see how familiar dollars
              unlock premium experiences around the world.
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-navy">Real-time runway</h2>
            <p className="text-sm text-slate/80">
              Forecast months of runway across destinations with PPP multipliers, live FX hooks, and guided travel budgeting.
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-navy">Shareable insights</h2>
            <p className="text-sm text-slate/80">
              Craft export-ready summaries that align travel partners and keep every journey grounded in financial confidence.
            </p>
          </div>
        </div>
      </section>
      <div className="mx-auto w-full max-w-6xl px-6">
        <ParallaxSection />
      </div>
    </div>
  );
}

export default Home;
