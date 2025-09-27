import clsx from 'clsx';

export function Progress({ value = 0, className, color = 'bg-turquoise' }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx('h-3 w-full rounded-full bg-charcoal/10', className)} role="progressbar" aria-valuenow={normalized} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={clsx('h-3 rounded-full transition-all duration-500 ease-out', color)}
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}

export default Progress;
