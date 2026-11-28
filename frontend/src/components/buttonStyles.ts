export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function buttonStyles(variant: ButtonVariant = 'primary', extra = ''): string {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 font-body text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-pressed',
    secondary:
      'bg-surface text-foreground border border-border hover:bg-accent-wash hover:text-accent hover:border-accent',
    danger: 'bg-danger text-danger-foreground hover:bg-danger-hover active:bg-danger-pressed',
  };

  return [base, variants[variant], extra].filter(Boolean).join(' ');
}
