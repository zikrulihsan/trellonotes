import type { ButtonHTMLAttributes } from 'react';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'destructive';
}
export function Button({ variant = 'default', className = '', type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={`button ${variant === 'default' ? '' : variant} ${className}`}
      {...props}
    />
  );
}
