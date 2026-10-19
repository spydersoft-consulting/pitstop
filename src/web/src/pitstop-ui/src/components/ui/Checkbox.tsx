import { Checkbox as AriaCheckbox } from "react-aria-components";

interface CheckboxProps {
  inputId?: string;
  checked: boolean;
  onChange: (event: { checked: boolean }) => void;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ inputId, checked, onChange, disabled, className }) => (
  <AriaCheckbox
    id={inputId}
    isSelected={checked}
    isDisabled={disabled}
    onChange={(isSelected) => onChange({ checked: isSelected })}
    className={["group inline-flex items-center", className].filter(Boolean).join(" ")}
  >
    {({ isSelected, isFocusVisible }) => (
      <>
        <span
          className={[
            "flex h-5 w-5 items-center justify-center rounded border transition-colors",
            isSelected ? "border-primary bg-primary text-white" : "border-border-strong bg-surface",
            isFocusVisible ? "outline-2 outline-offset-2 outline-primary" : "",
          ].join(" ")}
          aria-hidden
        >
          {isSelected && (
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 6l3 3 5-6" />
            </svg>
          )}
        </span>
      </>
    )}
  </AriaCheckbox>
);
