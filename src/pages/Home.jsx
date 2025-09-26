import HeroCarousel from '../components/hero/HeroCarousel.jsx';
import ParallaxSection from '../components/hero/ParallaxSection.jsx';

export function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-12">
      <HeroCarousel />
      <section className="grid gap-8 text-center md:grid-cols-3">
        <div className="space-y-4">
          <h2 className="text-3xl font-poppins font-semibold text-teal">Why PPP?</h2>
          <p className="text-sm text-charcoal/70">
            Purchasing power parity (PPP) helps you convert budgets into experiences. PPP Pocket blends travel inspiration with
            financial clarity so your dollars stay powerful wherever you land.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-poppins font-semibold text-teal">Real-time runway</h2>
          <p className="text-sm text-charcoal/70">
            Quickly visualize how long your balance lasts across cities with budget sliders and PPP-adjusted costs.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-poppins font-semibold text-teal">Shareable insights</h2>
          <p className="text-sm text-charcoal/70">
            Export beautiful summary cards to align with your travel companions, investors, or future self.
          </p>
        </div>
      </section>
      <ParallaxSection />
    </div>
  );
}

export default Home;
