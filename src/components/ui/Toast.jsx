import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const ICONS = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const THEME = {
  success: {
    border: 'border-emerald-200/80',
    ring: 'ring-emerald-300/60',
    iconWrap: 'bg-emerald-100',
    icon: 'text-emerald-600',
  },
  error: {
    border: 'border-red-200/80',
    ring: 'ring-red-300/60',
    iconWrap: 'bg-red-100',
    icon: 'text-red-600',
  },
  warning: {
    border: 'border-amber-200/80',
    ring: 'ring-amber-300/60',
    iconWrap: 'bg-amber-100',
    icon: 'text-amber-600',
  },
  info: {
    border: 'border-sky-200/80',
    ring: 'ring-sky-300/60',
    iconWrap: 'bg-sky-100',
    icon: 'text-sky-600',
  },
};

export function Toast({ type = 'info', title = '', description = '', onDismiss }) {
  const Icon = ICONS[type] ?? ICONS.info;
  const theme = THEME[type] ?? THEME.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-3xl border ${theme.border} 
                  bg-white/95 px-5 py-4 text-left shadow-xl ring-1 ${theme.ring} backdrop-blur`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${theme.iconWrap} ${theme.icon}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <div className="flex-1 space-y-1">
        {title ? <p className="text-sm font-semibold text-navy">{title}</p> : null}
        {description ? <p className="text-xs leading-5 text-slate/70">{description}</p> : null}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-1 rounded-full p-1 text-slate/60 transition hover:bg-slate/10 hover:text-slate/80
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-slate-300"
          aria-label="Dismiss notification"
        >
          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default Toast;
