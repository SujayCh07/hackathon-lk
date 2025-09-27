import { useEffect, useMemo, useState } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '../components/ui/Button.jsx';
import { SettingsSection } from '../components/settings/SettingsSection.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import { supabase } from '../lib/supabase.js';

function formatCurrency(amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    return `$${Number(amount ?? 0).toFixed(2)}`;
  }
}

const EMPTY_ADDRESS_FORM = {
  houseNumber: '',
  street: '',
  city: '',
  state: '',
};

function normaliseAddressInput(parts = EMPTY_ADDRESS_FORM) {
  return {
    houseNumber:
      typeof parts.houseNumber === 'string' ? parts.houseNumber.trim() : EMPTY_ADDRESS_FORM.houseNumber,
    street: typeof parts.street === 'string' ? parts.street.trim() : EMPTY_ADDRESS_FORM.street,
    city: typeof parts.city === 'string' ? parts.city.trim() : EMPTY_ADDRESS_FORM.city,
    state:
      typeof parts.state === 'string'
        ? parts.state.trim().toUpperCase()
        : EMPTY_ADDRESS_FORM.state,
  };
}

function formatAddressPreview(parts) {
  const { houseNumber, street, city, state } = normaliseAddressInput(parts);
  const lineOne = [houseNumber, street].filter(Boolean).join(' ').trim();
  const lineTwo = [city, state].filter(Boolean).join(', ').replace(/^,\s*/, '').trim();
  return [lineOne, lineTwo].filter(Boolean).join('\n');
}

function serialiseAddress(parts) {
  const normalised = normaliseAddressInput(parts);
  const formatted = formatAddressPreview(normalised);
  const hasValue = Object.values(normalised).some((value) => value.length > 0);

  if (!hasValue) {
    return {
      normalised,
      formatted: '',
      serialised: null,
    };
  }

  return {
    normalised,
    formatted,
    serialised: JSON.stringify({ ...normalised, formatted }),
  };
}

export default function Settings() {
  const { user, nessie, isSyncingNessie, refreshNessie } = useAuth();
  const userId = user?.id ?? null;
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    refresh: refreshProfile
  } = useUserProfile(userId);

  const [displayName, setDisplayName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [addressHouseNumber, setAddressHouseNumber] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [currentCountryCode, setCurrentCountryCode] = useState('');
  const [homeCountryCode, setHomeCountryCode] = useState('');
  const [profileStatus, setProfileStatus] = useState(null);
  const [accountsStatus, setAccountsStatus] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState(null);
  const [profileToast, setProfileToast] = useState(null);

  const countryOptions = useMemo(() => {
    const map = new Map();
    const push = (entry) => {
      if (!entry) return;
      const code = typeof entry.code === 'string' ? entry.code.trim() : '';
      const name = typeof entry.name === 'string' ? entry.name.trim() : null;
      if (!code) {
        return;
      }
      const key = code.toUpperCase();
      if (!map.has(key)) {
        map.set(key, {
          code,
          name: name && name.length > 0 ? name : code
        });
      }
    };

    countries.forEach(push);
    push(profile?.currentCountry);
    push(profile?.homeCountry);

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [countries, profile?.currentCountry, profile?.homeCountry]);

  useEffect(() => {
    if (!profileToast) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setProfileToast(null);
    }, profileToast.duration ?? 4800);

    return () => {
      clearTimeout(timeout);
    };
  }, [profileToast]);

  const identityFallback = useMemo(() => {
    if (!user) {
      return '';
    }

    const metadataName = user.user_metadata?.displayName;
    if (metadataName && metadataName.trim()) {
      return metadataName.trim();
    }

    if (user.email) {
      const [local] = user.email.split('@');
      return local ?? '';
    }

    return '';
  }, [user]);

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    setDisplayName(profile?.name ?? identityFallback);
    setMonthlyBudget(
      profile?.monthlyBudget != null && !Number.isNaN(profile.monthlyBudget)
        ? String(profile.monthlyBudget)
        : ''
    );
    const address = profile?.streetAddress ?? null;
    setAddressHouseNumber(address?.houseNumber ?? '');
    setAddressStreet(address?.street ?? '');
    setAddressCity(address?.city ?? '');
    setAddressState(address?.state ? address.state.toUpperCase() : '');
    setCurrentCountryCode(profile?.currentCountry?.code ?? '');
    setHomeCountryCode(profile?.homeCountry?.code ?? '');
  }, [profile, profileLoading, identityFallback]);

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
        if (error) {
          throw error;
        }

        const normalised = (data ?? []).map((country) => ({
          code: typeof country.code === 'string' ? country.code.trim() : '',
          name:
            typeof country.country === 'string' && country.country.trim().length > 0
              ? country.country.trim()
              : typeof country.code === 'string'
              ? country.code.trim()
              : 'Unnamed country'
        }));
        setCountries(normalised);
      })
      .catch((cause) => {
        if (!active) return;
        const message =
          cause instanceof Error ? cause.message : 'Unable to load countries right now.';
        setCountriesError(message);
        setCountries([]);
      })
      .finally(() => {
        if (active) {
          setCountriesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);
  const totalBalance = useMemo(() => {
    if (!Array.isArray(nessie?.accounts)) {
      return 0;
    }

    return nessie.accounts.reduce((sum, account) => {
      return sum + (typeof account.balance === 'number' ? account.balance : 0);
    }, 0);
  }, [nessie]);

  const headlineCurrency = nessie?.accounts?.[0]?.currencyCode ?? 'USD';

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

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (!userId) return;

    const trimmedName = displayName.trim();
    const normalisedBudget = monthlyBudget.trim();
    const normalisedCurrentCountry =
      typeof currentCountryCode === 'string' && currentCountryCode.trim().length > 0
        ? currentCountryCode.trim().toUpperCase()
        : null;
    const normalisedHomeCountry =
      typeof homeCountryCode === 'string' && homeCountryCode.trim().length > 0
        ? homeCountryCode.trim().toUpperCase()
        : null;
    const parsedBudget = normalisedBudget === '' ? null : Number(normalisedBudget);
    const addressResult = serialiseAddress({
      houseNumber: addressHouseNumber,
      street: addressStreet,
      city: addressCity,
      state: addressState,
    });

    if (parsedBudget != null && Number.isNaN(parsedBudget)) {
      setProfileStatus({ type: 'error', message: 'Monthly budget must be a valid number.' });
      return;
    }

    setSavingProfile(true);
    setProfileStatus(null);

    try {
      const updates = {
        user_id: userId,
        name: trimmedName || null,
        monthly_budget: parsedBudget,
        current_country_code: normalisedCurrentCountry,
        home_country_code: normalisedHomeCountry,
        street_address: addressResult.serialised,
      };

      const { error } = await supabase.from('user_profile').upsert(updates, { onConflict: 'user_id' });

      if (error) throw error;

      if (trimmedName) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { displayName: trimmedName },
        });
        if (metadataError) throw metadataError;
      }

      await refreshProfile();
      setProfileStatus(null);
      setProfileToast({
        title: 'Profile saved',
        description:
          addressResult.formatted
            ? `Mailing address saved as ${addressResult.formatted.replace(/\n/g, ', ')}.`
            : 'Your profile preferences were saved successfully.',
        duration: 5200,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile settings.';
      setProfileStatus({ type: 'error', message });
    } finally {
      setSavingProfile(false);
    }
  }


  async function handleRefreshAccounts() {
    if (typeof refreshNessie !== 'function') {
      return;
    }

    setAccountsStatus(null);
    try {
      await refreshNessie();
      setAccountsStatus({ type: 'success', message: 'Account balances refreshed.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh accounts right now.';
      setAccountsStatus({ type: 'error', message });
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      {profileToast ? (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-40 flex justify-center px-4 sm:top-8 sm:justify-end sm:px-6">
          <div className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-3xl border border-emerald-200/80 bg-white/95 px-5 py-4 text-left shadow-xl shadow-emerald-200/60 ring-1 ring-emerald-300/60 backdrop-blur">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-navy">{profileToast.title}</p>
              <p className="text-xs leading-5 text-slate/70">{profileToast.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setProfileToast(null)}
              className="mt-1 rounded-full p-1 text-slate/60 transition hover:bg-slate/10 hover:text-slate/80 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:ring-offset-2 focus:ring-offset-white"
              aria-label="Dismiss notification"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      <header className="mb-10 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red/80">Account</p>
        <h1 className="text-4xl font-bold tracking-tight text-navy">Settings</h1>
        <p className="max-w-2xl text-base text-slate/80">
          Update your personal details, budgeting preferences, and refresh your linked Capital One data.
        </p>
      </header>

      <div className="space-y-6">
        {profileStatus?.type === 'error' ? (
          <div className="rounded-2xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
            {profileStatus.message}
          </div>
        ) : null}

        {profileError ? (
          <div className="rounded-2xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
            {profileError.message || 'We were unable to load your profile information.'}
          </div>
        ) : null}

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
              <div className="grid gap-2">
                <label htmlFor="display-name" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                  Display name
                </label>
                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
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
                  onChange={(event) => setMonthlyBudget(event.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                  disabled={savingProfile}
                />
                <p className="text-xs text-slate/60">
                  We use this number to calculate how long you can stay in each destination.
                </p>
              </div>

              <fieldset className="grid gap-3">
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                  Mailing address
                </legend>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
                  <div className="grid gap-1.5">
                    <label htmlFor="address-house-number" className="text-xs font-medium text-slate/70">
                      House number
                    </label>
                    <input
                      id="address-house-number"
                      type="text"
                      inputMode="numeric"
                      autoComplete="address-line1"
                      value={addressHouseNumber}
                      onChange={(event) => setAddressHouseNumber(event.target.value)}
                      placeholder="e.g. 123"
                      className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                      disabled={savingProfile}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="address-street" className="text-xs font-medium text-slate/70">
                      Street
                    </label>
                    <input
                      id="address-street"
                      type="text"
                      autoComplete="address-line1"
                      value={addressStreet}
                      onChange={(event) => setAddressStreet(event.target.value)}
                      placeholder="Market Street"
                      className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                      disabled={savingProfile}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                  <div className="grid gap-1.5">
                    <label htmlFor="address-city" className="text-xs font-medium text-slate/70">
                      City
                    </label>
                    <input
                      id="address-city"
                      type="text"
                      autoComplete="address-level2"
                      value={addressCity}
                      onChange={(event) => setAddressCity(event.target.value)}
                      placeholder="San Francisco"
                      className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                      disabled={savingProfile}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="address-state" className="text-xs font-medium text-slate/70">
                      State / region
                    </label>
                    <input
                      id="address-state"
                      type="text"
                      autoComplete="address-level1"
                      value={addressState}
                      onChange={(event) => setAddressState(event.target.value.toUpperCase())}
                      placeholder="CA"
                      className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                      disabled={savingProfile}
                      maxLength={32}
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
                <p className="text-xs text-slate/60">
                  This stays private and helps us tailor exchange rates and insights for your home base.
                </p>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="current-country" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                    Current country
                  </label>
                  <select
                    id="current-country"
                    value={currentCountryCode}
                    onChange={(event) => setCurrentCountryCode(event.target.value)}
                    className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                    disabled={savingProfile || countriesLoading}
                  >
                    <option value="">Select a country</option>
                    {countriesLoading ? (
                      <option value="" disabled>
                        Loading countries…
                      </option>
                    ) : null}
                    {countryOptions.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate/60">
                    Where you are based today. Update this when you travel to keep PPP insights accurate.
                  </p>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="home-country" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                    Home country
                  </label>
                  <select
                    id="home-country"
                    value={homeCountryCode}
                    onChange={(event) => setHomeCountryCode(event.target.value)}
                    className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                    disabled={savingProfile || countriesLoading}
                  >
                    <option value="">Select a country</option>
                    {countriesLoading ? (
                      <option value="" disabled>
                        Loading countries…
                      </option>
                    ) : null}
                    {countryOptions.map((country) => (
                      <option key={`home-${country.code}`} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate/60">
                    Helps us compare your purchasing power with where you grew up or keep ties.
                  </p>
                </div>
              </div>

              {countriesError ? (
                <div className="rounded-2xl border border-red/40 bg-red/5 px-4 py-3 text-xs text-red">
                  {countriesError}
                </div>
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
              {Array.isArray(nessie?.accounts) && nessie.accounts.length > 0 ? (
                nessie.accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-2xl border border-slate/15 bg-white/70 px-4 py-3 shadow-sm shadow-white/60"
                  >
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
              )}
            </div>

            {accountsStatus ? (
              <div
                className={
                  accountsStatus.type === 'error'
                    ? 'rounded-2xl border border-red/40 bg-red/5 px-3 py-2 text-xs text-red'
                    : 'rounded-2xl border border-emerald-400/40 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-700'
                }
              >
                {accountsStatus.message}
              </div>
            ) : null}
          </SettingsSection>
        </div>
      </div>
    </main>
  );
}
