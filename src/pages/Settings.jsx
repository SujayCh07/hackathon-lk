import { useEffect, useMemo, useState } from 'react';
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
  const [streetAddress, setStreetAddress] = useState('');
  const [currentCountryCode, setCurrentCountryCode] = useState('');
  const [homeCountryCode, setHomeCountryCode] = useState('');
  const [profileStatus, setProfileStatus] = useState(null);
  const [accountsStatus, setAccountsStatus] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState(null);

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
    setStreetAddress(profile?.streetAddress ?? '');
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

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (!userId) {
      return;
    }

    const trimmedName = displayName.trim();
    const normalisedBudget = monthlyBudget.trim();
    const normalisedAddress = streetAddress.trim();
    const normalisedCurrentCountry =
      typeof currentCountryCode === 'string' && currentCountryCode.trim().length > 0
        ? currentCountryCode.trim().toUpperCase()
        : null;
    const normalisedHomeCountry =
      typeof homeCountryCode === 'string' && homeCountryCode.trim().length > 0
        ? homeCountryCode.trim().toUpperCase()
        : null;
    const parsedBudget = normalisedBudget === '' ? null : Number(normalisedBudget);

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
        street_address: normalisedAddress || null,
        current_country_code: normalisedCurrentCountry,
        home_country_code: normalisedHomeCountry
      };

      const { error } = await supabase.from('user_profile').upsert(updates, { onConflict: 'user_id' });
      if (error) {
        throw error;
      }

      if (trimmedName) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...(user?.user_metadata ?? {}),
            displayName: trimmedName
          }
        });

        if (metadataError) {
          throw metadataError;
        }
      }

      await refreshProfile();
      setProfileStatus({ type: 'success', message: 'Profile settings updated successfully.' });
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
      <header className="mb-10 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red/80">Account</p>
        <h1 className="text-4xl font-bold tracking-tight text-navy">Settings</h1>
        <p className="max-w-2xl text-base text-slate/80">
          Update your personal details, budgeting preferences, and refresh your linked Capital One data.
        </p>
      </header>

      <div className="space-y-6">
        {profileStatus ? (
          <div
            className={
              profileStatus.type === 'error'
                ? 'rounded-2xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red'
                : 'rounded-2xl border border-emerald-400/40 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700'
            }
          >
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

              <div className="grid gap-2">
                <label htmlFor="street-address" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/60">
                  Mailing address
                </label>
                <textarea
                  id="street-address"
                  value={streetAddress}
                  onChange={(event) => setStreetAddress(event.target.value)}
                  placeholder="e.g. 123 Market Street, Apartment 4B"
                  className="w-full rounded-2xl border border-slate/20 bg-white/80 px-4 py-3 text-sm text-navy shadow-inner shadow-white/40 transition focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                  rows={3}
                  disabled={savingProfile}
                />
                <p className="text-xs text-slate/60">
                  This stays private and helps us tailor exchange rates and insights for your home base.
                </p>
              </div>

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
