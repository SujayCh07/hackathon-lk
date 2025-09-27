import { useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import ShareSummary from '../components/share/ShareSummary.jsx';
import ExportActions from '../components/share/ExportActions.jsx';
import SocialButtons from '../components/share/SocialButtons.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { usePPP } from '../hooks/usePPP.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import usePersonalization from '../hooks/usePersonalization.js';

export function Share() {
  const { balanceUSD } = useAccount();
  const { rankedBySavings } = usePPP();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile } = useUserProfile(userId);
  const { data: personalization } = usePersonalization(userId);
  const summaryRef = useRef(null);

  const baselineCountry = useMemo(() => {
    if (profile?.homeCountry?.name) return profile.homeCountry.name;
    return 'PPP Passport';
  }, [profile?.homeCountry?.name]);

  const bestCity = useMemo(() => {
    if (!rankedBySavings.length) return { city: 'Lisbon', savings: 28, runwayLabel: '2.4 years' };
    const [top] = rankedBySavings;
    const runwayLabel = top.monthlyCost && personalization?.monthlyBudget
      ? `${(personalization.monthlyBudget / top.monthlyCost).toFixed(1)} months`
      : 'Ready when you are';
    return {
      ...top,
      runwayLabel,
      countryCode: top.countryCode ?? top.code ?? '',
    };
  }, [personalization?.monthlyBudget, rankedBySavings]);

  const score = useMemo(() => {
    if (!rankedBySavings.length) return 72;
    const base = 80;
    const adjustment = Math.max(-10, Math.min(10, (bestCity.savings ?? 0) / 5));
    return Math.round(base + adjustment);
  }, [bestCity.savings, rankedBySavings.length]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <Card className="bg-white/85">
        <CardHeader>
          <CardTitle>Share your PPP story</CardTitle>
          <p className="text-sm text-charcoal/70">
            Export a polished travel card or send a quick share so friends can see where your dollars stretch the furthest.
          </p>
          <p className="mt-1 text-xs text-charcoal/60">Share = turn insights into stories to share with others.</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-8">
          <ShareSummary
            ref={summaryRef}
            bestCity={bestCity}
            score={score}
            balance={balanceUSD}
            baselineCountry={baselineCountry}
          />
          <ExportActions targetRef={summaryRef} />
          <SocialButtons summaryRef={summaryRef} />
        </CardContent>
      </Card>
    </div>
  );
}

export default Share;
