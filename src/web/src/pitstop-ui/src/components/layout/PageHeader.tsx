import React from "react";
import { useSetPageTitle } from "../../context";

interface PageHeaderProps {
  title?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
}) => {
  useSetPageTitle(title);

  const hasMobileContent = !!subtitle || !!actions;

  return (
    <header
      className={[
        "flex flex-row items-center justify-between gap-3",
        hasMobileContent ? "py-1" : "hidden",
        "lg:flex lg:py-0 lg:pb-2",
      ].join(" ")}
    >
      {title && (
        <div className="min-w-0">
          <h1 className="hidden lg:block font-display text-base sm:text-xl lg:text-2xl uppercase tracking-wide text-content">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-content-muted lg:mt-1">{subtitle}</p>
          )}
        </div>
      )}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {actions}
        </div>
      )}
    </header>
  );
};
