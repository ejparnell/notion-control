import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/helper/client';

type ButtonVariant = 'primary' | 'secondary' | 'submit';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border-primary bg-primary text-primary-foreground shadow-glow hover:bg-primary/90 hover:shadow-glow-strong',

  secondary:
    'border-primary/50 bg-primary-soft text-primary hover:border-primary hover:bg-primary-soft/80 hover:shadow-glow',

  submit:
    'border-success bg-success text-success-foreground shadow-glow hover:bg-success/90 hover:shadow-glow-strong',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  type,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const buttonType = type ?? (variant === 'submit' ? 'submit' : 'button');

  return (
    <button
      type={buttonType}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border font-semibold transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
