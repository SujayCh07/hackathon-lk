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

// Constants
const ACCT_LS_KEY = 'parity:selectedAccountId';
const DEFAULT_BUDGET = 2500;
const DEFAULT_COUNTRY_CODE = 'USA';
const TRANSACTION_LIMIT = 10;
const TREND_DAYS = 90;
const RECENT_DAYS = 30;
const WEEKLY_DAYS = 7;
const MIN_NUDGE_AMOUNT = 20;
const MAX_NUDGES = 3;
const MAX_DESTINATIONS = 6;
const COST_SIMILARITY_THRESHOLD = 0.4;
const MIN_TRANSACTION_DAYS = 2;
const WEEKLY_AFFORDABILITY_THRESHOLD = 0.5;
const MAX_RECENT_LARGE_TX = 3;
const MAX_WEEKLY_DESTINATIONS = 6;
const MAX_PPP_COUNTRIES = 300;
const MAX_PPP_TOP = 6;
const MAX_PPP_MARKERS = 5;
const DAYS_IN_MONTH = 30;

// Database column names
const DB_COLUMNS = {
  ACCOUNTS: {
    NESSIE_ACCOUNT_ID: 'nessie_account_id',
    ACCOUNT_TYPE: 'account_type',
    BALANCE: 'balance',
    SNAPSHOT_TS: 'snapshot_ts',
    NICKNAME: 'nickname',
    USER_ID: 'user_id'
  },
  TRANSACTIONS: {
    ID: 'id',
    MERCHANT: 'merchant',
    AMOUNT: 'amount',
    CATEGORY: 'category',
    TS: 'ts',
    NESSIE_ACCOUNT_ID: 'nessie_account_id',
    ACCOUNT_ID: 'account_id',
    STATUS: 'status',
    USER_ID: 'user_id'
  },
  USER_PROFILE: {
    USER_ID: 'user_id',
    CURRENT_COUNTRY_CODE: 'current_country_code',
    MONTHLY_BUDGET: 'monthly_budget',
    NAME: 'name'
  },
  PPP_COUNTRY: {
    CODE: 'code',
    COUNTRY: 'country',
    YEAR_2024: '2024_y'
  }
};

// Table names
const TABLES = {
  ACCOUNTS: 'accounts',
  TRANSACTIONS: 'transactions',
  USER_PROFILE: 'user_profile',
  PPP_COUNTRY: 'ppp_country'
};

// Default values
const DEFAULTS = {
  MERCHANT: 'Unknown merchant',
  CATEGORY: 'General',
  STATUS: 'completed',
  COUNTRY: 'USA'
};

// UI Messages
const MESSAGES = {
  NO_ACCOUNTS: 'No accounts',
  NO_ACCOUNTS_YET: 'No accounts yet.',
  SELECT_ACCOUNT: 'Select an account.',
  SYNC_PENDING: "We'll populate this once your transactions sync.",
  FETCH_PPP: "We're fetching PPP insights — check back shortly.",
  NO_RECENT_TX: 'No recent transactions to analyze.',
  MAKE_PURCHASES: 'Make some larger purchases to see travel comparisons!',
  TWO_WEEKS_DATA: "We'll track spend trends once we have two weeks of data."
};

// API endpoints
const ENDPOINTS = {
  NOMINATIM: 'https://nominatim.openstreetmap.org/search'
};

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

async function getCountryCoords(countryName) {
  try {
    const r = await fetch(
      `${ENDPOINTS.NOMINATIM}?country=${encodeURIComponent(countryName)}&format=json&limit=1`
    );
    const j = await r.json();
    if (Array.isArray(j) && j[0]) return [parseFloat(j[0].lat), parseFloat(j[0].lon)];
  } catch {}
  return null;
}

// Generate transaction-based travel nudges - only for affordable destinations
function generateTravelNudges(transactions, costDict) {
  const nudges = [];
  const USA_COL_THRESHOLD = (costDict['usa']?.cost_of_living || DEFAULT_BUDGET) * 0.5; // 50% of USA CoL
  
  // Get recent large transactions (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - RECENT_DAYS);
  
  const recentTx = transactions
    .filter(tx => new Date(tx.timestamp) >= thirtyDaysAgo)
    .sort((a, b) => b.amount - a.amount);

  // Find countries where user could spend days based on single transactions
  recentTx.slice(0, 5).forEach(tx => {
    const amount = Math.abs(tx.amount);
    if (amount < MIN_NUDGE_AMOUNT) return; // Skip small amounts
    
    // Find countries where this amount could cover multiple days (only affordable countries)
    const affordableDestinations = Object.entries(costDict)
      .filter(([country, costs]) => costs.cost_of_living <= USA_COL_THRESHOLD) // Only countries with CoL <= 50% of USA
      .map(([country, costs]) => ({
        country: toTitleCase(country.replace(/[_-]/g, ' ')),
        dailyCost: costs.cost_of_living / DAYS_IN_MONTH, // Monthly to daily
        days: Math.floor(amount / (costs.cost_of_living / DAYS_IN_MONTH))
      }))
      .filter(dest => dest.days >= MIN_TRANSACTION_DAYS) // At least 2 days
      .sort((a, b) => b.days - a.days)
      .slice(0, MAX_DESTINATIONS);

    if (affordableDestinations.length > 0) {
      const topDest = affordableDestinations[0];
      nudges.push({
        type: 'transaction_comparison',
        message: `Your ${fmtUSD(amount)} ${tx.merchant} purchase could cover ${topDest.days} days in ${topDest.country}!`,
        transaction: tx,
        destinations: affordableDestinations
      });
    }
  });

  // Weekly spending power analysis (only affordable countries)
  const weeklySpend = transactions
    .filter(tx => {
      const txDate = new Date(tx.timestamp);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - WEEKLY_DAYS);
      return txDate >= weekAgo;
    })
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  if (weeklySpend > 0) {
    const weeklyDestinations = Object.entries(costDict)
      .filter(([country, costs]) => costs.cost_of_living <= USA_COL_THRESHOLD) // Only affordable countries
      .map(([country, costs]) => ({
        country: toTitleCase(country.replace(/[_-]/g, ' ')),
        weeklyCost: (costs.cost_of_living / DAYS_IN_MONTH) * WEEKLY_DAYS,
        ratio: weeklySpend / ((costs.cost_of_living / DAYS_IN_MONTH) * WEEKLY_DAYS)
      }))
      .filter(dest => dest.ratio >= 0.8) // Can afford at least 80% of a week
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 5);

    if (weeklyDestinations.length > 0) {
      nudges.push({
        type: 'weekly_spending',
        message: `This week's ${fmtUSD(weeklySpend)} spending could fund a week in ${weeklyDestinations.length} countries!`,
        weeklySpend,
        destinations: weeklyDestinations
      });
    }
  }

  return nudges.slice(0, MAX_NUDGES); // Limit to 3 nudges
}

// Get similar cost destinations (within 40% of current country cost)
function getSimilarCostDestinations(currentCountryCost, costDict) {
  if (!currentCountryCost) return [];
  
  return Object.entries(costDict)
    .map(([country, costs]) => {
      const diff = Math.abs(costs.cost_of_living - currentCountryCost) / currentCountryCost;
      return {
        country: toTitleCase(country.replace(/[_-]/g, ' ')),
        monthlyCost: costs.cost_of_living,
        difference: diff
      };
    })
    .filter(dest => dest.difference >= 0.13 && dest.difference <= 0.25) // ✅ 15%–30%
    .sort((a, b) => a.difference - b.difference)
    .slice(0, MAX_DESTINATIONS);
}

export default function Dashboard() {
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
    return DEFAULT_BUDGET;
  }, [profile?.monthly_budget]);

  // ── Accounts & selection ───────────────────────────────────────────────────
  const [accounts, setAccounts] = useState([]); // [{ id, type, balance, nickname, snapshot_ts }]
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [balanceUSD, setBalanceUSD] = useState(0);

  // recent tx for selected account (rendered after load)
  const [recent, setRecent] = useState([]);
  // 90-day tx for trends (all accounts)
  const [trendTx, setTrendTx] = useState([]);
  // All transactions for nudge generation
  const [allTx, setAllTx] = useState([]);

  // Travel nudges state
  const [travelNudges, setTravelNudges] = useState([]);
  const [similarDestinations, setSimilarDestinations] = useState([]);
  const [currentCountryCost, setCurrentCountryCost] = useState(null);

  // Load accounts (prefer nickname if column exists)
  useEffect(() => {
    let alive = true;
    if (!userId) return;

    (async () => {
      let rows = null;
      let error = null;

      // Try with nickname present
      ({ data: rows, error } = await supabase
        .from(TABLES.ACCOUNTS)
        .select(`${DB_COLUMNS.ACCOUNTS.NESSIE_ACCOUNT_ID}, ${DB_COLUMNS.ACCOUNTS.ACCOUNT_TYPE}, ${DB_COLUMNS.ACCOUNTS.BALANCE}, ${DB_COLUMNS.ACCOUNTS.SNAPSHOT_TS}, ${DB_COLUMNS.ACCOUNTS.NICKNAME}`)
        .eq(DB_COLUMNS.ACCOUNTS.USER_ID, userId)
        .order(DB_COLUMNS.ACCOUNTS.SNAPSHOT_TS, { ascending: true }));

      // Fallback without nickname column
      if (error) {
        const res = await supabase
          .from(TABLES.ACCOUNTS)
          .select(`${DB_COLUMNS.ACCOUNTS.NESSIE_ACCOUNT_ID}, ${DB_COLUMNS.ACCOUNTS.ACCOUNT_TYPE}, ${DB_COLUMNS.ACCOUNTS.BALANCE}, ${DB_COLUMNS.ACCOUNTS.SNAPSHOT_TS}`)
          .eq(DB_COLUMNS.ACCOUNTS.USER_ID, userId)
          .order(DB_COLUMNS.ACCOUNTS.SNAPSHOT_TS, { ascending: true });
        rows = res.data || [];
      }

      if (!Array.isArray(rows) || rows.length === 0) {
        if (alive) {
          setAccounts([]);
          setSelectedId(null);
          setBalanceUSD(0);
          setSelectedType(null);
        }
        return;
      }

      const firstSeenOrder = [];
      const latestById = new Map();
      const seen = new Set();
      for (const r of rows) {
        const id = r[DB_COLUMNS.ACCOUNTS.NESSIE_ACCOUNT_ID];
        if (!seen.has(id)) { seen.add(id); firstSeenOrder.push(id); }
        const prev = latestById.get(id);
        if (!prev || new Date(r[DB_COLUMNS.ACCOUNTS.SNAPSHOT_TS]) > new Date(prev[DB_COLUMNS.ACCOUNTS.SNAPSHOT_TS])) {
          latestById.set(id, r);
        }
      }

      const list = firstSeenOrder.map((id) => {
        const lr = latestById.get(id);
        return {
          id,
          type: lr?.[DB_COLUMNS.ACCOUNTS.ACCOUNT_TYPE] ?? null,
          balance: Number(lr?.[DB_COLUMNS.ACCOUNTS.BALANCE] ?? 0),
          nickname: lr?.[DB_COLUMNS.ACCOUNTS.NICKNAME] ?? null,
          snapshot_ts: lr?.[DB_COLUMNS.ACCOUNTS.SNAPSHOT_TS] ?? null,
        };
      });

      if (!alive) return;
      setAccounts(list);

      // Default: last chosen (localStorage) or the oldest account created (firstSeen)
      const saved = localStorage.getItem(ACCT_LS_KEY);
      const defaultId = saved && list.some((a) => a.id === saved) ? saved : firstSeenOrder[0] ?? null;
      setSelectedId(defaultId);

      const def = list.find((a) => a.id === defaultId);
      if (def) {
        setBalanceUSD(def.balance);
        setSelectedType(def.type ?? null);
      }
    })();

    return () => { alive = false; };
  }, [userId]);

  // Persist selection
  useEffect(() => {
    if (selectedId) localStorage.setItem(ACCT_LS_KEY, selectedId);
  }, [selectedId]);

  // Fetch data for current selection (runs on load and after hard refresh)
  useEffect(() => {
    let alive = true;
    if (!userId || !selectedId) return;

    (async () => {
      // Confirm latest snapshot (and nickname if we just learned it)
      const { data: latest } = await supabase
        .from(TABLES.ACCOUNTS)
        .select(`${DB_COLUMNS.ACCOUNTS.ACCOUNT_TYPE}, ${DB_COLUMNS.ACCOUNTS.BALANCE}, ${DB_COLUMNS.ACCOUNTS.SNAPSHOT_TS}, ${DB_COLUMNS.ACCOUNTS.NICKNAME}`)
        .eq(DB_COLUMNS.ACCOUNTS.USER_ID, userId)
        .eq(DB_COLUMNS.ACCOUNTS.NESSIE_ACCOUNT_ID, selectedId)
        .order(DB_COLUMNS.ACCOUNTS.SNAPSHOT_TS, { ascending: false })
        .limit(1);

      if (alive && Array.isArray(latest) && latest[0]) {
        setSelectedType(latest[0][DB_COLUMNS.ACCOUNTS.ACCOUNT_TYPE] ?? null);
        setBalanceUSD(Number(latest[0][DB_COLUMNS.ACCOUNTS.BALANCE] ?? 0));
        if (latest[0][DB_COLUMNS.ACCOUNTS.NICKNAME]) {
          setAccounts((prev) => prev.map((p) => (p.id === selectedId ? { ...p, nickname: latest[0][DB_COLUMNS.ACCOUNTS.NICKNAME] } : p)));
        }
      }

      // Recent transactions for this account (10)
      // Try nessie_account_id first, then fallback to account_id
      let txResp = await supabase
        .from(TABLES.TRANSACTIONS)
        .select(`${DB_COLUMNS.TRANSACTIONS.ID}, ${DB_COLUMNS.TRANSACTIONS.MERCHANT}, ${DB_COLUMNS.TRANSACTIONS.AMOUNT}, ${DB_COLUMNS.TRANSACTIONS.CATEGORY}, ${DB_COLUMNS.TRANSACTIONS.TS}, ${DB_COLUMNS.TRANSACTIONS.NESSIE_ACCOUNT_ID}, ${DB_COLUMNS.TRANSACTIONS.STATUS}`)
        .eq(DB_COLUMNS.TRANSACTIONS.USER_ID, userId)
        .eq(DB_COLUMNS.TRANSACTIONS.NESSIE_ACCOUNT_ID, selectedId)
        .order(DB_COLUMNS.TRANSACTIONS.TS, { ascending: false })
        .limit(TRANSACTION_LIMIT);

      if (txResp.error && /column.*status/i.test(txResp.error.message || '')) {
        txResp = await supabase
          .from(TABLES.TRANSACTIONS)
          .select(`${DB_COLUMNS.TRANSACTIONS.ID}, ${DB_COLUMNS.TRANSACTIONS.MERCHANT}, ${DB_COLUMNS.TRANSACTIONS.AMOUNT}, ${DB_COLUMNS.TRANSACTIONS.CATEGORY}, ${DB_COLUMNS.TRANSACTIONS.TS}, ${DB_COLUMNS.TRANSACTIONS.NESSIE_ACCOUNT_ID}`)
          .eq(DB_COLUMNS.TRANSACTIONS.USER_ID, userId)
          .eq(DB_COLUMNS.TRANSACTIONS.NESSIE_ACCOUNT_ID, selectedId)
          .order(DB_COLUMNS.TRANSACTIONS.TS, { ascending: false })
          .limit(TRANSACTION_LIMIT);
      }

      if ((txResp.error && /nessie_account_id/i.test(txResp.error.message || '')) ||
          (Array.isArray(txResp.data) && txResp.data.length === 0)) {
        let alt = await supabase
          .from(TABLES.TRANSACTIONS)
          .select(`${DB_COLUMNS.TRANSACTIONS.ID}, ${DB_COLUMNS.TRANSACTIONS.MERCHANT}, ${DB_COLUMNS.TRANSACTIONS.AMOUNT}, ${DB_COLUMNS.TRANSACTIONS.CATEGORY}, ${DB_COLUMNS.TRANSACTIONS.TS}, ${DB_COLUMNS.TRANSACTIONS.ACCOUNT_ID}, ${DB_COLUMNS.TRANSACTIONS.STATUS}`)
          .eq(DB_COLUMNS.TRANSACTIONS.USER_ID, userId)
          .eq(DB_COLUMNS.TRANSACTIONS.ACCOUNT_ID, selectedId)
          .order(DB_COLUMNS.TRANSACTIONS.TS, { ascending: false })
          .limit(TRANSACTION_LIMIT);

        if (alt.error && /column.*status/i.test(alt.error.message || '')) {
          alt = await supabase
            .from(TABLES.TRANSACTIONS)
            .select(`${DB_COLUMNS.TRANSACTIONS.ID}, ${DB_COLUMNS.TRANSACTIONS.MERCHANT}, ${DB_COLUMNS.TRANSACTIONS.AMOUNT}, ${DB_COLUMNS.TRANSACTIONS.CATEGORY}, ${DB_COLUMNS.TRANSACTIONS.TS}, ${DB_COLUMNS.TRANSACTIONS.ACCOUNT_ID}`)
            .eq(DB_COLUMNS.TRANSACTIONS.USER_ID, userId)
            .eq(DB_COLUMNS.TRANSACTIONS.ACCOUNT_ID, selectedId)
            .order(DB_COLUMNS.TRANSACTIONS.TS, { ascending: false })
            .limit(TRANSACTION_LIMIT);
        }

        if (!alt.error && Array.isArray(alt.data)) {
          setRecent(
            alt.data.map((t) => ({
              id: t[DB_COLUMNS.TRANSACTIONS.ID],
              merchant: t[DB_COLUMNS.TRANSACTIONS.MERCHANT] ?? DEFAULTS.MERCHANT,
              amount: Number(t[DB_COLUMNS.TRANSACTIONS.AMOUNT] ?? 0),
              category: t[DB_COLUMNS.TRANSACTIONS.CATEGORY] ?? DEFAULTS.CATEGORY,
              timestamp: t[DB_COLUMNS.TRANSACTIONS.TS],
              status: (t[DB_COLUMNS.TRANSACTIONS.STATUS] || DEFAULTS.STATUS).toString(),
            }))
          );
        }
      } else if (!txResp.error && Array.isArray(txResp.data)) {
        setRecent(
          txResp.data.map((t) => ({
            id: t[DB_COLUMNS.TRANSACTIONS.ID],
            merchant: t[DB_COLUMNS.TRANSACTIONS.MERCHANT] ?? DEFAULTS.MERCHANT,
            amount: Number(t[DB_COLUMNS.TRANSACTIONS.AMOUNT] ?? 0),
            category: t[DB_COLUMNS.TRANSACTIONS.CATEGORY] ?? DEFAULTS.CATEGORY,
            timestamp: t[DB_COLUMNS.TRANSACTIONS.TS],
            status: (t[DB_COLUMNS.TRANSACTIONS.STATUS] || DEFAULTS.STATUS).toString(),
          }))
        );
      }

      // 90-day transactions (all accounts) for trends
      const since = new Date();
      since.setDate(since.getDate() - TREND_DAYS);
      const { data: last90 } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select(`${DB_COLUMNS.TRANSACTIONS.ID}, ${DB_COLUMNS.TRANSACTIONS.MERCHANT}, ${DB_COLUMNS.TRANSACTIONS.AMOUNT}, ${DB_COLUMNS.TRANSACTIONS.CATEGORY}, ${DB_COLUMNS.TRANSACTIONS.TS}`)
        .eq(DB_COLUMNS.TRANSACTIONS.USER_ID, userId)
        .gte(DB_COLUMNS.TRANSACTIONS.TS, since.toISOString())
        .order(DB_COLUMNS.TRANSACTIONS.TS, { ascending: true });

      if (alive && Array.isArray(last90)) {
        const txData = last90.map((t) => ({
          id: t[DB_COLUMNS.TRANSACTIONS.ID],
          merchant: t[DB_COLUMNS.TRANSACTIONS.MERCHANT] ?? DEFAULTS.MERCHANT,
          amount: Number(t[DB_COLUMNS.TRANSACTIONS.AMOUNT] ?? 0),
          category: t[DB_COLUMNS.TRANSACTIONS.CATEGORY] ?? DEFAULTS.CATEGORY,
          timestamp: t[DB_COLUMNS.TRANSACTIONS.TS],
        }));
        setTrendTx(txData);
        setAllTx(txData); // Use same data for nudge generation
      }
    })();

    return () => { alive = false; };
  }, [userId, selectedId]);

  // Get current country cost and generate travel nudges
  useEffect(() => {
    if (!userId) return;
    
    (async () => {
      // Get user's current country
      const { data: prof } = await supabase
        .from(TABLES.USER_PROFILE)
        .select(DB_COLUMNS.USER_PROFILE.CURRENT_COUNTRY_CODE)
        .eq(DB_COLUMNS.USER_PROFILE.USER_ID, userId)
        .maybeSingle();
      
      const currentCode = (prof?.[DB_COLUMNS.USER_PROFILE.CURRENT_COUNTRY_CODE] || DEFAULT_COUNTRY_CODE).toLowerCase();
      
      // Find current country cost (fallback to US average if not found)
      const currentCost = Dictionary[currentCode]?.cost_of_living || DEFAULT_BUDGET;
      setCurrentCountryCost(currentCost);
      
      // Generate similar cost destinations
      const similar = getSimilarCostDestinations(currentCost, Dictionary);
      setSimilarDestinations(similar);
      
      // Generate travel nudges based on transactions
      if (allTx.length > 0) {
        const nudges = generateTravelNudges(allTx, Dictionary);
        setTravelNudges(nudges);
      }
    })();
  }, [userId, allTx]);

  // PPP (unchanged)
  const [pppTop, setPppTop] = useState([]);
  const [pppMarkers, setPppMarkers] = useState([]);
  const [coordsCache, setCoordsCache] = useState({});
  useEffect(() => {
    let alive = true;
    if (!userId) return;
    (async () => {
      const { data: prof } = await supabase.from(TABLES.USER_PROFILE).select(DB_COLUMNS.USER_PROFILE.CURRENT_COUNTRY_CODE).eq(DB_COLUMNS.USER_PROFILE.USER_ID, userId).maybeSingle();
      const currentCode = (prof?.[DB_COLUMNS.USER_PROFILE.CURRENT_COUNTRY_CODE] || DEFAULT_COUNTRY_CODE).toUpperCase();
      const { data: rows } = await supabase
        .from(TABLES.PPP_COUNTRY)
        .select(`${DB_COLUMNS.PPP_COUNTRY.CODE}, ${DB_COLUMNS.PPP_COUNTRY.COUNTRY}, ${DB_COLUMNS.PPP_COUNTRY.YEAR_2024}`)
        .not(DB_COLUMNS.PPP_COUNTRY.YEAR_2024, 'is', null)
        .limit(MAX_PPP_COUNTRIES);
      if (!Array.isArray(rows) || rows.length === 0) return;
      const items = rows
        .map((r) => ({ code: String(r[DB_COLUMNS.PPP_COUNTRY.CODE] || '').toUpperCase(), name: String(r[DB_COLUMNS.PPP_COUNTRY.COUNTRY] || '').toLowerCase(), p: Number(r[DB_COLUMNS.PPP_COUNTRY.YEAR_2024]) }))
        .filter((r) => r.p > 0);
      const base = items.find((r) => r.code === currentCode);
      const basePPP =
        base?.p ??
        (() => {
          const s = [...items].sort((a, b) => a.p - b.p);
          return s[Math.floor(s.length / 2)]?.p ?? 100;
        })();
      const top = items
        .map((r) => ({ city: toTitleCase(r.name), country: toTitleCase(r.name), ppp: r.p, savingsPct: (basePPP - r.p) / basePPP }))
        .sort((a, b) => b.savingsPct - a.savingsPct)
        .slice(0, MAX_PPP_TOP);
      const updates = {};
      for (const d of top) {
        const k = (d.country ?? d.city)?.toLowerCase();
        if (!k || coordsCache[k]) continue;
        const c = await getCountryCoords(d.country || d.city);
        if (c) updates[k] = c;
      }
      if (alive && Object.keys(updates).length) setCoordsCache((prev) => ({ ...prev, ...updates }));
      if (alive) {
        setPppTop(top.slice(0, MAX_DESTINATIONS));
        setPppMarkers(
          top
            .map((d) => {
              const k = (d.country ?? d.city)?.toLowerCase();
              const c = coordsCache[k];
              return c ? { city: d.city, coords: c, ppp: d.ppp } : null;
            })
            .filter(Boolean)
            .slice(0, MAX_PPP_MARKERS)
        );
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, coordsCache]);

  // Enhanced markers including similar cost destinations
  const [enhancedMarkers, setEnhancedMarkers] = useState([]);
  useEffect(() => {
    const getMarkersWithCoords = async () => {
      const markers = [...pppMarkers];
      
      // Add similar cost destinations to markers
      for (const dest of similarDestinations) {
        const coords = await getCountryCoords(dest.country);
        if (coords) {
          markers.push({
            city: dest.country,
            coords,
            ppp: dest.monthlyCost,
            type: 'similar_cost'
          });
        }
      }
      
      setEnhancedMarkers(markers);
    };
    
    getMarkersWithCoords();
  }, [pppMarkers, similarDestinations]);

  // Trends/notifications
  const trendData = useMemo(() => groupByWeek(trendTx), [trendTx]);
  const weeklyChange = useMemo(() => {
    if (trendData.length < 2) return null;
    const last = trendData.at(-1).amount;
    const prev = trendData.at(-2).amount || 1;
    const d = ((last - prev) / prev) * 100;
    return Number.isFinite(d) ? d : null;
  }, [trendData]);
  const budgetDelta = useMemo(() => {
    const cut = new Date(); cut.setDate(cut.getDate() - RECENT_DAYS);
    const last30 = trendTx.filter((t) => new Date(t.timestamp) >= cut);
    const spent = last30.reduce((s, t) => s + Math.max(0, Number(t.amount || 0)), 0);
    return (baseMonthlyBudget || 0) - spent;
  }, [trendTx, baseMonthlyBudget]);

  // UI labels
  const heroLabel = displayName ? `${displayName.split(' ')[0]}'s budget` : 'Your budget';
  const heroSubtitle = baseMonthlyBudget
    ? `Here's how $${Number(baseMonthlyBudget).toLocaleString()}/month stretches across the globe.`
    : "Let's see how your money travels.";

  // Enhanced notifications including travel nudges
  const enhancedNotifications = useMemo(() => {
    const notes = [];
    
    // Add travel nudges
    travelNudges.forEach(nudge => {
      notes.push(nudge.message);
    });
    
    // Original notifications
    const last = trendData.at(-1)?.amount ?? null;
    const prev = trendData.at(-2)?.amount ?? null;
    if (last != null && prev != null && prev !== 0) {
      const wc = ((last - prev) / prev) * 100;
      if (Number.isFinite(wc)) {
        notes.push(`Your weekly spending is ${wc > 0 ? 'up' : 'down'} ${Math.abs(Math.round(wc))}% vs. last week.`);
      }
    }
    if (Number.isFinite(budgetDelta)) {
      if (budgetDelta > 0) notes.push(`You're pacing ${Math.round(budgetDelta).toLocaleString()} under budget — bank the surplus for travel.`);
      else if (budgetDelta < 0) notes.push(`You're trending ${Math.abs(Math.round(budgetDelta)).toLocaleString()} over budget — adjust for your next trip.`);
    }
    
    return notes;
  }, [travelNudges, trendData, budgetDelta]);

  // Render
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
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
                  if (next) {
                    localStorage.setItem(ACCT_LS_KEY, next);
                  } else {
                    localStorage.removeItem(ACCT_LS_KEY);
                  }
                  // force full reload to guarantee fresh data render
                  window.location.reload();
                }}
              >
                {accounts.length === 0 && <option value="">{MESSAGES.NO_ACCOUNTS}</option>}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nickname?.trim() || `${a.type || 'Account'} • ${a.id.slice(-4)}`}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-3xl font-poppins font-semibold text-teal">{fmtUSD(balanceUSD)}</p>
            <p className="mt-1 text-xs text-charcoal/60">
              {selectedType ? `Type: ${selectedType}` : accounts.length === 0 ? MESSAGES.NO_ACCOUNTS_YET : MESSAGES.SELECT_ACCOUNT}
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
              {recent.length === 0 && (
                <li className="rounded-2xl border border-dashed border-navy/20 px-4 py-6 text-center text-sm text-charcoal/60">
                  {MESSAGES.SYNC_PENDING}
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

      {/* Travel Nudges Section - REMOVED */}

      {/* Trends + Notifications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Trends & insights</CardTitle>
            <p className="text-sm text-charcoal/70">
              {(() => {
                if (trendData.length < 2) return MESSAGES.TWO_WEEKS_DATA;
                const last = trendData.at(-1).amount;
                const prev = trendData.at(-2).amount || 1;
                const wc = Number.isFinite((last - prev) / prev) ? (((last - prev) / prev) * 100).toFixed(1) : null;
                return wc != null
                  ? `Your spending is ${wc >= 0 ? 'up' : 'down'} ${Math.abs(wc)}% from last week.`
                  : MESSAGES.TWO_WEEKS_DATA;
              })()}
            </p>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart data={groupByWeek(trendTx).map(({ label, amount }) => ({ label, amount }))} />
          </CardContent>
        </Card>

        <NotificationsWidget items={enhancedNotifications} />
      </div>

      {/* Similar Cost Destinations */}
      {similarDestinations.length > 0 && (
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Similar Cost Destinations</CardTitle>
            <p className="text-sm text-charcoal/70">
              Countries with living costs within 40% of your current location
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {similarDestinations.map((dest, index) => (
                <div key={index} className="rounded-2xl bg-gradient-to-br from-teal/10 to-coral/10 p-4 border border-teal/20">
                  <p className="font-semibold text-charcoal">{dest.country}</p>
                  <p className="text-2xl font-semibold text-teal mt-1">{fmtUSD(dest.monthlyCost / DAYS_IN_MONTH)}/day</p>
                  <p className="text-xs text-charcoal/60 mt-1">
                    {dest.difference > 0 ? '+' : ''}{(dest.difference * 100).toFixed(1)}% vs your location
                  </p>
                  <div className="mt-2 text-xs space-y-1">
                    <p className="text-charcoal/70">
                      Monthly budget: {fmtUSD(dest.monthlyCost)}
                    </p>
                    <p className="text-charcoal/70">
                      Weekly budget: {fmtUSD((dest.monthlyCost / DAYS_IN_MONTH) * WEEKLY_DAYS)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PPP map + picks */}
      {/* PPP map + picks */} 
<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
  <Card className="bg-white/90">
    <CardHeader>
      <CardTitle>PPP score heatmap</CardTitle>
      <p className="text-sm text-charcoal/70">
        Hover the globe to see how your purchasing power compares. 
        {similarDestinations.length > 0 && " Blue markers show similar-cost destinations."}
      </p>
    </CardHeader>
    <CardContent>
      <WorldMap markers={enhancedMarkers} />
    </CardContent>
  </Card>

  <div className="grid grid-cols-1 gap-4">
    <SavingsRunwayPanel
      destinations={[
        ...pppTop.map((d) => ({ 
          city: d.city, 
          monthlyCost: d.ppp, 
          ppp: d.ppp, 
          savings: d.savingsPct 
        })),
        ...similarDestinations
          .slice(0, MAX_DESTINATIONS)
          .map((d) => ({ 
            city: d.country, 
            monthlyCost: d.monthlyCost, 
            ppp: d.monthlyCost, 
            savings: -d.difference 
          }))
      ].slice(0, 5)}   // ✅ now limited to 5
      stayLengthMonths={6}
    />
  </div>
</div>


      {/* Transaction-Based Destination Insights */}

    </div>
  );
}