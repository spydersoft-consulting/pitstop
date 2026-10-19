import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export type ButtonVariant = "solid" | "text" | "outlined";
export type ButtonSeverity = "primary" | "secondary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<AriaButtonProps, "children" | "className" | "isDisabled"> {
  label?: string;
  icon?: React.ReactNode;
  iconPos?: "left" | "right";
  loading?: boolean;
  title?: string;
  disabled?: boolean;
  variant?: ButtonVariant;
  severity?: ButtonSeverity;
  size?: ButtonSize;
  className?: string;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors cursor-pointer " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm min-h-9",
  md: "px-4 py-2 text-base min-h-10",
  lg: "px-5 py-3 text-lg min-h-12",
};

const palette: Record<ButtonSeverity, Record<ButtonVariant, string>> = {
  primary: {
    solid: "bg-primary text-white hover:bg-primary/90 border border-primary",
    outlined: "bg-transparent text-primary border border-primary hover:bg-primary/10",
    text: "bg-transparent text-primary border border-transparent hover:bg-primary/10",
  },
  secondary: {
    solid: "bg-secondary text-white hover:bg-secondary/90 border border-secondary",
    outlined: "bg-transparent text-secondary border border-secondary hover:bg-secondary/10",
    text: "bg-transparent text-secondary border border-transparent hover:bg-secondary/10",
  },
  danger: {
    solid: "bg-danger text-white hover:bg-danger/90 border border-danger",
    outlined: "bg-transparent text-danger border border-danger hover:bg-danger/10",
    text: "bg-transparent text-danger border border-transparent hover:bg-danger/10",
  },
};

export const Button: React.FC<ButtonProps> = ({
  label,
  icon,
  iconPos = "left",
  loading = false,
  disabled = false,
  variant = "solid",
  severity = "primary",
  size = "md",
  className,
  children,
  ...rest
}) => {
  const classes = [base, sizes[size], palette[severity][variant], className].filter(Boolean).join(" ");
  const iconOnLeft = iconPos === "left";
  const leading = loading ? <FontAwesomeIcon icon={faSpinner} spin /> : iconOnLeft && icon;
  const trailing = !loading && !iconOnLeft && icon;

  return (
    <AriaButton {...rest} isDisabled={disabled || loading} className={classes}>
      {leading}
      {label ?? children}
      {trailing}
    </AriaButton>
  );
};
