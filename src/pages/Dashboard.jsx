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
  const { rankedBySavings, isLoading, error } = usePPP();

  const markers = useMemo(() => {
    return rankedBySavings
      .slice(0, 5)
      .filter((item) => cityCoords[item.city]) // ensure coordinates exist
      .map((item) => ({
        city: item.city,
        coords: cityCoords[item.city],
        ppp: item.ppp
      }));
  }, [rankedBySavings]);

  const topCities = rankedBySavings.slice(0, 3);

  if (isLoading) {
    return <p className="p-6 text-center text-charcoal/80">Loading purchasing power data...</p>;
  }

  if (error) {
    return <p className="p-6 text-center text-red-600">Error loading data: {error.message}</p>;
  }

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
                    <p className="text-xs text-charcoal/60">
                      {new Date(txn.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-coral">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(txn.amount)}
                    </p>
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
            <CardTitle>PPP Score Map</CardTitle>
            <p className="text-xs text-charcoal/60">Countries ranked by savings potential.</p>
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

// 🧭 Align these with country names returned by your `ppp_country` table.
const cityCoords = {
  USA: [37.0902, -95.7129],
  Mexico: [23.6345, -102.5528],
  Portugal: [39.3999, -8.2245],
  Thailand: [15.8700, 100.9925],
  France: [46.6034, 1.8883],
  Germany: [51.1657, 10.4515],
  India: [20.5937, 78.9629],
  Vietnam: [14.0583, 108.2772],
  Colombia: [4.5709, -74.2973],
  Indonesia: [-0.7893, 113.9213]
};

export default Dashboard;
