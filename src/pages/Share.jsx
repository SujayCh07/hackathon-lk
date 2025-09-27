import { useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import ShareSummary from '../components/share/ShareSummary.jsx';
import ExportActions from '../components/share/ExportActions.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { usePPP } from '../hooks/usePPP.js';

export function Share() {
  const { balanceUSD } = useAccount();
  const { rankedBySavings } = usePPP();
  const summaryRef = useRef(null);

  const bestCity = useMemo(() => rankedBySavings[0] ?? { city: 'Lisbon', savings: 28 }, [rankedBySavings]);
  const score = useMemo(() => {
    if (!rankedBySavings.length) return 72;
    const base = 80;
    const adjustment = Math.max(-10, Math.min(10, bestCity.savings / 5));
    return Math.round(base + adjustment);
  }, [bestCity.savings, rankedBySavings.length]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <Card className="bg-white/85">
        <CardHeader>
          <CardTitle>Share your PPP story</CardTitle>
          <p className="text-sm text-charcoal/70">
            Export a polished PPP summary to show friends or clients how your dollars stretch across destinations.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-8">
          <ShareSummary ref={summaryRef} bestCity={bestCity} score={score} balance={balanceUSD} />
          <ExportActions targetRef={summaryRef} />
        </CardContent>
      </Card>
    </div>
  );
}

export default Share;
