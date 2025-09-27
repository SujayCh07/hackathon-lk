import clsx from 'clsx';

export function Card({ as: Component = 'div', className, children, ...props }) {
  return (
    <Component
      className={clsx(
        'rounded-3xl border border-white/40 bg-gradient-to-br from-white/90 via-white/75 to-sky/10 p-6 shadow-xl shadow-navy/10 backdrop-blur-sm ring-1 ring-white/40',
        'transition-transform duration-300 hover:-translate-y-1 focus-within:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={clsx('mb-4 flex items-start justify-between gap-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={clsx('text-lg font-semibold text-navy', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={clsx('space-y-2 text-sm text-slate/80', className)} {...props}>
      {children}
    </div>
  );
}

export default Card;
