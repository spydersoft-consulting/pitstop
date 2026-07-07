import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface KpiTileProps {
  icon: IconDefinition;
  label: string;
  value: string;
  unit?: string;
}

export const KpiTile: React.FC<KpiTileProps> = ({
  icon,
  label,
  value,
  unit,
}) => (
  <div className="flex items-center gap-2 sm:gap-3 rounded-xl bg-surface px-3 py-3 border border-border min-w-0">
    <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-brand-tint text-brand shrink-0">
      <FontAwesomeIcon icon={icon} className="text-base sm:text-lg" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-meta uppercase tracking-wide text-content-muted truncate">
        {label}
      </p>
      <p className="font-numeric text-lg sm:text-2xl leading-tight text-content truncate">
        {value}
        {unit && (
          <span className="text-xs sm:text-sm text-content-muted ml-1 font-sans">
            {unit}
          </span>
        )}
      </p>
    </div>
  </div>
);
