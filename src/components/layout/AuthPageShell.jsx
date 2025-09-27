import clsx from 'clsx';

export function AuthPageShell({
  children,
  eyebrow = 'Parity Personal Passport',
  title,
  description,
  className
}) {
  return (
    <section
      className={clsx(
        'relative isolate overflow-hidden bg-slate-950 text-white',
        className
      )}
    >
      <BackgroundDecor />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col items-center gap-12 px-6 py-20 lg:flex-row lg:items-stretch lg:py-28">
        <div className="max-w-xl text-center lg:text-left">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h1 className="mt-6 font-poppins text-4xl font-semibold leading-tight text-white md:text-5xl">
              {title}
            </h1>
          ) : null}
          {description ? (
            <p className="mt-6 text-base leading-relaxed text-white/70 md:text-lg">
              {description}
            </p>
          ) : null}
        </div>
        <div className="relative w-full max-w-md">
          <div
            className="pointer-events-none absolute -inset-[1.75rem] -z-10 hidden rounded-[4rem] bg-white/10 blur-3xl drop-shadow-2xl md:block"
            aria-hidden="true"
          />
          <div className="relative rounded-[2.25rem] border border-white/15 bg-white/95 p-8 text-left shadow-2xl shadow-navy/20 backdrop-blur">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

AuthPageShell.displayName = 'AuthPageShell';

function BackgroundDecor() {
  return (
    <>
      <div className="absolute inset-0 -z-40 bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.25),_transparent_60%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(79,70,229,0.2),_transparent_50%)]" />
      <div className="absolute inset-0 -z-50 bg-[length:22px_22px] bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_0)] opacity-40" />
      <div className="absolute left-1/2 top-[-10%] -z-30 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-red/30 blur-3xl" />
      <div className="absolute left-[-8rem] top-1/4 -z-30 hidden h-80 w-80 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-3xl md:block" />
      <div className="absolute right-[-6rem] bottom-1/5 -z-30 hidden h-96 w-96 rounded-full bg-gradient-to-tr from-sky-500/40 to-transparent blur-3xl md:block" />
      <div
        className="absolute left-[12%] top-[20%] -z-20 hidden h-48 w-48 rounded-full border border-white/20 bg-white/10 backdrop-blur animate-float-slow md:block"
        aria-hidden="true"
      />
      <div
        className="absolute right-[14%] bottom-[18%] -z-20 hidden h-36 w-36 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm animate-float-slower md:block"
        aria-hidden="true"
      />
    </>
  );
}

export default AuthPageShell;
