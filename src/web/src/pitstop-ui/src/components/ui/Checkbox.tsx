interface CheckboxProps {
  inputId?: string;
  checked: boolean;
  onChange: (event: { checked: boolean }) => void;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ inputId, checked, onChange, disabled, className }) => (
  <input
    type="checkbox"
    id={inputId}
    checked={checked}
    disabled={disabled}
    onChange={(e) => onChange({ checked: e.target.checked })}
    className={[
      "h-5 w-5 shrink-0 cursor-pointer rounded border-border-strong text-primary",
      "focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  />
);
