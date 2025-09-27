import clsx from 'clsx';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';

export function SettingsSection({
  title,
  description,
  actions,
  children,
  footer,
  className,
  contentClassName
}) {
  return (
    <Card as="section" className={className}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? (
            <p className="max-w-prose text-sm text-slate/70">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className={clsx('text-sm text-slate/80', contentClassName)}>{children}</CardContent>
      {footer ? (
        <div className="mt-4 border-t border-white/60 pt-4 text-xs text-slate/60">{footer}</div>
      ) : null}
    </Card>
  );
}

export default SettingsSection;
