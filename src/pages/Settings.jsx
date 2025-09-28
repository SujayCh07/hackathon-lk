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
import { supabase } from '../lib/supabase.js';

/* ---------- helpers ---------- */

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
    accounts,
    balanceUSD,
    isRefreshing: accountsRefreshing,
    error: accountsError,
    refresh: refreshAccounts,
  } = useAccount();

  const monthlyBudgetNumber =
    typeof profile?.monthlyBudget === 'number' ? profile.monthlyBudget : null;
  const { isRefreshing: transactionsRefreshing, refresh: refreshTransactions } =
    useTransactions({ limit: 5, monthlyBudget: monthlyBudgetNumber, balanceUSD });

  // form state
  const [displayName, setDisplayName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [addressHouseNumber, setAddressHouseNumber] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [currentCountryCode, setCurrentCountryCode] = useState('');

  // ui + toast state
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileActionState, setProfileActionState] = useState('idle');
  const [profileStatus, setProfileStatus] = useState(null);
  const [accountsStatus, setAccountsStatus] = useState(null);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState(null);
  const [toast, setToast] = useState(null);

  const disableProfileInputs = savingProfile;

  const identityFallback = useMemo(() => {
    if (!user) return '';
    const md = user.user_metadata ?? {};
    if (md.displayName && md.displayName.trim()) return md.displayName.trim();
    if (user.email) return (user.email.split('@')[0] ?? '').trim();
    return '';
  }, [user]);

  const applyFormSeed = useCallback((seed) => {
    if (!seed) return;

    setDisplayName((prev) => (prev === (seed.displayName ?? '') ? prev : seed.displayName ?? ''));
    setMonthlyBudget((prev) => (prev === (seed.monthlyBudget ?? '') ? prev : seed.monthlyBudget ?? ''));
    setAddressHouseNumber((prev) =>
      prev === (seed.addressHouseNumber ?? '') ? prev : seed.addressHouseNumber ?? ''
    );
    setAddressStreet((prev) => (prev === (seed.addressStreet ?? '') ? prev : seed.addressStreet ?? ''));
    setAddressCity((prev) => (prev === (seed.addressCity ?? '') ? prev : seed.addressCity ?? ''));
    setAddressState((prev) => (prev === (seed.addressState ?? '') ? prev : seed.addressState ?? ''));
    setCurrentCountryCode((prev) =>
      prev === (seed.currentCountryCode ?? '') ? prev : seed.currentCountryCode ?? ''
    );
  }, []);

  const buildFormSeed = useCallback(
    (sourceProfile) => {
      const resolvedName =
        typeof sourceProfile?.name === 'string' && sourceProfile.name.trim().length > 0
          ? sourceProfile.name.trim()
          : identityFallback ?? '';

      const monthlyBudgetValue =
        sourceProfile?.monthlyBudget != null && !Number.isNaN(sourceProfile.monthlyBudget)
          ? String(sourceProfile.monthlyBudget)
          : '';

      const normalisedAddress =
        sourceProfile?.streetAddress && typeof sourceProfile.streetAddress === 'object'
          ? normalizeAddress(sourceProfile.streetAddress)
          : normalizeAddress();

      const selectedCode = sourceProfile?.currentCountry?.code ?? '';
      const normalisedCode =
        typeof selectedCode === 'string' ? selectedCode.trim().toUpperCase() : '';

      return {
        displayName: resolvedName,
        monthlyBudget: monthlyBudgetValue,
        addressHouseNumber: normalisedAddress.houseNumber ?? '',
        addressStreet: normalisedAddress.street ?? '',
        addressCity: normalisedAddress.city ?? '',
        addressState: normalisedAddress.state ?? '',
        currentCountryCode: normalisedCode,
      };
    },
    [identityFallback]
  );

  const profileSeed = useMemo(() => {
    if (profileLoading) return null;
    return buildFormSeed(profile ?? null);
  }, [buildFormSeed, profile, profileLoading]);

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
        message: 'Unable to reach Nessie right now. Showing cached balances.',
      });
    }
  }, [accountsError]);

  // load profile -> seed form
  useEffect(() => {
    if (!profileSeed) return;
    applyFormSeed(profileSeed);
  }, [applyFormSeed, profileSeed]);

  useEffect(() => {
    if (profileActionState !== 'success') return undefined;
    const timer = setTimeout(() => setProfileActionState('idle'), 3200);
    return () => clearTimeout(timer);
  }, [profileActionState]);

  // countries list
  useEffect(() => {
    let active = true;
    setCountriesLoading(false);
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
        setCountriesError(
          e instanceof Error ? e.message : 'Unable to load countries right now.'
        );
        setCountries([]);
      })
      .finally(() => active && setCountriesLoading(true));

    return () => {
      active = false;
    };
  }, []);

  const countryOptions = useMemo(() => {
    const map = new Map();
    const put = (entry) => {
      if (!entry?.code) return;
      const code = String(entry.code).trim();
      const normalizedCode = code.toUpperCase();
      const name = (entry.name ?? entry.country ?? code).trim?.() ?? code;
      if (!map.has(normalizedCode)) map.set(normalizedCode, { code: normalizedCode, name });
    };
    countries.forEach(put);
    if (profile?.currentCountry) put(profile.currentCountry);
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [countries, profile?.currentCountry]);

  const totalBalance = useMemo(() => {
    if (!Array.isArray(accounts)) return 0;
    return accounts.reduce(
      (sum, account) =>
        sum + (typeof account?.balance === 'number' ? account.balance : 0),
      0
    );
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

  /* ---------- actions ---------- */

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!userId) return;

    const trimmedName = displayName.trim();
    const budgetStr = monthlyBudget.trim();
    const parsedBudget = budgetStr === '' ? null : Number(budgetStr);
    if (parsedBudget != null && Number.isNaN(parsedBudget)) {
      setProfileStatus({
        type: 'error',
        message: 'Monthly budget must be a valid number.',
      });
      showToast({
        type: 'error',
        title: 'Check your monthly budget',
        description: 'Please enter a valid number.',
        duration: 4200,
      });
      return;
    }

    const currentCode = currentCountryCode?.trim()
      ? currentCountryCode.trim().toUpperCase()
      : null;
    const normalisedAddress = normalizeAddress({
      houseNumber: addressHouseNumber,
      street: addressStreet,
      city: addressCity,
      state: addressState,
    });
    const street_address = serialiseAddress(normalisedAddress);

    const optimisticSeed = {
      displayName: trimmedName,
      monthlyBudget: budgetStr,
      addressHouseNumber: normalisedAddress.houseNumber,
      addressStreet: normalisedAddress.street,
      addressCity: normalisedAddress.city,
      addressState: normalisedAddress.state,
      currentCountryCode: currentCode ?? '',
    };
    applyFormSeed(optimisticSeed);

    setProfileStatus(null);
    setSavingProfile(true);
    setProfileActionState('saving');

    try {
      const updates = {
        user_id: userId,
        name: trimmedName || null,
        monthly_budget: parsedBudget,
        current_country_code: currentCode,
        street_address,
      };

      const { error } = await supabase
        .from('user_profile')
        .upsert(updates, { onConflict: 'user_id' });
      if (error) throw error;

      if (trimmedName) {
        const { error: mdErr } = await supabase.auth.updateUser({
          data: { ...(user?.user_metadata ?? {}), displayName: trimmedName },
        });
        if (mdErr) throw mdErr;
      }

      const refreshedProfile = await refreshProfile();
      if (refreshedProfile) {
        applyFormSeed(buildFormSeed(refreshedProfile));
      }

      showToast({
        type: 'success',
        title: 'Settings saved',
        description: street_address
          ? `Mailing address saved. ${addressPreview.replace(/\n/g, ', ')}`
          : 'Your profile preferences are up to date.',
        duration: 4500,
      });
      setProfileStatus(null);
      setProfileActionState('success');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update profile settings.';
      setProfileStatus({ type: 'error', message: msg });
      showToast({
        type: 'error',
        title: 'Could not save settings',
        description: msg,
        duration: 5000,
      });
      setProfileActionState('idle');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleRefreshAccounts() {
    setAccountsStatus(null);
    try {
      await Promise.all([refreshAccounts(), refreshTransactions()]);
      setAccountsStatus({ type: 'success', message: 'Account balances refreshed.' });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to refresh accounts right now.';
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
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red/80">
            Account
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-navy">Settings</h1>
          <p className="max-w-2xl text-base text-slate/80">
            Update your personal details, budgeting preferences, and refresh your
            linked Capital One™ data.
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
              {profileError.message ||
                'We were unable to load your profile information.'}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            {/* Profile section */}
            <SettingsSection
              title="Profile"
              description="Control how your name appears across PPP Pocket and track your monthly travel savings target."
              actions={
                profileActionState === 'success' ? (
                  <div
                    className="flex items-center gap-2 rounded-2xl border border-emerald-400/70 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-inner shadow-emerald-200"
                    role="status"
                    aria-live="polite"
                  >
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 text-emerald-500">
                      <path
                        d="M16.704 5.29a1 1 0 0 1 0 1.414l-7.424 7.425a1 1 0 0 1-1.414 0L3.296 9.56a1 1 0 0 1 1.414-1.414l3.156 3.156 6.717-6.717a1 1 0 0 1 1.414 0z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>Saved ✅</span>
                  </div>
                ) : (
                  <Button
                    type="submit"
                    form="profile-form"
                    className="px-5 py-2 text-sm"
                    disabled={disableProfileInputs}
                  >
                    {profileActionState === 'saving' ? 'Saving…' : 'Save changes'}
                  </Button>
                )
              }
            >
              <form id="profile-form" onSubmit={handleSaveProfile} className="grid gap-6">
                <div className="grid gap-2">
                  <label
                    htmlFor="display-name"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60"
                  >
                    Display name
                  </label>
                  <input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How should we greet you?"
                    className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner focus:border-red focus:ring-2 focus:ring-red/20 disabled:cursor-not-allowed disabled:bg-slate/10"
                    disabled={disableProfileInputs}
                  />
                </div>

                <div className="grid gap-2">
                  <label
                    htmlFor="monthly-budget"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60"
                  >
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
                    className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner focus:border-red focus:ring-2 focus:ring-red/20 disabled:cursor-not-allowed disabled:bg-slate/10"
                    disabled={disableProfileInputs}
                  />
                </div>

                <fieldset className="grid gap-3">
                  <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                    Mailing address
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-[0.75fr_1.25fr]">
                    <div className="grid gap-1.5">
                      <label htmlFor="address-house-number" className="text-xs font-medium text-slate/70">
                        House number
                      </label>
                      <input
                        id="address-house-number"
                        type="text"
                        inputMode="numeric"
                        value={addressHouseNumber}
                        onChange={(e) => setAddressHouseNumber(e.target.value)}
                        placeholder="123"
                        className="w-full rounded-2xl border border-slate/20 bg-white/80 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate/10"
                        disabled={disableProfileInputs}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor="address-street" className="text-xs font-medium text-slate/70">
                        Street
                      </label>
                      <input
                        id="address-street"
                        type="text"
                        value={addressStreet}
                        onChange={(e) => setAddressStreet(e.target.value)}
                        placeholder="Market Street"
                        className="w-full rounded-2xl border border-slate/20 bg-white/80 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate/10"
                        disabled={disableProfileInputs}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="grid gap-1.5">
                      <label htmlFor="address-city" className="text-xs font-medium text-slate/70">
                        City
                      </label>
                      <input
                        id="address-city"
                        type="text"
                        value={addressCity}
                        onChange={(e) => setAddressCity(e.target.value)}
                        placeholder="San Francisco"
                        className="w-full rounded-2xl border border-slate/20 bg-white/80 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate/10"
                        disabled={disableProfileInputs}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor="address-state" className="text-xs font-medium text-slate/70">
                        State / region
                      </label>
                      <input
                        id="address-state"
                        type="text"
                        value={addressState}
                        onChange={(e) => setAddressState(e.target.value.toUpperCase())}
                        placeholder="CA"
                        className="w-full rounded-2xl border border-slate/20 bg-white/80 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate/10"
                        disabled={disableProfileInputs}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor="current-country" className="text-xs font-medium text-slate/70">
                        Country
                      </label>
                      <div className="relative">
                        <select
                          id="current-country"
                          value={currentCountryCode}
                          onChange={(e) =>
                            setCurrentCountryCode(e.target.value.trim().toUpperCase())
                          }
                          className="w-full appearance-none rounded-2xl border border-slate/20 bg-white/90 px-3 py-2 pr-10 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20 disabled:cursor-not-allowed disabled:bg-slate/10"
                          disabled={disableProfileInputs || countriesLoading}
                          aria-busy={countriesLoading}
                        >
                          <option value="">Select a country</option>
                          {countriesLoading && <option disabled>Loading…</option>}
                          {countryOptions.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate/40">
                          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
                            <path
                              d="M5.5 7.5 10 12l4.5-4.5"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                            />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate/15 bg-white/80 px-4 py-3">
                    {addressPreview ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate/60">
                          Preview
                        </p>
                        <p className="whitespace-pre-wrap text-xs font-mono text-slate/70">
                          {addressPreview}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate/60">
                        We'll format your address automatically as you type.
                      </p>
                    )}
                  </div>
                </fieldset>

                {countriesError && (
                  <div className="rounded-2xl border border-red/40 bg-red/5 px-4 py-3 text-xs text-red">
                    {countriesError}
                  </div>
                )}
              </form>
            </SettingsSection>

            {/* Capital One section */}
            <SettingsSection
              title="Capital One™ Account Balance:"
              description="See the latest balances pulled from your demo Capital One™ account and refresh whenever you need."
              footer="Balances are simulated for the hackathon environment and reset frequently."
              contentClassName="space-y-4"
            >
              <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white/80 to-white/30 px-4 py-3 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                  Total balance
                </p>
                <p className="mt-2 text-2xl font-semibold text-navy">
                  {formatCurrency(totalBalance, headlineCurrency)}
                </p>
              </div>

              <div className="space-y-3">
                {Array.isArray(accounts) && accounts.length > 0 ? (
                  accounts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-2xl border border-slate/15 bg-white/70 px-4 py-3 shadow-sm"
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
                  <p className="text-sm text-slate/60">
                    Connect an account to see balances here.
                  </p>
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
        </div>
      </main>
    </>
  );
}
