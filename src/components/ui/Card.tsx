type CardProps = {
  children: React.ReactNode;
  className?: string;
};

/** Generic bordered/rounded surface — the base container for KPI blocks, panels, forms. */
export function Card({ children, className = "" }: CardProps) {
  return <div className={`rounded-card border border-border bg-white p-4 ${className}`}>{children}</div>;
}
