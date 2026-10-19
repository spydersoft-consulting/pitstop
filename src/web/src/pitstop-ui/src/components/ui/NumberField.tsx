import { Input, NumberField as AriaNumberField } from "react-aria-components";

interface NumberFieldProps {
  value: number | null | undefined;
  onValueChange: (event: { value: number | null }) => void;
  onBlur?: () => void;
  inputId?: string;
  placeholder?: string;
  mode?: "decimal" | "currency";
  currency?: string;
  min?: number;
  minFractionDigits?: number;
  maxFractionDigits?: number;
  useGrouping?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  value,
  onValueChange,
  onBlur,
  inputId,
  placeholder,
  mode = "decimal",
  currency = "USD",
  min,
  minFractionDigits,
  maxFractionDigits,
  useGrouping = true,
  invalid,
  disabled,
  className,
  "aria-label": ariaLabel,
}) => (
  <AriaNumberField
    value={value ?? NaN}
    onChange={(next) => onValueChange({ value: Number.isNaN(next) ? null : next })}
    onBlur={onBlur}
    minValue={min}
    isDisabled={disabled}
    isInvalid={invalid}
    aria-label={ariaLabel ?? (inputId ? undefined : placeholder)}
    aria-labelledby={inputId && !ariaLabel ? `${inputId}-label` : undefined}
    formatOptions={{
      style: mode,
      currency: mode === "currency" ? currency : undefined,
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits,
      useGrouping,
    }}
    className="w-full"
  >
    <Input
      id={inputId}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      className={[
        "w-full rounded-md border bg-surface px-3 py-3 text-base text-content placeholder:text-content-muted",
        "focus:outline-2 focus:outline-primary disabled:opacity-60",
        invalid ? "border-danger" : "border-border-strong",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  </AriaNumberField>
);
