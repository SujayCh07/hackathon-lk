import clsx from 'clsx';

const baseStyles = 'inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors duration-300';

const variants = {
  primary: 'bg-turquoise text-charcoal hover:bg-teal hover:text-offwhite focus-visible:outline-teal',
  secondary: 'bg-offwhite text-teal border border-teal hover:bg-teal hover:text-offwhite focus-visible:outline-teal',
  ghost: 'bg-transparent text-offwhite border border-offwhite hover:bg-offwhite hover:text-teal focus-visible:outline-offwhite'
};

export function Button({ as: Component = 'button', variant = 'primary', className, children, ...props }) {
  return (
    <Component className={clsx(baseStyles, variants[variant], className)} {...props}>
      {children}
    </Component>
  );
}

export default Button;
