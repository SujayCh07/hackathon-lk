import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import {
  fetchCityDirectory,
  fetchUserProfile,
  updateUserProfile
} from '../lib/userIdentity.js';

const emptyFormState = {
  displayName: '',
  currentCityCode: '',
  homeCityCode: '',
  monthlyBudget: ''
};

export function Settings() {
  const { user, refreshUser, nessie, isSyncingNessie, refreshNessie } = useAuth();
  const [formValues, setFormValues] = useState(emptyFormState);
  const [initialValues, setInitialValues] = useState(null);
  const [cities, setCities] = useState([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setFormValues(emptyFormState);
      setInitialValues(null);
      return;
    }

    setIsLoadingProfile(true);
    setLoadError(null);
    setFeedback(null);

    try {
      const [profile, directory] = await Promise.all([
        fetchUserProfile(user.id),
        fetchCityDirectory()
      ]);

      setCities(directory);

      const baseDisplayName =
        profile?.name?.trim() ||
        user.user_metadata?.displayName?.trim() ||
        user.user_metadata?.name?.trim() ||
        user.email?.split('@')[0] ||
        '';

      const currentCityCode = profile?.current_city_code ?? '';
      const homeCityCode = profile?.home_city_code ?? '';
      const monthlyBudget =
        typeof profile?.monthly_budget === 'number' && !Number.isNaN(profile.monthly_budget)
          ? String(profile.monthly_budget)
          : '';

      const nextForm = {
        displayName: baseDisplayName,
        currentCityCode,
        homeCityCode,
        monthlyBudget
      };

      setFormValues(nextForm);
      setInitialValues(nextForm);
    } catch (error) {
      console.warn('Failed to load profile', error);
      setLoadError(error?.message ?? 'Unable to load your profile right now.');
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const cityOptions = useMemo(() => {
    return cities.map((city) => ({
      code: city.code,
      label: city.flag ? `${city.flag} ${city.name}` : city.name
    }));
  }, [cities]);

  const isDirty = useMemo(() => {
    if (!initialValues) {
      return false;
    }

    return (
      initialValues.displayName !== formValues.displayName.trim() ||
      initialValues.currentCityCode !== formValues.currentCityCode ||
      initialValues.homeCityCode !== formValues.homeCityCode ||
      initialValues.monthlyBudget !== formValues.monthlyBudget.trim()
    );
  }, [formValues, initialValues]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);

    if (!user?.id) {
      setFeedback({ type: 'error', text: 'You need to be signed in to update your profile.' });
      return;
    }

    const trimmedDisplayName = formValues.displayName.trim();
    if (!trimmedDisplayName) {
      setFeedback({ type: 'error', text: 'Display name is required.' });
      return;
    }

    const trimmedBudgetInput = formValues.monthlyBudget.trim();
    const monthlyBudgetValue = trimmedBudgetInput === '' ? null : Number(trimmedBudgetInput);
    if (monthlyBudgetValue !== null && Number.isNaN(monthlyBudgetValue)) {
      setFeedback({ type: 'error', text: 'Monthly budget must be a valid number.' });
      return;
    }

    setIsSaving(true);

    try {
      await updateUserProfile({
        userId: user.id,
        displayName: trimmedDisplayName,
        currentCityCode: formValues.currentCityCode || null,
        homeCityCode: formValues.homeCityCode || null,
        monthlyBudget: monthlyBudgetValue
      });

      try {
        await refreshUser();
      } catch (error) {
        console.warn('Failed to refresh user metadata after update', error);
      }

      const normalisedBudgetValue =
        monthlyBudgetValue === null || Number.isNaN(monthlyBudgetValue)
          ? ''
          : String(monthlyBudgetValue);

      const nextValues = {
        displayName: trimmedDisplayName,
        currentCityCode: formValues.currentCityCode,
        homeCityCode: formValues.homeCityCode,
        monthlyBudget: normalisedBudgetValue
      };

      setFormValues(nextValues);
      setInitialValues(nextValues);
      setFeedback({ type: 'success', text: 'Profile updated successfully.' });
    } catch (error) {
      console.error('Failed to save profile', error);
      setFeedback({ type: 'error', text: error?.message ?? 'Could not save your profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Account settings</h1>
        <p className="mt-2 text-sm text-navy/70">
          Update your display name, location preferences, and budgeting targets. Changes sync across the navigation and Nessie
          integrations instantly.
        </p>
      </div>

      {feedback && (
        <div
          className={`mb-6 rounded-3xl border px-4 py-3 text-sm font-semibold ${
            feedback.type === 'success'
              ? 'border-teal/40 bg-teal/10 text-teal'
              : 'border-coral/40 bg-coral/10 text-coral'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <Card className="bg-white/85">
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingProfile ? (
              <div className="flex min-h-[180px] items-center justify-center text-sm text-navy/60">
                Loading your profile…
              </div>
            ) : loadError ? (
              <div className="space-y-4">
                <p className="text-sm text-coral">{loadError}</p>
                <Button type="button" variant="secondary" onClick={loadProfile} className="text-sm">
                  Try again
                </Button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label htmlFor="settings-display-name" className="block text-sm font-semibold text-charcoal">
                      Display name
                    </label>
                    <input
                      id="settings-display-name"
                      name="displayName"
                      type="text"
                      required
                      value={formValues.displayName}
                      onChange={handleInputChange}
                      className="mt-2 w-full rounded-2xl border border-navy/20 bg-offwhite px-4 py-3 text-sm text-charcoal focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                      placeholder="How should we greet you?"
                    />
                    <p className="mt-2 text-xs text-charcoal/60">
                      This name appears in the navigation bar and across personalised insights.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="settings-email" className="block text-sm font-semibold text-charcoal">
                      Email
                    </label>
                    <input
                      id="settings-email"
                      type="email"
                      value={user?.email ?? ''}
                      disabled
                      className="mt-2 w-full cursor-not-allowed rounded-2xl border border-navy/10 bg-navy/5 px-4 py-3 text-sm text-charcoal"
                    />
                    <p className="mt-2 text-xs text-charcoal/60">Managed via Supabase Auth. Contact support to change this email.</p>
                  </div>
                  <div>
                    <label htmlFor="settings-current-city" className="block text-sm font-semibold text-charcoal">
                      Current city
                    </label>
                    <select
                      id="settings-current-city"
                      name="currentCityCode"
                      value={formValues.currentCityCode}
                      onChange={handleInputChange}
                      className="mt-2 w-full rounded-2xl border border-navy/20 bg-offwhite px-4 py-3 text-sm text-charcoal focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                    >
                      <option value="">Not set</option>
                      {cityOptions.map((city) => (
                        <option key={city.code} value={city.code}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-charcoal/60">
                      We use your current city to personalise PPP insights and budget recommendations.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="settings-home-city" className="block text-sm font-semibold text-charcoal">
                      Home city
                    </label>
                    <select
                      id="settings-home-city"
                      name="homeCityCode"
                      value={formValues.homeCityCode}
                      onChange={handleInputChange}
                      className="mt-2 w-full rounded-2xl border border-navy/20 bg-offwhite px-4 py-3 text-sm text-charcoal focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                    >
                      <option value="">Not set</option>
                      {cityOptions.map((city) => (
                        <option key={city.code} value={city.code}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-charcoal/60">
                      Set a home base to compare purchasing power between cities at a glance.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="settings-monthly-budget" className="block text-sm font-semibold text-charcoal">
                      Monthly budget goal (USD)
                    </label>
                    <input
                      id="settings-monthly-budget"
                      name="monthlyBudget"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formValues.monthlyBudget}
                      onChange={handleInputChange}
                      className="mt-2 w-full rounded-2xl border border-navy/20 bg-offwhite px-4 py-3 text-sm text-charcoal focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                      placeholder="e.g. 2500"
                    />
                    <p className="mt-2 text-xs text-charcoal/60">
                      Your dashboard highlights progress against this goal each month.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <Button type="submit" className="px-6" disabled={!isDirty || isSaving}>
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-6"
                    onClick={loadProfile}
                    disabled={isLoadingProfile || isSaving}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/85">
          <CardHeader>
            <CardTitle>Connected services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-charcoal/80">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">Nessie customer ID</p>
              <p className="mt-1 rounded-2xl bg-offwhite px-4 py-3 font-mono text-xs text-charcoal/80">
                {nessie.customerId ? nessie.customerId : 'Not yet provisioned'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-navy/10 bg-offwhite px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">Accounts</p>
                <p className="mt-1 text-lg font-semibold text-navy">{nessie.accounts.length}</p>
              </div>
              <div className="rounded-2xl border border-navy/10 bg-offwhite px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">Transactions</p>
                <p className="mt-1 text-lg font-semibold text-navy">{nessie.transactions.length}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-center text-sm"
              onClick={refreshNessie}
              disabled={isSyncingNessie}
            >
              {isSyncingNessie ? 'Refreshing Nessie data…' : 'Refresh Nessie data'}
            </Button>
            <p className="text-xs text-charcoal/60">
              Refresh the Nessie sandbox connection if you recently updated your customer profile or need the latest transactions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Settings;
