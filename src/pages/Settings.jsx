// src/pages/Settings.jsx
<<<<<<< HEAD
import { useEffect, useMemo, useState } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
=======
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
import Button from '../components/ui/Button.jsx';
import { SettingsSection } from '../components/settings/SettingsSection.jsx';
import { Toast } from '../components/ui/Toast.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { useAuth } from '../hooks/useAuth.js';
import { useTransactions } from '../hooks/useTransactions.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import { supabase } from '../lib/supabase.js';
import { syncNessie } from '../lib/api'; // ⬅️ NEW: calls the nessie-sync Edge Function

/* ---------- small helpers ---------- */

function formatCurrency(amount, currency = 'USD') {
  try {
<<<<<<< HEAD
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(amount);
=======
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
  } catch {
    return `$${Number(amount ?? 0).toFixed(2)}`;
  }
}

<<<<<<< HEAD
const EMPTY_ADDRESS_FORM = { houseNumber: '', street: '', city: '', state: '' };
=======
const EMPTY_ADDRESS = { houseNumber: '', street: '', city: '', state: '' };
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920

function normalizeAddress(parts = EMPTY_ADDRESS) {
  return {
<<<<<<< HEAD
    houseNumber: typeof parts.houseNumber === 'string' ? parts.houseNumber.trim() : EMPTY_ADDRESS_FORM.houseNumber,
    street: typeof parts.street === 'string' ? parts.street.trim() : EMPTY_ADDRESS_FORM.street,
    city: typeof parts.city === 'string' ? parts.city.trim() : EMPTY_ADDRESS_FORM.city,
    state: typeof parts.state === 'string' ? parts.state.trim().toUpperCase() : EMPTY_ADDRESS_FORM.state,
=======
    houseNumber: typeof parts.houseNumber === 'string' ? parts.houseNumber.trim() : '',
    street: typeof parts.street === 'string' ? parts.street.trim() : '',
    city: typeof parts.city === 'string' ? parts.city.trim() : '',
    state: typeof parts.state === 'string' ? parts.state.trim().toUpperCase() : '',
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
  };
}

function formatAddressPreview(parts) {
  const a = normalizeAddress(parts);
  const l1 = [a.houseNumber, a.street].filter(Boolean).join(' ').trim();
  const l2 = [a.city, a.state].filter(Boolean).join(', ').replace(/^,\s*/, '').trim();
  return [l1, l2].filter(Boolean).join('\n');
}

function serialiseAddress(parts) {
  const normalised = normalizeAddress(parts);
  const formatted = formatAddressPreview(normalised);
<<<<<<< HEAD
  const hasValue = Object.values(normalised).some((v) => v.length > 0);

  if (!hasValue) return { normalised, formatted: '', serialised: null };

  return {
    normalised,
    formatted,
    serialised: JSON.stringify({ ...normalised, formatted }),
  };
=======
  const hasAny = Object.values(normalised).some(v => v.length > 0);
  return hasAny ? JSON.stringify({ ...normalised, formatted }) : null;
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
}

/* ---------- page ---------- */

export default function Settings() {
<<<<<<< HEAD
  // We keep your auth hook for user + existing context,
  // but balances will now come from Supabase (dbAccounts) first.
  const { user, nessie } = useAuth();
=======
  const { user } = useAuth();
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
  const userId = user?.id ?? null;

  const {
    profile,
    loading: profileLoading,
    error: profileError,
    refresh: refreshProfile,
  } = useUserProfile(userId);

<<<<<<< HEAD
  // ---------------- Profile state (unchanged) ----------------
=======
  const {
    accounts,
    balanceUSD,
    isRefreshing: accountsRefreshing,
    error: accountsError,
    refresh: refreshAccounts,
  } = useAccount();

  const monthlyBudgetNumber = typeof profile?.monthlyBudget === 'number' ? profile.monthlyBudget : null;

  const {
    isRefreshing: transactionsRefreshing,
    refresh: refreshTransactions,
  } = useTransactions({ limit: 5, monthlyBudget: monthlyBudgetNumber, balanceUSD });

  // form state
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
  const [displayName, setDisplayName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [addressHouseNumber, setAddressHouseNumber] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [currentCountryCode, setCurrentCountryCode] = useState('');
  const [homeCountryCode, setHomeCountryCode] = useState('');

  // ui state
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null);
  const [accountsStatus, setAccountsStatus] = useState(null);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState(null);

<<<<<<< HEAD
  // ---------------- NEW: balances from DB ----------------
  const [dbAccounts, setDbAccounts] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // Load latest balances for this user from v_latest_account
  async function refreshDbAccounts() {
    if (!userId) {
      setDbAccounts([]);
      return;
    }
    const { data, error } = await supabase
      .from('v_latest_account')
      .select('nessie_account_id, account_type, account_number_masked, balance, currency_code')
      .eq('user_id', userId);

    if (error) {
      // Don’t hard fail the page; just show message on the card
      setAccountsStatus({ type: 'error', message: error.message || 'Unable to load balances.' });
      setDbAccounts([]);
      return;
    }
    setDbAccounts(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    refreshDbAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const countryOptions = useMemo(() => {
    const map = new Map();
    const push = (entry) => {
      if (!entry) return;
      const code = typeof entry.code === 'string' ? entry.code.trim() : '';
      const name = typeof entry.name === 'string' ? entry.name.trim() : null;
      if (!code) return;
      const key = code.toUpperCase();
      if (!map.has(key)) {
        map.set(key, { code, name: name && name.length > 0 ? name : code });
      }
    };

    countries.forEach(push);
    push(profile?.currentCountry);
    push(profile?.homeCountry);
=======
  // toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback((t) => setToast({ id: Date.now(), ...t }), []);
  const dismissToast = useCallback(() => setToast(null), []);
  useEffect(() => {
    if (!toast?.duration) return;
    const id = setTimeout(() => setToast(null), toast.duration);
    return () => clearTimeout(id);
  }, [toast]);
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920

  const isSyncingNessie = accountsRefreshing || transactionsRefreshing;

  useEffect(() => {
<<<<<<< HEAD
    if (!profileToast) return undefined;
    const timeout = setTimeout(() => setProfileToast(null), profileToast.duration ?? 4800);
    return () => clearTimeout(timeout);
  }, [profileToast]);

  const identityFallback = useMemo(() => {
    if (!user) return '';
    const metadataName = user.user_metadata?.displayName;
    if (metadataName && metadataName.trim()) return metadataName.trim();
    if (user.email) {
      const [local] = user.email.split('@');
      return local ?? '';
    }
=======
    if (accountsError) {
      setAccountsStatus({
        type: 'error',
        message: 'Unable to reach Nessie right now. Showing cached balances.'
      });
    }
  }, [accountsError]);

  const identityFallback = useMemo(() => {
    if (!user) return '';
    const md = user.user_metadata ?? {};
    if (md.displayName && md.displayName.trim()) return md.displayName.trim();
    if (user.email) return (user.email.split('@')[0] ?? '').trim();
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
    return '';
  }, [user]);

  // load profile -> seed form
  useEffect(() => {
    if (profileLoading) return;
    setDisplayName(profile?.name ?? identityFallback);
    setMonthlyBudget(
      profile?.monthlyBudget != null && !Number.isNaN(profile.monthlyBudget) ? String(profile.monthlyBudget) : ''
    );
    const addr = profile?.streetAddress ?? null; // could be stringified JSON from earlier saves
    if (addr && typeof addr === 'object') {
      setAddressHouseNumber(addr.houseNumber ?? '');
      setAddressStreet(addr.street ?? '');
      setAddressCity(addr.city ?? '');
      setAddressState(addr.state ? String(addr.state).toUpperCase() : '');
    } else {
      setAddressHouseNumber(''); setAddressStreet(''); setAddressCity(''); setAddressState('');
    }
    setCurrentCountryCode(profile?.currentCountry?.code ?? '');
    setHomeCountryCode(profile?.homeCountry?.code ?? '');
  }, [profile, profileLoading, identityFallback]);

  // countries list
  useEffect(() => {
    let active = true;
    setCountriesLoading(true);
    setCountriesError(null);

    supabase
      .from('country_ref')
      .select('code, country')
      .order('country', { ascending: true })
      .limit(300)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
<<<<<<< HEAD
        const normalised = (data ?? []).map((c) => ({
          code: typeof c.code === 'string' ? c.code.trim() : '',
          name: typeof c.country === 'string' && c.country.trim().length > 0 ? c.country.trim() : (c.code ?? '').trim() || 'Unnamed country'
        }));
        setCountries(normalised);
=======
        setCountries(
          (data ?? []).map((c) => ({
            code: typeof c.code === 'string' ? c.code.trim() : '',
            name:
              typeof c.country === 'string' && c.country.trim().length > 0
                ? c.country.trim()
                : (typeof c.code === 'string' ? c.code.trim() : 'Unnamed country'),
          }))
        );
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
      })
      .catch((e) => {
        if (!active) return;
<<<<<<< HEAD
        const message = cause instanceof Error ? cause.message : 'Unable to load countries right now.';
        setCountriesError(message);
        setCountries([]);
      })
      .finally(() => {
        if (active) setCountriesLoading(false);
      });
=======
        setCountriesError(e instanceof Error ? e.message : 'Unable to load countries right now.');
        setCountries([]);
      })
      .finally(() => active && setCountriesLoading(false));
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920

    return () => { active = false; };
  }, []);

<<<<<<< HEAD
  // Prefer DB accounts; fallback to the old nessie context if empty
  const totalBalance = useMemo(() => {
    const fromDb = dbAccounts.reduce((sum, a) => sum + (typeof a.balance === 'number' ? a.balance : 0), 0);
    if (fromDb > 0) return fromDb;
    if (!Array.isArray(nessie?.accounts)) return 0;
    return nessie.accounts.reduce((sum, a) => sum + (typeof a.balance === 'number' ? a.balance : 0), 0);
  }, [dbAccounts, nessie]);

  const headlineCurrency =
    (dbAccounts[0]?.currency_code ?? nessie?.accounts?.[0]?.currencyCode ?? 'USD');
=======
  const countryOptions = useMemo(() => {
    const map = new Map();
    const put = (entry) => {
      if (!entry?.code) return;
      const code = String(entry.code).trim();
      const name = (entry.name ?? entry.country ?? code).trim?.() ?? code;
      if (!map.has(code.toUpperCase())) map.set(code.toUpperCase(), { code, name });
    };
    countries.forEach(put);
    if (profile?.currentCountry) put(profile.currentCountry);
    if (profile?.homeCountry) put(profile.homeCountry);
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [countries, profile?.currentCountry, profile?.homeCountry]);

  const totalBalance = useMemo(() => {
    if (!Array.isArray(accounts)) return 0;
    return accounts.reduce((sum, account) => sum + (typeof account?.balance === 'number' ? account.balance : 0), 0);
  }, [accounts]);
  const headlineCurrency = accounts?.[0]?.currencyCode ?? 'USD';
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920

  const addressPreview = useMemo(
    () => formatAddressPreview({ houseNumber: addressHouseNumber, street: addressStreet, city: addressCity, state: addressState }),
    [addressHouseNumber, addressStreet, addressCity, addressState]
  );

  /* ---------- actions ---------- */

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!userId) return;

    const trimmedName = displayName.trim();
    const budgetStr = monthlyBudget.trim();
    const parsedBudget = budgetStr === '' ? null : Number(budgetStr);
    if (parsedBudget != null && Number.isNaN(parsedBudget)) {
      setProfileStatus({ type: 'error', message: 'Monthly budget must be a valid number.' });
      showToast({ type: 'error', title: 'Check your monthly budget', description: 'Please enter a valid number.', duration: 4200 });
      return;
    }

    const currentCode = currentCountryCode?.trim() ? currentCountryCode.trim().toUpperCase() : null;
    const homeCode = homeCountryCode?.trim() ? homeCountryCode.trim().toUpperCase() : null;
    const street_address = serialiseAddress({
      houseNumber: addressHouseNumber,
      street: addressStreet,
      city: addressCity,
      state: addressState,
    });

    setSavingProfile(true);
    setProfileStatus(null);

    try {
      const updates = {
        user_id: userId,
        name: trimmedName || null,
        monthly_budget: parsedBudget,
        current_country_code: currentCode,
        home_country_code: homeCode,
        street_address, // stringified JSON or null
      };

      const { error } = await supabase.from('user_profile').upsert(updates, { onConflict: 'user_id' });
      if (error) throw error;

      if (trimmedName) {
<<<<<<< HEAD
        const { error: metadataError } = await supabase.auth.updateUser({ data: { displayName: trimmedName } });
        if (metadataError) throw metadataError;
      }

      await refreshProfile();
      setProfileStatus(null);
      setProfileToast({
        title: 'Profile saved',
        description: addressResult.formatted
          ? `Mailing address saved as ${addressResult.formatted.replace(/\n/g, ', ')}.`
          : 'Your profile preferences were saved successfully.',
        duration: 5200,
=======
        const { error: mdErr } = await supabase.auth.updateUser({ data: { ...(user?.user_metadata ?? {}), displayName: trimmedName } });
        if (mdErr) throw mdErr;
      }

      // refresh only the profile hook (NOT Nessie) to keep UI in sync
      try { await refreshProfile(); } catch (err) { console.warn('Profile refresh failed:', err); }

      showToast({
        type: 'success',
        title: 'Settings saved',
        description: street_address
          ? `Mailing address saved. ${addressPreview.replace(/\n/g, ', ')}`
          : 'Your profile preferences are up to date.',
        duration: 4500,
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile settings.';
      setProfileStatus({ type: 'error', message: msg });
      showToast({ type: 'error', title: 'Could not save settings', description: msg, duration: 5000 });
    } finally {
      setSavingProfile(false);
    }
  }

<<<<<<< HEAD
  // ⬇️ UPDATED: call Edge Function then refresh balances from DB
  async function handleRefreshAccounts() {
    if (!userId) return;
=======
  async function handleRefreshAccounts() {
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
    setAccountsStatus(null);
    setSyncing(true);
    try {
<<<<<<< HEAD
      const res = await syncNessie(); // calls /functions/v1/nessie-sync with mapped customer_id
      await refreshDbAccounts();      // re-read balances from v_latest_account
      setAccountsStatus({
        type: 'success',
        message: `Balances refreshed. Imported ${res.insertedTransactions ?? 0} transactions.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh accounts right now.';
      setAccountsStatus({ type: 'error', message });
    } finally {
      setSyncing(false);
=======
      await Promise.all([refreshAccounts(), refreshTransactions()]);
      setAccountsStatus({ type: 'success', message: 'Account balances refreshed.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to refresh accounts right now.';
      setAccountsStatus({ type: 'error', message: msg });
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
    }
  }

  /* ---------- render ---------- */

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:inset-auto sm:right-6 sm:top-6 sm:w-auto"
          >
            <Toast
              type={toast.type ?? 'info'}
              title={toast.title}
              description={toast.description}
              onDismiss={dismissToast}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <header className="mb-10 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red/80">Account</p>
          <h1 className="text-4xl font-bold tracking-tight text-navy">Settings</h1>
          <p className="max-w-2xl text-base text-slate/80">
            Update your personal details, budgeting preferences, and refresh your linked Capital One™ data.
          </p>
        </header>

        <div className="space-y-6">
          {profileStatus?.type === 'error' && (
            <div className="rounded-2xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
              {profileStatus.message}
            </div>
          )}
          {profileError && (
            <div className="rounded-2xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
              {profileError.message || 'We were unable to load your profile information.'}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            {/* Profile section */}
            <SettingsSection
              title="Profile"
              description="Control how your name appears across PPP Pocket and track your monthly travel savings target."
              actions={
                <Button type="submit" form="profile-form" className="px-5 py-2 text-sm" disabled={savingProfile}>
                  {savingProfile ? 'Saving…' : 'Save changes'}
                </Button>
              }
            >
              <form id="profile-form" onSubmit={handleSaveProfile} className="grid gap-6">
                <div className="grid gap-2">
                  <label htmlFor="display-name" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                    Display name
                  </label>
                  <input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How should we greet you?"
                    className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                    disabled={savingProfile}
                  />
                  <p className="text-xs text-slate/60">
                    This name appears on your dashboard and shared parity summaries.
                  </p>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="monthly-budget" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                    Monthly travel budget (USD)
                  </label>
                  <input
                    id="monthly-budget"
                    type="number"
                    min="0"
                    step="50"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                    disabled={savingProfile}
                  />
                </div>

<<<<<<< HEAD
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <SettingsSection
            title="Profile"
            description="Control how your name appears across PPP Pocket and track your monthly travel savings target."
            actions={
              <Button type="submit" form="profile-form" className="px-5 py-2 text-sm" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save changes'}
              </Button>
            }
          >
            <form id="profile-form" onSubmit={handleSaveProfile} className="grid gap-6">
              {/* --- your existing profile fields, unchanged --- */}
              {/* Display Name */}
              <div className="grid gap-2">
                <label htmlFor="display-name" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                  Display name
                </label>
                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we greet you?"
                  className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                  disabled={savingProfile}
                />
                <p className="text-xs text-slate/60">This name appears on your dashboard and shared parity summaries.</p>
              </div>

              {/* Monthly budget */}
              <div className="grid gap-2">
                <label htmlFor="monthly-budget" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                  Monthly travel budget (USD)
                </label>
                <input
                  id="monthly-budget"
                  type="number"
                  min="0"
                  step="50"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                  disabled={savingProfile}
                />
                <p className="text-xs text-slate/60">We use this number to calculate how long you can stay in each destination.</p>
              </div>

              {/* Address fields (unchanged) */}
              <fieldset className="grid gap-3">
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">Mailing address</legend>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
                  <div className="grid gap-1.5">
                    <label htmlFor="address-house-number" className="text-xs font-medium text-slate/70">House number</label>
                    <input id="address-house-number" type="text" inputMode="numeric" autoComplete="address-line1"
                      value={addressHouseNumber} onChange={(e) => setAddressHouseNumber(e.target.value)}
                      placeholder="e.g. 123"
=======
                <fieldset className="grid gap-3">
                  <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                    Mailing address
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
                    <div className="grid gap-1.5">
                      <label htmlFor="address-house-number" className="text-xs font-medium text-slate/70">House number</label>
                      <input
                        id="address-house-number"
                        type="text"
                        inputMode="numeric"
                        autoComplete="address-line1"
                        value={addressHouseNumber}
                        onChange={(e) => setAddressHouseNumber(e.target.value)}
                        placeholder="e.g. 123"
                        className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                        disabled={savingProfile}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor="address-street" className="text-xs font-medium text-slate/70">Street</label>
                      <input
                        id="address-street"
                        type="text"
                        autoComplete="address-line1"
                        value={addressStreet}
                        onChange={(e) => setAddressStreet(e.target.value)}
                        placeholder="Market Street"
                        className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                        disabled={savingProfile}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                    <div className="grid gap-1.5">
                      <label htmlFor="address-city" className="text-xs font-medium text-slate/70">City</label>
                      <input
                        id="address-city"
                        type="text"
                        autoComplete="address-level2"
                        value={addressCity}
                        onChange={(e) => setAddressCity(e.target.value)}
                        placeholder="San Francisco"
                        className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                        disabled={savingProfile}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor="address-state" className="text-xs font-medium text-slate/70">State / region</label>
                      <input
                        id="address-state"
                        type="text"
                        autoComplete="address-level1"
                        value={addressState}
                        onChange={(e) => setAddressState(e.target.value.toUpperCase())}
                        placeholder="CA"
                        maxLength={32}
                        className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                        disabled={savingProfile}
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate/15 bg-white/80 px-4 py-3 shadow-inner shadow-white/40">
                    {addressPreview ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate/60">Preview</p>
                        <p className="whitespace-pre-wrap text-xs font-mono text-slate/70">{addressPreview}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate/60">We'll format your address automatically as you type.</p>
                    )}
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label htmlFor="current-country" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                      Current country
                    </label>
                    <select
                      id="current-country"
                      value={currentCountryCode}
                      onChange={(e) => setCurrentCountryCode(e.target.value)}
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
                      className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                      disabled={savingProfile || countriesLoading}
                    >
                      <option value="">Select a country</option>
                      {countriesLoading && <option value="" disabled>Loading countries…</option>}
                      {countryOptions.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
<<<<<<< HEAD
                  <div className="grid gap-1.5">
                    <label htmlFor="address-street" className="text-xs font-medium text-slate/70">Street</label>
                    <input id="address-street" type="text" autoComplete="address-line1"
                      value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)}
                      placeholder="Market Street"
=======
                  <div className="grid gap-2">
                    <label htmlFor="home-country" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                      Home country
                    </label>
                    <select
                      id="home-country"
                      value={homeCountryCode}
                      onChange={(e) => setHomeCountryCode(e.target.value)}
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
                      className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                      disabled={savingProfile || countriesLoading}
                    >
                      <option value="">Select a country</option>
                      {countriesLoading && <option value="" disabled>Loading countries…</option>}
                      {countryOptions.map((c) => (
                        <option key={`home-${c.code}`} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
<<<<<<< HEAD
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                  <div className="grid gap-1.5">
                    <label htmlFor="address-city" className="text-xs text-slate/70 font-medium">City</label>
                    <input id="address-city" type="text" autoComplete="address-level2"
                      value={addressCity} onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="San Francisco"
                      className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                      disabled={savingProfile}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="address-state" className="text-xs text-slate/70 font-medium">State / region</label>
                    <input id="address-state" type="text" autoComplete="address-level1"
                      value={addressState} onChange={(e) => setAddressState(e.target.value.toUpperCase())}
                      placeholder="CA" maxLength={32}
                      className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                      disabled={savingProfile}
                    />
                  </div>
                </div>
                <div className="rounded-3xl border border-slate/15 bg-white/80 px-4 py-3 shadow-inner shadow-white/40">
                  {addressPreview ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate/60">Preview</p>
                      <p className="whitespace-pre-wrap text-xs font-mono text-slate/70">{addressPreview}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate/60">We'll format your address automatically as you type.</p>
                  )}
                </div>
                <p className="text-xs text-slate/60">This stays private and helps us tailor exchange rates and insights for your home base.</p>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="current-country" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">Current country</label>
                  <select
                    id="current-country"
                    value={currentCountryCode}
                    onChange={(e) => setCurrentCountryCode(e.target.value)}
                    className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                    disabled={savingProfile || countriesLoading}
                  >
                    <option value="">Select a country</option>
                    {countriesLoading ? <option value="" disabled>Loading countries…</option> : null}
                    {countryOptions.map((country) => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate/60">Where you are based today. Update this when you travel to keep PPP insights accurate.</p>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="home-country" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">Home country</label>
                  <select
                    id="home-country"
                    value={homeCountryCode}
                    onChange={(e) => setHomeCountryCode(e.target.value)}
                    className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                    disabled={savingProfile || countriesLoading}
                  >
                    <option value="">Select a country</option>
                    {countriesLoading ? <option value="" disabled>Loading countries…</option> : null}
                    {countryOptions.map((country) => (
                      <option key={`home-${country.code}`} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate/60">Helps us compare your purchasing power with where you grew up or keep ties.</p>
                </div>
              </div>

              {countriesError ? (
                <div className="rounded-2xl border border-red/40 bg-red/5 px-4 py-3 text-xs text-red">{countriesError}</div>
              ) : null}
            </form>
          </SettingsSection>

          <SettingsSection
            title="Capital One sync"
            description="See the latest balances pulled from your demo Capital One account and refresh whenever you need."
            actions={
              <Button
                type="button"
                variant="secondary"
                className="px-4 py-2 text-sm"
                onClick={handleRefreshAccounts}
                disabled={syncing || !userId}
              >
                {syncing ? 'Refreshing…' : 'Refresh balances'}
              </Button>
            }
            footer="Balances are simulated for the hackathon environment and reset frequently."
            contentClassName="space-y-4"
          >
            <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white/80 to-white/30 px-4 py-3 shadow-inner">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">Total balance</p>
              <p className="mt-2 text-2xl font-semibold text-navy">
                {formatCurrency(totalBalance, headlineCurrency)}
              </p>
            </div>

            <div className="space-y-3">
              {dbAccounts.length > 0 ? (
                dbAccounts.map((a) => (
                  <div key={a.nessie_account_id} className="flex items-center justify-between rounded-2xl border border-slate/15 bg-white/70 px-4 py-3 shadow-sm shadow-white/60">
                    <div>
                      <p className="text-sm font-semibold text-navy">{a.account_type ?? 'Account'}</p>
                      <p className="text-xs text-slate/60">•••• {a.account_number_masked ?? '0000'}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate/80">
                      {formatCurrency(a.balance ?? 0, a.currency_code ?? 'USD')}
                    </p>
                  </div>
                ))
              ) : Array.isArray(nessie?.accounts) && nessie.accounts.length > 0 ? (
                nessie.accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between rounded-2xl border border-slate/15 bg-white/70 px-4 py-3 shadow-sm shadow-white/60">
                    <div>
                      <p className="text-sm font-semibold text-navy">{account.name ?? 'Account'}</p>
                      <p className="text-xs text-slate/60">•••• {account.mask ?? '0000'}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate/80">
                      {formatCurrency(account.balance ?? 0, account.currencyCode ?? 'USD')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate/60">Connect an account to see balances here.</p>
=======

                {countriesError && (
                  <div className="rounded-2xl border border-red/40 bg-red/5 px-4 py-3 text-xs text-red">
                    {countriesError}
                  </div>
                )}
              </form>
            </SettingsSection>

            {/* Capital One / Nessie */}
            <SettingsSection
              title="Capital One™ sync"
              description="See the latest balances pulled from your demo Capital One™ account and refresh whenever you need."
              actions={
                <Button
                  type="button"
                  variant="secondary"
                  className="px-4 py-2 text-sm"
                  onClick={handleRefreshAccounts}
                  disabled={isSyncingNessie}
                >
                  {isSyncingNessie ? 'Refreshing…' : 'Refresh balances'}
                </Button>
              }
              footer="Balances are simulated for the hackathon environment and reset frequently."
              contentClassName="space-y-4"
            >
              <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white/80 to-white/30 px-4 py-3 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">Total balance</p>
                <p className="mt-2 text-2xl font-semibold text-navy">
                  {formatCurrency(totalBalance, headlineCurrency)}
                </p>
              </div>

              <div className="space-y-3">
                {Array.isArray(accounts) && accounts.length > 0 ? (
                  accounts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-2xl border border-slate/15 bg-white/70 px-4 py-3 shadow-sm shadow-white/60"
                    >
                      <div>
                        <p className="text-sm font-semibold text-navy">{a.name ?? 'Account'}</p>
                        <p className="text-xs text-slate/60">•••• {a.mask ?? '0000'}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate/80">
                        {formatCurrency(a.balance ?? 0, a.currencyCode ?? 'USD')}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate/60">Connect an account to see balances here.</p>
                )}
              </div>

              {accountsStatus && (
                <div
                  className={
                    accountsStatus.type === 'error'
                      ? 'rounded-2xl border border-red/40 bg-red/5 px-3 py-2 text-xs text-red'
                      : 'rounded-2xl border border-emerald-400/40 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-700'
                  }
                >
                  {accountsStatus.message}
                </div>
>>>>>>> 61674582e37e209cb58bd49a9158279eda879920
              )}
            </SettingsSection>
          </div>
        </div>
      </main>
    </>
  );
}
