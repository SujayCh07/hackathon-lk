import { useMemo } from 'react';
import Button from '../components/ui/Button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import CityCard from '../components/score/CityCard.jsx';
import WorldMap from '../components/score/WorldMap.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { useAuth } from '../hooks/useAuth.js';
import { usePPP } from '../hooks/usePPP.js';
import { useTransactions } from '../hooks/useTransactions.js';
import { useUserProfile } from '../hooks/useUserProfile.js';

export function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { profile } = useUserProfile(userId);
  const monthlyBudget = typeof profile?.monthlyBudget === 'number' ? profile.monthlyBudget : null;

  const {
    accounts,
    balanceUSD,
    isLoading: accountsLoading,
    isRefreshing: accountsRefreshing,
    error: accountsError,
    refresh: refreshAccounts
  } = useAccount();

  const {
    recent,
    spendingMetrics,
    isLoading: transactionsLoading,
    isRefreshing: transactionsRefreshing,
    error: transactionsError,
    refresh: refreshTransactions
  } = useTransactions({ limit: 5, monthlyBudget, balanceUSD });

  const isSyncingNessie = accountsRefreshing || transactionsRefreshing;
  const nessieError = accountsError ?? transactionsError ?? null;
  const isLoadingTransactions = accountsLoading || transactionsLoading;

  const { rankedBySavings, isLoading: pppLoading, error: pppError } = usePPP();

  const markers = useMemo(() => {
    return rankedBySavings
      .slice(0, 5)
      .filter((item) => cityCoords[item.city])
      .map((item) => ({
        city: item.city,
        coords: cityCoords[item.city],
        ppp: item.ppp
      }));
  }, [rankedBySavings]);

  const topCities = rankedBySavings.slice(0, 3);

  const runwayDays = spendingMetrics.runwayDays;
  const runwayLabel = runwayDays == null ? '—' : runwayDays === Infinity ? '∞' : `${runwayDays} days`;

  if (pppLoading) {
    return <p className="p-6 text-center text-charcoal/80">Loading purchasing power data...</p>;
  }

  if (pppError) {
    return <p className="p-6 text-center text-red-600">Error loading data: {pppError.message}</p>;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        <Card className="col-span-1 bg-white/85">
          <CardHeader>
            <CardTitle>Account balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-3xl font-poppins font-semibold text-teal">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balanceUSD)}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isSyncingNessie}
                onClick={() => {
                  refreshAccounts();
                  refreshTransactions();
                }}
              >
                {isSyncingNessie ? 'Refreshing…' : 'Refresh Nessie'}
              </Button>
            </div>
            <p className="mt-2 text-sm text-charcoal/70">
              {nessieError
                ? 'Showing cached balances while Nessie is unavailable.'
                : 'Capital One sandbox data synced from Nessie.'}
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-charcoal/50">
              Accounts on file: {accounts.length}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 lg:col-span-2 bg-white/85">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <p className="text-xs uppercase tracking-[0.3em] text-teal/60">Last 30 days</p>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <p className="text-sm text-charcoal/70">Loading your latest activity…</p>
            ) : recent.length === 0 ? (
              <p className="text-sm text-charcoal/70">No transactions synced yet. Try refreshing Nessie.</p>
            ) : (
              <ul className="space-y-3">
                {recent.map((txn) => (
                  <li key={txn.id} className="flex items-center justify-between rounded-2xl bg-offwhite/80 px-4 py-3">
                    <div>
                      <p className="font-semibold text-charcoal">{txn.merchant}</p>
                      <p className="text-xs text-charcoal/60">
                        {new Date(txn.timestamp).toLocaleDateString()}
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
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 bg-white/85">
          <CardHeader>
            <CardTitle>Budget runway</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-poppins font-semibold text-navy">{runwayLabel}</p>
            <div className="text-sm text-charcoal/70">
              {monthlyBudget ? (
                <>
                  <p>
                    Monthly budget: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(monthlyBudget)}
                  </p>
                  <p>
                    Projected spend: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(spendingMetrics.projectedMonthlySpend)}
                  </p>
                </>
              ) : (
                <p>Set a monthly budget in Settings to see how long your balance will last.</p>
              )}
            </div>
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
  Thailand: [15.87, 100.9925],
  France: [46.6034, 1.8883],
  Germany: [51.1657, 10.4515],
  India: [20.5937, 78.9629],
  Vietnam: [14.0583, 108.2772],
  Colombia: [4.5709, -74.2973],
  Indonesia: [-0.7893, 113.9213]
};

export default Dashboard;
