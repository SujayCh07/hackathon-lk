import clsx from 'clsx';

const baseStyles =
  'inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all duration-300';

const variants = {
  primary:
    'bg-red text-white shadow-lg shadow-red/30 hover:bg-gradient-to-r hover:from-red hover:to-navy focus-visible:outline-red',
  secondary:
    'bg-offwhite text-navy border border-navy hover:bg-navy hover:text-offwhite focus-visible:outline-navy',
  ghost:
    'bg-transparent text-offwhite border border-offwhite hover:bg-offwhite hover:text-navy focus-visible:outline-offwhite'
};

export function Button({ as: Component = 'button', variant = 'primary', className, children, ...props }) {
  return (
    <Component className={clsx(baseStyles, variants[variant], className)} {...props}>
      {children}
    </Component>
  );
}

export default Button;
