interface CardProps {
  title?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, className, children }) => (
  <div
    className={[
      "rounded-[0.875rem] bg-surface p-5 shadow-[0_1px_2px_rgba(15,17,21,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(15,17,21,0.06)]",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {title && <h2 className="text-xl font-semibold text-content mb-3">{title}</h2>}
    {children}
  </div>
);
