import {
  Button as AriaButton,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  SelectValue,
} from "react-aria-components";
import { faChevronDown, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export interface SelectOption<T> {
  label: string;
  value: T;
}

interface SelectProps<T extends string | number> {
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (event: { value: T }) => void;
  placeholder?: string;
  onClear?: () => void;
  inputId?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const triggerClasses =
  "flex w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 py-3 text-left text-base text-content " +
  "focus:outline-2 focus:outline-primary data-focus-visible:outline-2 data-focus-visible:outline-primary disabled:opacity-60";

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  placeholder,
  onClear,
  inputId,
  invalid,
  disabled,
  className,
  "aria-label": ariaLabel,
}: Readonly<SelectProps<T>>) {
  const selected = options.find((o) => o.value === value);
  const hasValue = value !== null && value !== undefined && selected !== undefined;

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <AriaSelect
        value={hasValue ? String(value) : null}
        onChange={(key) => {
          const next = options.find((o) => String(o.value) === String(key));
          if (next) onChange({ value: next.value });
        }}
        placeholder={placeholder ?? "Select"}
        isDisabled={disabled}
        isInvalid={invalid}
        aria-label={ariaLabel ?? (inputId ? undefined : (placeholder ?? "Select"))}
        aria-labelledby={inputId ? `${inputId}-label` : undefined}
        className="w-full"
      >
        <AriaButton
          id={inputId}
          className={[
            triggerClasses,
            invalid ? "border-danger" : "border-border-strong",
            onClear && hasValue ? "pr-16" : "",
          ].join(" ")}
        >
          <SelectValue className={hasValue ? "truncate" : "truncate text-content-muted"} />
          <FontAwesomeIcon icon={faChevronDown} className="text-content-muted text-sm" aria-hidden />
        </AriaButton>
        <Popover className="z-1200 w-(--trigger-width) rounded-md border border-border bg-surface shadow-lg">
          <ListBox className="max-h-72 overflow-y-auto p-1 outline-none">
            {options.map((option) => (
              <ListBoxItem
                key={String(option.value)}
                id={String(option.value)}
                textValue={option.label}
                className="cursor-pointer rounded px-3 py-2.5 text-base text-content outline-none data-focused:bg-surface-muted data-selected:font-semibold"
              >
                {option.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </AriaSelect>
      {onClear && hasValue && !disabled && (
        <button
          type="button"
          aria-label="Clear"
          onClick={onClear}
          className="absolute top-1/2 right-9 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1 text-content-muted hover:text-content"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
    </div>
  );
}
