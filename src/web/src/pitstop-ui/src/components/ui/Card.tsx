interface CardProps {
  title?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, className, children }) => (
  <div className={["rounded-xl border border-border bg-surface shadow-sm p-5", className].filter(Boolean).join(" ")}>
    {title && <h2 className="text-xl font-semibold text-content mb-3">{title}</h2>}
    {children}
  </div>
);
