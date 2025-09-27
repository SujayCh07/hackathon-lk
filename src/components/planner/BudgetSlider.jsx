import { useId } from 'react';

export function BudgetSlider({ value, min = 1000, max = 8000, step = 250, onChange }) {
  const id = useId();
  return (
    <div className="w-full">
      <label htmlFor={id} className="flex items-center justify-between text-sm font-medium text-charcoal/80">
        <span>Monthly spend goal</span>
        <span className="font-semibold text-teal">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 h-2 w-full appearance-none rounded-full bg-charcoal/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <div className="mt-1 flex justify-between text-xs text-charcoal/60">
        <span>${min}</span>
        <span>${max}</span>
      </div>
    </div>
  );
}

export default BudgetSlider;
