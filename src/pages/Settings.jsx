// src/pages/Settings.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../components/ui/Button.jsx';
import { SettingsSection } from '../components/settings/SettingsSection.jsx';
import { Toast } from '../components/ui/Toast.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { useAuth } from '../hooks/useAuth.js';
import { useTransactions } from '../hooks/useTransactions.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import usePersonalization from '../hooks/usePersonalization.js';
import {
  CATEGORY_TAGS,
  CONTINENT_OPTIONS,
  TRAVEL_INTERESTS,
} from '../constants/personalization.js';
import { supabase } from '../lib/supabase.js';

/* ---------- small helpers ---------- */

function formatCurrency(amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `$${Number(amount ?? 0).toFixed(2)}`;
  }
}

const EMPTY_ADDRESS = { houseNumber: '', street: '', city: '', state: '' };

function normalizeAddress(parts = EMPTY_ADDRESS) {
  return {
    houseNumber: typeof parts.houseNumber === 'string' ? parts.houseNumber.trim() : '',
    street: typeof parts.street === 'string' ? parts.street.trim() : '',
    city: typeof parts.city === 'string' ? parts.city.trim() : '',
    state: typeof parts.state === 'string' ? parts.state.trim().toUpperCase() : '',
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
  const hasAny = Object.values(normalised).some(v => v.length > 0);
  return hasAny ? JSON.stringify({ ...normalised, formatted }) : null;
}

/* ---------- page ---------- */

export default function Settings() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const {
    profile,
    loading: profileLoading,
    error: profileError,
    refresh: refreshProfile,
  } = useUserProfile(userId);

  const {
    data: personalization,
    loading: personalizationLoading,
    error: personalizationError,
    save: savePersonalization,
  } = usePersonalization(userId);

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
  const [displayName, setDisplayName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [monthlyBudgetGoal, setMonthlyBudgetGoal] = useState('');
  const [addressHouseNumber, setAddressHouseNumber] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [currentCountryCode, setCurrentCountryCode] = useState('');
  const [homeCountryCode, setHomeCountryCode] = useState('');
  const [travelInterests, setTravelInterests] = useState([]);
  const [preferredContinents, setPreferredContinents] = useState([]);
  const [favoriteCategories, setFavoriteCategories] = useState([]);

  // ui state
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null);
  const [accountsStatus, setAccountsStatus] = useState(null);
  const [personalizationStatus, setPersonalizationStatus] = useState(null);
  const [savingPersonalization, setSavingPersonalization] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState(null);

  // toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback((t) => setToast({ id: Date.now(), ...t }), []);
  const dismissToast = useCallback(() => setToast(null), []);
  useEffect(() => {
    if (!toast?.duration) return;
    const id = setTimeout(() => setToast(null), toast.duration);
    return () => clearTimeout(id);
  }, [toast]);

  const isSyncingNessie = accountsRefreshing || transactionsRefreshing;

  useEffect(() => {
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
    return '';
  }, [user]);

  // load profile -> seed form
  useEffect(() => {
    if (profileLoading) return;
    setDisplayName(profile?.name ?? identityFallback);
    setMonthlyBudget(
      profile?.monthlyBudget != null && !Number.isNaN(profile.monthlyBudget) ? String(profile.monthlyBudget) : ''
    );
    setMonthlyBudgetGoal(
      profile?.monthlyBudgetGoal != null && !Number.isNaN(profile.monthlyBudgetGoal)
        ? String(profile.monthlyBudgetGoal)
        : ''
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
    setTravelInterests(profile?.travelInterests ?? []);
    setPreferredContinents(profile?.preferredContinents ?? []);
    setFavoriteCategories(profile?.favoriteCategories ?? []);
  }, [profile, profileLoading, identityFallback]);

  useEffect(() => {
    if (personalizationLoading) return;
    if (!personalization) return;

    if (personalization.monthlyBudgetGoal != null) {
      setMonthlyBudgetGoal(String(personalization.monthlyBudgetGoal));
    }
    if (personalization.travelInterests) {
      setTravelInterests(personalization.travelInterests);
    }
    if (personalization.preferredContinents) {
      setPreferredContinents(personalization.preferredContinents);
    }
    if (personalization.favoriteCategories) {
      setFavoriteCategories(personalization.favoriteCategories);
    }
  }, [personalization, personalizationLoading]);

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
        setCountries(
          (data ?? []).map((c) => ({
            code: typeof c.code === 'string' ? c.code.trim() : '',
            name:
              typeof c.country === 'string' && c.country.trim().length > 0
                ? c.country.trim()
                : (typeof c.code === 'string' ? c.code.trim() : 'Unnamed country'),
          }))
        );
      })
      .catch((e) => {
        if (!active) return;
        setCountriesError(e instanceof Error ? e.message : 'Unable to load countries right now.');
        setCountries([]);
      })
      .finally(() => active && setCountriesLoading(false));

    return () => { active = false; };
  }, []);

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

  const addressPreview = useMemo(
    () =>
      formatAddressPreview({
        houseNumber: addressHouseNumber,
        street: addressStreet,
        city: addressCity,
        state: addressState,
      }),
    [addressHouseNumber, addressStreet, addressCity, addressState]
  );

  const toggleChip = useCallback(
    (setter) => (value) => {
      setter((prev) => {
        if (prev.includes(value)) {
          return prev.filter((entry) => entry !== value);
        }
        return [...prev, value];
      });
    },
    []
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
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile settings.';
      setProfileStatus({ type: 'error', message: msg });
      showToast({ type: 'error', title: 'Could not save settings', description: msg, duration: 5000 });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePersonalization(event) {
    event.preventDefault();
    if (!userId) return;

    const goalStr = monthlyBudgetGoal.trim();
    const parsedGoal = goalStr === '' ? null : Number(goalStr);
    if (parsedGoal != null && Number.isNaN(parsedGoal)) {
      setPersonalizationStatus({
        type: 'error',
        message: 'Monthly savings goal must be a number.',
      });
      showToast({
        type: 'error',
        title: 'Check your savings goal',
        description: 'Please enter a valid number for your monthly savings target.',
        duration: 4200,
      });
      return;
    }

    const parsedBudget = (() => {
      const trimmed = monthlyBudget.trim();
      if (trimmed === '') return null;
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? numeric : null;
    })();

    setSavingPersonalization(true);
    setPersonalizationStatus(null);

    try {
      await savePersonalization({
        monthlyBudget: parsedBudget,
        monthlyBudgetGoal: parsedGoal,
        travelInterests,
        preferredContinents,
        favoriteCategories,
      });

      setPersonalizationStatus({
        type: 'success',
        message: 'Your travel interests and targets are saved.',
      });
      showToast({
        type: 'success',
        title: 'Personalization saved',
        description: 'We’ll tailor recommendations using your updated interests.',
        duration: 3600,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update personalization right now.';
      setPersonalizationStatus({ type: 'error', message: msg });
      showToast({ type: 'error', title: 'Update failed', description: msg, duration: 4800 });
    } finally {
      setSavingPersonalization(false);
    }
  }

  async function handleRefreshAccounts() {
    setAccountsStatus(null);
    try {
      await Promise.all([refreshAccounts(), refreshTransactions()]);
      setAccountsStatus({ type: 'success', message: 'Account balances refreshed.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to refresh accounts right now.';
      setAccountsStatus({ type: 'error', message: msg });
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
          {personalizationStatus?.type === 'error' && (
            <div className="rounded-2xl border border-coral/40 bg-coral/5 px-4 py-3 text-sm text-coral">
              {personalizationStatus.message}
            </div>
          )}
          {personalizationError && (
            <div className="rounded-2xl border border-coral/40 bg-coral/5 px-4 py-3 text-sm text-coral">
              {personalizationError.message || 'We were unable to load your personalization preferences.'}
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
                  <div className="grid gap-2">
                    <label htmlFor="home-country" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                      Home country
                    </label>
                    <select
                      id="home-country"
                      value={homeCountryCode}
                      onChange={(e) => setHomeCountryCode(e.target.value)}
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
            )}
          </SettingsSection>
        </div>

        <SettingsSection
          title="Travel personalization"
          description="Fine-tune the interests that power GeoBudget, nudges, and destination picks."
          actions={
            <Button
              type="submit"
              form="personalization-form"
              className="px-5 py-2 text-sm"
              disabled={savingPersonalization || personalizationLoading}
            >
              {savingPersonalization ? 'Saving…' : 'Save personalization'}
            </Button>
          }
        >
          <form id="personalization-form" onSubmit={handleSavePersonalization} className="grid gap-6">
            <div className="grid gap-2">
              <label
                htmlFor="monthly-budget-goal"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60"
              >
                Monthly savings goal (USD)
              </label>
              <input
                id="monthly-budget-goal"
                type="number"
                min="0"
                step="50"
                value={monthlyBudgetGoal}
                onChange={(event) => setMonthlyBudgetGoal(event.target.value)}
                placeholder="e.g. 1800"
                className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                disabled={savingPersonalization}
              />
              <p className="text-xs text-slate/60">
                We surface alerts when your balance drifts below this target.
              </p>
            </div>

            <fieldset className="grid gap-2">
              <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                Travel interests
              </legend>
              <p className="text-xs text-slate/60">Tap to toggle the vibes you care about most.</p>
              <div className="flex flex-wrap gap-2">
                {TRAVEL_INTERESTS.map((interest) => {
                  const isActive = travelInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleChip(setTravelInterests)(interest)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        isActive
                          ? 'bg-teal text-white shadow-md shadow-teal/20'
                          : 'border border-slate/20 bg-white/80 text-slate hover:border-teal/40 hover:text-teal'
                      }`}
                      disabled={savingPersonalization}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                Preferred continents
              </legend>
              <div className="flex flex-wrap gap-2">
                {CONTINENT_OPTIONS.map((continent) => {
                  const isActive = preferredContinents.includes(continent);
                  return (
                    <button
                      key={continent}
                      type="button"
                      onClick={() => toggleChip(setPreferredContinents)(continent)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        isActive
                          ? 'bg-coral text-white shadow-md shadow-coral/20'
                          : 'border border-slate/20 bg-white/80 text-slate hover:border-coral/40 hover:text-coral'
                      }`}
                      disabled={savingPersonalization}
                    >
                      {continent}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                Favourite categories
              </legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_TAGS.map((category) => {
                  const isActive = favoriteCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleChip(setFavoriteCategories)(category)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        isActive
                          ? 'bg-navy text-white shadow-md shadow-navy/20'
                          : 'border border-slate/20 bg-white/80 text-slate hover:border-navy/40 hover:text-navy'
                      }`}
                      disabled={savingPersonalization}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {personalizationStatus?.type === 'success' && (
              <p className="text-xs text-teal">{personalizationStatus.message}</p>
            )}
          </form>
        </SettingsSection>

      </div>
    </main>
    </>
  );
}
