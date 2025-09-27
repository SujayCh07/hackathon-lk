import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { useTransactions } from '../hooks/useTransactions.js';
import { usePPP } from '../hooks/usePPP.js';
import WorldMap from '../components/score/WorldMap.jsx';
import CityCard from '../components/score/CityCard.jsx';

export function Dashboard() {
  const { balanceUSD } = useAccount();
  const { recent } = useTransactions();
  const { rankedBySavings } = usePPP();

  const markers = useMemo(() => {
    return rankedBySavings.slice(0, 5).map((item) => ({
      city: item.city,
      coords: cityCoords[item.city] ?? [0, 0],
      ppp: item.ppp
    }));
  }, [rankedBySavings]);

  const topCities = rankedBySavings.slice(0, 3);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1 bg-white/85">
          <CardHeader>
            <CardTitle>Account Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-poppins font-semibold text-teal">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balanceUSD)}
            </p>
            <p className="mt-2 text-sm text-charcoal/70">Capital One demo account synced via Nessie sandbox.</p>
          </CardContent>
        </Card>
        <Card className="col-span-1 md:col-span-2 bg-white/85">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <p className="text-xs uppercase tracking-[0.3em] text-teal/60">Last 30 days</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recent.map((txn) => (
                <li key={txn.id} className="flex items-center justify-between rounded-2xl bg-offwhite/80 px-4 py-3">
                  <div>
                    <p className="font-semibold text-charcoal">{txn.merchant}</p>
                    <p className="text-xs text-charcoal/60">{new Date(txn.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-coral">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(txn.amount)}</p>
                    <p className="text-xs text-charcoal/60">{txn.category}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>PPP Score map</CardTitle>
            <p className="text-xs text-charcoal/60">Leaflet world map placeholder showing PPP hotspots.</p>
          </CardHeader>
          <CardContent>
            <WorldMap markers={markers} />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          {topCities.map((city) => (
            <CityCard key={city.city} {...city} />
          ))}
        </div>
      </div>
    </div>
  );
}

const cityCoords = {
  Atlanta: [33.749, -84.388],
  'Mexico City': [19.4326, -99.1332],
  Lisbon: [38.7223, -9.1393],
  Bangkok: [13.7563, 100.5018],
  Paris: [48.8566, 2.3522],
  'New York': [40.7128, -74.006]
};

export default Dashboard;
