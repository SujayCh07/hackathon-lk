// src/components/dashboard/SavingsRunwayPanel.jsx
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card.jsx";
import Dictionary from "../../pages/Dictionary.js"; // ✅ adjust path if needed

function formatUSD(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n) ?? 0);
}

function capitalizeFirstLetter(str) {
  if (!str) return "";
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Show how long your savings can last in different destinations
 * using monthly cost-of-living data from Dictionary.js.
 * Also compare against the cost of living in the current country.
 */
export default function SavingsRunwayPanel({
  destinations = [],
  stayLengthMonths = 6,
  currentCountry = "united states", // default fallback
}) {
  if (!Array.isArray(destinations) || destinations.length === 0) {
    return (
      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Savings runway</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-charcoal/60">
            We’ll calculate how long your money lasts once we have more data.
          </p>
        </CardContent>
      </Card>
    );
  }

  // get current country monthly cost from dictionary
  const currentMonthlyCost =
    Dictionary[currentCountry.toLowerCase()]?.cost_of_living ?? null;

  return (
    <Card className="bg-white/90">
      <CardHeader>
        <CardTitle>Savings runway</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {destinations.map((dest) => {
          const monthly = dest.monthlyCost ?? 0;
          const daily = monthly > 0 ? Math.round(monthly / 30) : null;

          // comparison vs current country COA
          let comparison = null;
          if (currentMonthlyCost && monthly > 0) {
            const diffPct =
              ((currentMonthlyCost - monthly) / currentMonthlyCost) * 100;
            comparison =
              diffPct > 0
                ? `~${diffPct.toFixed(0)}% cheaper than ${capitalizeFirstLetter(currentCountry)}`
                : `~${Math.abs(diffPct).toFixed(0)}% more expensive than ${capitalizeFirstLetter(currentCountry)}`;
          }

          return (
            <div
              key={dest.city}
              className="flex flex-col rounded-xl border border-navy/10 bg-offwhite/60 p-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-charcoal">{dest.city}</h3>
                <p className="text-sm text-green-600">
                  {monthly ? `${formatUSD(monthly)}/month` : "—"}
                </p>
              </div>
              {daily && (
                <p className="text-xs text-charcoal/60 mt-1">
                  ≈ {formatUSD(daily)}/day
                </p>
              )}
              {typeof dest.savings === "number" && (
                <p className="text-xs text-charcoal/50 mt-1">
                  Savings vs. your budget: {(dest.savings * 100).toFixed(0)}%
                </p>
              )}
              {comparison && (
                <p className="text-xs text-blue-600 mt-1">{comparison}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
