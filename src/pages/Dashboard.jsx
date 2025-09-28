// src/pages/Dashboard.jsx
import { useMemo, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import WorldMap from '../components/score/WorldMap.jsx';
import CityCard from '../components/score/CityCard.jsx';
import SpendingTrendChart from '../components/dashboard/SpendingTrendChart.jsx';
import SavingsRunwayPanel from '../components/dashboard/SavingsRunwayPanel.jsx';
import NotificationsWidget from '../components/dashboard/NotificationsWidget.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import { supabase } from '../lib/supabase.js';
import Dictionary from './Dictionary.js';

const ACCT_LS_KEY = 'parity:selectedAccountId';
const fmtUSD = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

function toTitleCase(s = '') {
  return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

function groupByWeek(transactions) {
  if (!Array.isArray(transactions)) return [];
  const map = new Map();
  for (const t of transactions) {
    const ts = new Date(t.timestamp ?? t.ts ?? t.date ?? Date.now());
    if (Number.isNaN(ts.getTime())) continue;
    const d = new Date(ts);
    const w = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
    d.setDate(w); d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    map.set(key, { key, label, date: d, amount: (map.get(key)?.amount || 0) + Math.abs(Number(t.amount || 0)) });
  }
  return [...map.values()].sort((a, b) => a.date - b.date);
}

// Enhanced notification builder with transaction-based personalization
function buildPersonalizedNotifications({ bestCity, runnerUp, weeklyChange, budgetDelta, weeklySpending, recentTransactions, userCountry }) {
  const notes = [];

  // Existing PPP and budget notifications
  if (bestCity && runnerUp) {
    const monthlyDiff = Math.max(0, Number(runnerUp.monthlyCost ?? 0) - Number(bestCity.monthlyCost ?? 0));
    if (monthlyDiff > 0) {
      notes.push(
        `Choosing ${bestCity.city} over ${runnerUp.city} saves about ${Math.round(monthlyDiff).toLocaleString()} each month.`
      );
    }
  }

  if (Number.isFinite(weeklyChange)) {
    const label = weeklyChange > 0 ? 'up' : 'down';
    notes.push(`Your weekly spending is ${label} ${Math.abs(Math.round(weeklyChange))}% vs. last week.`);
  }

  if (Number.isFinite(budgetDelta)) {
    if (budgetDelta > 0) {
    notes.push(`You're pacing ${Math.round(budgetDelta).toLocaleString()} under budget — bank the surplus for travel.`);
    } else if (budgetDelta < 0) {
      notes.push(`You're trending ${Math.abs(Math.round(budgetDelta)).toLocaleString()} over budget — adjust for your next trip.`);
    }
  }

  // NEW: Transaction-based travel nudges
  if (weeklySpending && weeklySpending > 0) {
    // Find countries where this weekly spending equals 1-7 days of living
    const affordableDays = Object.entries(Dictionary)
      .map(([country, data]) => {
        const dailyCost = data.cost_of_living / 30;
        const daysAffordable = Math.floor(weeklySpending / dailyCost);
        return {
          country: toTitleCase(country),
          dailyCost,
          daysAffordable,
          monthlyCost: data.cost_of_living
        };
      })
      .filter(item => item.daysAffordable >= 1 && item.daysAffordable <= 7)
      .sort((a, b) => b.daysAffordable - a.daysAffordable);

    if (affordableDays.length > 0) {
      const best = affordableDays[0];
      if (best.daysAffordable === 1) {
        notes.push(`This week's spending (${fmtUSD(weeklySpending)}) covers a full day in ${best.country} at ${fmtUSD(best.dailyCost)}/day.`);
      } else {
        notes.push(`This week's spending (${fmtUSD(weeklySpending)}) covers ${best.daysAffordable} days in ${best.country} at ${fmtUSD(best.dailyCost)}/day.`);
      }
    }
  }

  // Category-based travel suggestions
  if (recentTransactions && recentTransactions.length > 0) {
    const categorySpending = recentTransactions.reduce((acc, txn) => {
      const category = txn.category || 'General';
      acc[category] = (acc[category] || 0) + Math.abs(txn.amount);
      return acc;
    }, {});

    const totalRecent = Object.values(categorySpending).reduce((sum, amt) => sum + amt, 0);
    
    // High dining spending
    if (categorySpending['Dining'] > totalRecent * 0.2) {
      notes.push(`With ${Math.round(categorySpending['Dining'] / totalRecent * 100)}% on dining, consider Thailand or Vietnam where street food costs $2-5 per meal.`);
    }
    
    // High entertainment spending
    if (categorySpending['Entertainment'] > totalRecent * 0.15) {
      notes.push(`Your entertainment budget could fund amazing experiences in Prague or Budapest where cultural activities cost 60% less.`);
    }
  }

  return notes;
}

// Filter destinations by COL similarity (within 40%)
function filterSimilarCOL(destinations, userMonthlyCost, maxDifference = 0.4) {
  if (!userMonthlyCost || userMonthlyCost <= 0) return destinations;
  
  return destinations.filter(dest => {
    const difference = Math.abs(dest.monthlyCost - userMonthlyCost) / userMonthlyCost;
    return difference <= maxDifference;
  });
}

async function getCountryCoords(countryName) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(countryName)}&format=json&limit=1`
    );
    const j = await r.json();
    if (Array.isArray(j) && j[0]) return [parseFloat(j[0].lat), parseFloat(j[0].lon)];
  } catch {}
  return null;
}

function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile } = useUserProfile(userId);
  
  // identity/budget
  const identityFallback = useMemo(() => {
    if (!user) return '';
    const md = user.user_metadata ?? {};
    if (md.displayName?.trim()) return md.displayName.trim();
    if (user.email) return user.email.split('@')[0] ?? '';
    return '';
  }, [user]);
  const displayName = profile?.name ?? identityFallback;
  const baseMonthlyBudget = useMemo(() => {
    if (profile?.monthly_budget) return profile.monthly_budget;
    return 2500;
  }, [profile?.monthly_budget]);

  // Get user's current country for COL comparison
  const userCountryData = useMemo(() => {
    const countryCode = profile?.current_country_code?.toLowerCase();
    if (!countryCode) return null;
    
    // Map country codes to dictionary keys
    const countryMap = {
      'us': 'united states',
      'usa': 'united states',
      'uk': 'united kingdom',
      'gb': 'united kingdom',
      'de': 'germany',
      'fr': 'france',
      // Add more mappings as needed
    };
    
    const countryKey = countryMap[countryCode] || countryCode;
    return Dictionary[countryKey] || Dictionary['united states']; // fallback to US
  }, [profile?.current_country_code]);

  // ── Accounts & selection ───────────────────────────────────────────────────
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [balanceUSD, setBalanceUSD] = useState(0);
  const [accountsLoading, setAccountsLoading] = useState(false);

  // recent tx for selected account (rendered after load)
  const [recent, setRecent] = useState([]);
  // 90-day tx for trends (all accounts)
  const [trendTx, setTrendTx] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [hasRequestedNessieRefresh, setHasRequestedNessieRefresh] = useState(false);

  useEffect(() => {
    setHasRequestedNessieRefresh(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (isSyncingNessie) return;
    if (hasRequestedNessieRefresh) return;
    const hasNessieAccounts = Array.isArray(nessie?.accounts) && nessie.accounts.length > 0;
    if (hasNessieAccounts) {
      return;
    }

    if (typeof refreshNessie === 'function') {
      setHasRequestedNessieRefresh(true);
      refreshNessie().catch((error) => {
        console.warn('Failed to refresh Nessie data for dashboard', error);
        setHasRequestedNessieRefresh(false);
      });
    }
  }, [
    hasRequestedNessieRefresh,
    isSyncingNessie,
    nessie?.accounts,
    refreshNessie,
    userId
  ]);

  // Load accounts (prefer nickname if column exists)
  useEffect(() => {
    let alive = true;
    if (!userId) {
      setAccounts([]);
      setSelectedId(null);
      setSelectedType(null);
      setBalanceUSD(0);
      setAccountsLoading(false);
      return;
    }

    setAccountsLoading(true);

    (async () => {
      let rows = null;
      let error = null;

      // Try with nickname present
      ({ data: rows, error } = await supabase
        .from('accounts')
        .select('nessie_account_id, account_type, balance, snapshot_ts, nickname')
        .eq('user_id', userId)
        .order('snapshot_ts', { ascending: true }));

      // Fallback without nickname column
      if (error) {
        const res = await supabase
          .from('accounts')
          .select('nessie_account_id, account_type, balance, snapshot_ts')
          .eq('user_id', userId)
          .order('snapshot_ts', { ascending: true });
        rows = res.data || [];
      }

      const hasRows = Array.isArray(rows) && rows.length > 0;

      if (!hasRows) {
        if (alive) {
          const fallbackAccounts = Array.isArray(nessie?.accounts)
            ? nessie.accounts.map((account) => ({
                id: account.nessieAccountId ?? account.id,
                type: account.type ?? null,
                balance: Number(account.balance ?? 0),
                nickname: account.name ?? null,
                snapshot_ts: account.snapshot_ts ?? null
              }))
            : [];

          if (fallbackAccounts.length > 0) {
            const saved = typeof window !== 'undefined' ? window.localStorage.getItem(ACCT_LS_KEY) : null;
            const defaultId =
              saved && fallbackAccounts.some((a) => a.id === saved) ? saved : fallbackAccounts[0]?.id ?? null;

            setAccounts(fallbackAccounts);
            setSelectedId(defaultId);

            const def = fallbackAccounts.find((a) => a.id === defaultId);
            if (def) {
              setBalanceUSD(def.balance);
              setSelectedType(def.type ?? null);
            } else {
              setBalanceUSD(0);
              setSelectedType(null);
            }
          } else {
            setAccounts([]);
            setSelectedId(null);
            setBalanceUSD(0);
            setSelectedType(null);
          }
        }
        setAccountsLoading(false);
        return;
      }

      if (!alive) {
        setAccountsLoading(false);
        return;
      }

      const firstSeenOrder = [];
      const latestById = new Map();
      const seen = new Set();
      for (const r of rows) {
        const id = r.nessie_account_id;
        if (!seen.has(id)) { seen.add(id); firstSeenOrder.push(id); }
        const prev = latestById.get(id);
        if (!prev || new Date(r.snapshot_ts) > new Date(prev.snapshot_ts)) {
          latestById.set(id, r);
        }
      }

      const list = firstSeenOrder.map((id) => {
        const lr = latestById.get(id);
        return {
          id,
          type: lr?.account_type ?? null,
          balance: Number(lr?.balance ?? 0),
          nickname: lr?.nickname ?? null,
          snapshot_ts: lr?.snapshot_ts ?? null,
        };
      });

      if (!alive) return;
      setAccounts(list);

      // Default: last chosen (localStorage) or the oldest account created (firstSeen)
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(ACCT_LS_KEY) : null;
      const defaultId = saved && list.some((a) => a.id === saved) ? saved : firstSeenOrder[0] ?? null;
      setSelectedId(defaultId);

      const def = list.find((a) => a.id === defaultId);
      if (def) {
        setBalanceUSD(def.balance);
        setSelectedType(def.type ?? null);
      }
    })()
      .catch((error) => {
        console.warn('Failed to hydrate accounts for dashboard', error);
      })
      .finally(() => {
        setAccountsLoading(false);
      });

    return () => {
      setAccountsLoading(false);
      alive = false;
    };
  }, [nessie?.accounts, userId, isSyncingNessie]);

  // Persist selection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedId) window.localStorage.setItem(ACCT_LS_KEY, selectedId);
  }, [selectedId]);

  // Fetch data for current selection (runs on load and after hard refresh)
  useEffect(() => {
    let alive = true;
    if (!userId || !selectedId) {
      setTransactionsLoading(false);
      return;
    }

    setTransactionsLoading(true);

    (async () => {
      // Confirm latest snapshot (and nickname if we just learned it)
      const { data: latest } = await supabase
        .from('accounts')
        .select('account_type, balance, snapshot_ts, nickname')
        .eq('user_id', userId)
        .eq('nessie_account_id', selectedId)
        .order('snapshot_ts', { ascending: false })
        .limit(1);

      if (alive && Array.isArray(latest) && latest[0]) {
        setSelectedType(latest[0].account_type ?? null);
        setBalanceUSD(Number(latest[0].balance ?? 0));
        if (latest[0].nickname) {
          setAccounts((prev) => prev.map((p) => (p.id === selectedId ? { ...p, nickname: latest[0].nickname } : p)));
        }
      }

      // Recent transactions for this account (10)
      let txResp = await supabase
        .from('transactions')
        .select('id, merchant, amount, category, ts, nessie_account_id, status')
        .eq('user_id', userId)
        .eq('nessie_account_id', selectedId)
        .order('ts', { ascending: false })
        .limit(10);

      if (txResp.error && /column.*status/i.test(txResp.error.message || '')) {
        txResp = await supabase
          .from('transactions')
          .select('id, merchant, amount, category, ts, nessie_account_id')
          .eq('user_id', userId)
          .eq('nessie_account_id', selectedId)
          .order('ts', { ascending: false })
          .limit(10);
      }

      const hasTxData = Array.isArray(txResp.data) && txResp.data.length > 0;

      if ((txResp.error && /nessie_account_id/i.test(txResp.error.message || '')) || !hasTxData) {
        let alt = await supabase
          .from('transactions')
          .select('id, merchant, amount, category, ts, account_id, status')
          .eq('user_id', userId)
          .eq('account_id', selectedId)
          .order('ts', { ascending: false })
          .limit(10);

        if (alt.error && /column.*status/i.test(alt.error.message || '')) {
          alt = await supabase
            .from('transactions')
            .select('id, merchant, amount, category, ts, account_id')
            .eq('user_id', userId)
            .eq('account_id', selectedId)
            .order('ts', { ascending: false })
            .limit(10);
        }

        if (!alt.error && Array.isArray(alt.data) && alt.data.length > 0) {
          setRecent(
            alt.data.map((t) => ({
              id: t.id,
              merchant: t.merchant ?? 'Unknown merchant',
              amount: Number(t.amount ?? 0),
              category: t.category ?? 'General',
              timestamp: t.ts,
              status: (t.status || 'completed').toString(),
            }))
          );
        } else if (Array.isArray(nessie?.transactions) && nessie.transactions.length > 0) {
          const fallbackTx = nessie.transactions
            .filter((t) => {
              const raw = t.raw ?? {};
              const rawAccountId =
                raw.nessie_account_id ?? raw.account_id ?? raw.accountId ?? raw.account?.id ?? raw.accountIdRef ?? null;
              return !rawAccountId || rawAccountId === selectedId;
            })
            .slice(0, 10)
            .map((t) => ({
              id: t.id,
              merchant: t.merchant ?? 'Unknown merchant',
              amount: Number(t.amount ?? 0),
              category: t.category ?? 'General',
              timestamp: t.date ?? t.raw?.ts ?? t.raw?.timestamp ?? t.raw?.created_at ?? new Date().toISOString(),
              status: (t.raw?.status || 'completed').toString(),
            }));

          setRecent(fallbackTx);
        }
      } else if (!txResp.error && Array.isArray(txResp.data)) {
        setRecent(
          txResp.data.map((t) => ({
            id: t.id,
            merchant: t.merchant ?? 'Unknown merchant',
            amount: Number(t.amount ?? 0),
            category: t.category ?? 'General',
            timestamp: t.ts,
            status: (t.status || 'completed').toString(),
          }))
        );
      }

      // 90-day transactions (all accounts) for trends
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data: last90 } = await supabase
        .from('transactions')
        .select('id, merchant, amount, category, ts')
        .eq('user_id', userId)
        .gte('ts', since.toISOString())
        .order('ts', { ascending: true });

      if (alive && Array.isArray(last90) && last90.length > 0) {
        setTrendTx(
          last90.map((t) => ({
            id: t.id,
            merchant: t.merchant ?? 'Unknown merchant',
            amount: Number(t.amount ?? 0),
            category: t.category ?? 'General',
            timestamp: t.ts,
          }))
        );
      } else if (alive && Array.isArray(nessie?.transactions) && nessie.transactions.length > 0) {
        setTrendTx(
          nessie.transactions.map((t) => ({
            id: t.id,
            merchant: t.merchant ?? 'Unknown merchant',
            amount: Number(t.amount ?? 0),
            category: t.category ?? 'General',
            timestamp: t.date ?? t.raw?.ts ?? t.raw?.timestamp ?? t.raw?.created_at ?? new Date().toISOString(),
          }))
        );
      }
    })()
      .catch((error) => {
        console.warn('Failed to hydrate transactions for dashboard', error);
      })
      .finally(() => {
        setTransactionsLoading(false);
      });

    return () => {
      setTransactionsLoading(false);
      alive = false;
    };
  }, [
    isSyncingNessie,
    nessie?.transactions,
    selectedId,
    userId
  ]);

  // PPP (enhanced with COL filtering)
  const [pppTop, setPppTop] = useState([]);
  const [pppMarkers, setPppMarkers] = useState([]);
  const [coordsCache, setCoordsCache] = useState({});
  const [pppLoading, setPppLoading] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!userId) {
      setPppTop([]);
      setPppMarkers([]);
      setPppLoading(false);
      return () => {
        alive = false;
      };
    }
    setPppLoading(true);
    (async () => {
      const { data: prof } = await supabase
        .from('user_profile')
        .select('current_country_code')
        .eq('user_id', userId)
        .maybeSingle();
      const currentCode = (prof?.current_country_code || 'USA').toUpperCase();
      const { data: rows } = await supabase
        .from('ppp_country')
        .select('code, country, 2024_y')
        .not('2024_y', 'is', null)
        .limit(300);
      if (!Array.isArray(rows) || rows.length === 0) {
        if (alive) {
          setPppTop([]);
          setPppMarkers([]);
        }
        return;
      }
      const items = rows
        .map((r) => ({ code: String(r.code || '').toUpperCase(), name: String(r.country || '').toLowerCase(), p: Number(r['2024_y']) }))
        .filter((r) => r.p > 0);
      const base = items.find((r) => r.code === currentCode);
      const basePPP =
        base?.p ??
        (() => {
          const s = [...items].sort((a, b) => a.p - b.p);
          return s[Math.floor(s.length / 2)]?.p ?? 100;
        })();
      
      let top = items
        .map((r) => ({ 
          city: toTitleCase(r.name), 
          country: toTitleCase(r.name), 
          ppp: r.p, 
          savingsPct: (basePPP - r.p) / basePPP,
          monthlyCost: r.p * (baseMonthlyBudget / basePPP) // Approximate monthly cost
        }))
        .sort((a, b) => b.savingsPct - a.savingsPct);

      // Filter by COL similarity if user country data is available
      if (userCountryData) {
        top = filterSimilarCOL(top, userCountryData.cost_of_living);
      }
      
      top = top.slice(0, 6);

      const updates = {};
      for (const d of top) {
        const k = (d.country ?? d.city)?.toLowerCase();
        if (!k || coordsCache[k]) continue;
        const c = await getCountryCoords(d.country || d.city);
        if (c) updates[k] = c;
      }
      if (alive && Object.keys(updates).length) setCoordsCache((prev) => ({ ...prev, ...updates }));
      if (alive) {
        setPppTop(top.slice(0, 3));
        setPppMarkers(
          top
            .map((d) => {
              const k = (d.country ?? d.city)?.toLowerCase();
              const c = coordsCache[k];
              return c ? { city: d.city, coords: c, ppp: d.ppp } : null;
            })
            .filter(Boolean)
            .slice(0, 5)
        );
      }
    })()
      .catch((error) => {
        console.warn('Failed to hydrate PPP data', error);
      })
      .finally(() => {
        if (alive) setPppLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, coordsCache, baseMonthlyBudget, userCountryData]);

  // Enhanced trends/notifications with transaction analysis
  const trendData = useMemo(() => groupByWeek(trendTx), [trendTx]);
  const weeklyChange = useMemo(() => {
    if (trendData.length < 2) return null;
    const last = trendData.at(-1).amount;
    const prev = trendData.at(-2).amount || 1;
    const d = ((last - prev) / prev) * 100;
    return Number.isFinite(d) ? d : null;
  }, [trendData]);
  
  const budgetDelta = useMemo(() => {
    const cut = new Date(); cut.setDate(cut.getDate() - 30);
    const last30 = trendTx.filter((t) => new Date(t.timestamp) >= cut);
    const spent = last30.reduce((s, t) => s + Math.max(0, Number(t.amount || 0)), 0);
    return (baseMonthlyBudget || 0) - spent;
  }, [trendTx, baseMonthlyBudget]);

  // Calculate weekly spending for personalized nudges
  const weeklySpending = useMemo(() => {
    if (trendData.length === 0) return 0;
    return trendData.at(-1)?.amount || 0;
  }, [trendData]);

  // Enhanced notifications with transaction-based personalization
  const personalizedNotifications = useMemo(() => 
    buildPersonalizedNotifications({
      bestCity: pppTop[0],
      runnerUp: pppTop[1],
      weeklyChange,
      budgetDelta,
      weeklySpending,
      recentTransactions: recent,
      userCountry: userCountryData
    }), [pppTop, weeklyChange, budgetDelta, weeklySpending, recent, userCountryData]
  );

  // UI labels
  const heroLabel = displayName ? `${displayName.split(' ')[0]}'s budget` : 'Your budget';
  const heroSubtitle = baseMonthlyBudget
    ? `Here's how ${Number(baseMonthlyBudget).toLocaleString()}/month stretches across the globe.`
    : 'Let\'s see how your money travels.';

  const hasCachedAccounts =
    accounts.length > 0 || (Array.isArray(nessie?.accounts) && nessie.accounts.length > 0);
  const showDashboardLoader =
    authLoading ||
    (userId && !hasCachedAccounts && (accountsLoading || isSyncingNessie || transactionsLoading));
  const showSyncingIndicator = Boolean(userId && isSyncingNessie && hasCachedAccounts);

  if (showDashboardLoader) {
    return <DashboardLoader message="Loading your latest balances" />;
  }

  // Render
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {showSyncingIndicator && (
        <div className="flex justify-end text-xs text-teal/70">
          <InlineLoader label="Syncing latest balances" />
        </div>
      )}
      {/* Hero / Accounts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="col-span-1 bg-white/90">
          <CardHeader>
            <CardTitle>{heroLabel}</CardTitle>
            <p className="text-xs uppercase tracking-[0.3em] text-teal/60">Dynamic budget profile</p>
          </CardHeader>
          <CardContent>
            {/* Account selector: HARD RELOAD on change */}
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate/60">Account</label>
              <select
                className="w-full rounded-2xl border border-slate/20 bg-white/80 px-3 py-2 text-sm text-navy shadow-inner focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20 sm:w-auto"
                value={selectedId ?? ''}
                onChange={(e) => {
                  const next = e.target.value || null;
                  if (typeof window !== 'undefined') {
                    if (next) {
                      window.localStorage.setItem(ACCT_LS_KEY, next);
                    } else {
                      window.localStorage.removeItem(ACCT_LS_KEY);
                    }
                    // force full reload to guarantee fresh data render
                    window.location.reload();
                  }
                }}
              >
              {accounts.length === 0 && <option value="">No accounts</option>}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nickname?.trim() || `${a.type || 'Account'} • ${a.id.slice(-4)}`}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-3xl font-poppins font-semibold text-teal">
              {accountsLoading ? <InlineLoader label="Fetching balance" /> : fmtUSD(balanceUSD)}
            </p>
            <p className="mt-1 text-xs text-charcoal/60">
              {selectedType ? `Type: ${selectedType}` : accounts.length === 0 ? 'No accounts yet.' : 'Select an account.'}
            </p>

            <p className="mt-3 text-sm text-charcoal/70">{heroSubtitle}</p>
            <p className="mt-3 text-xs text-charcoal/50">Dashboard = balances, travel power, and PPP-led opportunities.</p>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 bg-white/90">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <p className="text-xs uppercase tracking-[0.3em] text-teal/60">Last 30 days</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {transactionsLoading && recent.length === 0 && (
                <li className="rounded-2xl border border-dashed border-navy/20 px-4 py-6 text-center text-sm text-charcoal/60">
                  <InlineLoader label="Fetching recent activity" />
                </li>
              )}
              {!transactionsLoading && recent.length === 0 && (
                <li className="rounded-2xl border border-dashed border-navy/20 px-4 py-6 text-center text-sm text-charcoal/60">
                  We'll populate this once your transactions sync.
                </li>
              )}
              {recent.map((t) => (
                <li key={t.id} className="flex flex-col justify-between rounded-2xl bg-offwhite/80 px-4 py-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold text-charcoal">
                      {t.merchant}
                      <span className="ml-2 rounded-full border border-slate/200 bg-white/60 px-2 py-[2px] text-[10px] uppercase tracking-wide text-slate/70">
                        {t.status}
                      </span>
                    </p>
                    <p className="text-xs text-charcoal/60">
                      {new Date(t.timestamp ?? Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-2 text-right sm:mt-0">
                    <p className="font-semibold text-coral">{fmtUSD(t.amount)}</p>
                    <p className="text-xs text-charcoal/60">{t.category}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Trends + Notifications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Trends & insights</CardTitle>
            <p className="text-sm text-charcoal/70">
              {(() => {
                if (trendData.length < 2) return 'We\'ll track spend trends once we have two weeks of data.';
                const last = trendData.at(-1).amount;
                const prev = trendData.at(-2).amount || 1;
                const wc = Number.isFinite((last - prev) / prev) ? (((last - prev) / prev) * 100).toFixed(1) : null;
                return wc != null
                  ? `Your spending is ${wc >= 0 ? 'up' : 'down'} ${Math.abs(wc)}% from last week.`
                  : 'We\'ll track spend trends once we have two weeks of data.';
              })()}
            </p>
          </CardHeader>
          <CardContent>
            {transactionsLoading && trendData.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <InlineLoader label="Preparing trend chart" />
              </div>
            ) : (
              <SpendingTrendChart data={groupByWeek(trendTx).map(({ label, amount }) => ({ label, amount }))} />
            )}
          </CardContent>
        </Card>

        <NotificationsWidget items={personalizedNotifications} />
      </div>

      {/* PPP map + picks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>PPP score heatmap</CardTitle>
            <p className="text-sm text-charcoal/70">Hover the globe to see how your purchasing power compares.</p>
          </CardHeader>
          <CardContent>
            {pppMarkers.length === 0 ? (
              <div className="flex min-h-[240px] items-center justify-center text-sm text-charcoal/60">
                {pppLoading ? <InlineLoader label="Loading PPP map" /> : 'PPP data is on the way — check back shortly.'}
              </div>
            ) : (
              <WorldMap markers={pppMarkers} />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <SavingsRunwayPanel
            destinations={pppTop.map((d) => ({ 
              city: d.city, 
              monthlyCost: d.monthlyCost || d.ppp, 
              ppp: d.ppp, 
              savings: d.savingsPct 
            }))}
            stayLengthMonths={6}
            userCountryCOL={userCountryData?.cost_of_living}
            maxCOLDifference={0.4}
          />
          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Top PPP picks</CardTitle>
              <p className="text-sm text-charcoal/70">
                GeoBudget = personalized travel & budget forecasting.
                {userCountryData && (
                  <span className="block mt-1 text-xs text-charcoal/50">
                    Showing destinations within 40% of your current cost of living.
                  </span>
                )}
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {pppTop.map((d) => (
                <CityCard key={d.city} city={d.city} ppp={d.ppp} savingsPct={d.savingsPct} />
              ))}
              {pppTop.length === 0 && (
                <div className="rounded-2xl border border-dashed border-navy/20 px-4 py-6 text-sm text-charcoal/60">
                  We're fetching PPP insights — check back shortly.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
