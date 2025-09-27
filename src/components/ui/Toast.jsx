import clsx from 'clsx';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';

const variantStyles = {
  success: {
    icon: CheckCircleIcon,
    iconWrapper: 'bg-emerald-500/15 text-emerald-600',
    container: 'border-emerald-400/50 shadow-emerald-500/20'
  },
  error: {
    icon: ExclamationTriangleIcon,
    iconWrapper: 'bg-red/10 text-red',
    container: 'border-red/40 shadow-red/25'
  },
  info: {
    icon: InformationCircleIcon,
    iconWrapper: 'bg-navy/10 text-navy',
    container: 'border-navy/30 shadow-navy/15'
  }
};

export function Toast({ type = 'info', title, description, onDismiss }) {
  const variant = variantStyles[type] ?? variantStyles.info;
  const Icon = variant.icon;

  return (
    <div
      className={clsx(
        'pointer-events-auto w-full max-w-sm rounded-2xl border bg-white/95 p-4 text-sm text-slate/80 shadow-xl backdrop-blur',
        variant.container
      )}
      role="status"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <span className={clsx('flex h-9 w-9 items-center justify-center rounded-xl', variant.iconWrapper)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          {title ? <p className="text-sm font-semibold text-navy">{title}</p> : null}
          {description ? <p className="mt-1 text-xs leading-relaxed text-slate/70">{description}</p> : null}
        </div>
        {typeof onDismiss === 'function' ? (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-2 rounded-full p-1 text-slate/50 transition hover:bg-slate/10 hover:text-slate/80 focus:outline-none focus:ring-2 focus:ring-slate/40 focus:ring-offset-2 focus:ring-offset-white"
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default Toast;
