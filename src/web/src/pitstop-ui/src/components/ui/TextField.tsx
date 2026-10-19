import { Input, TextArea } from "react-aria-components";
import { useLayoutEffect, useRef } from "react";

const field =
  "w-full rounded-md border bg-surface px-3 py-3 text-base text-content placeholder:text-content-muted " +
  "focus:outline-2 focus:outline-offset-0 focus:outline-primary disabled:opacity-60";

const borderFor = (invalid?: boolean) => (invalid ? "border-danger" : "border-border-strong");

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & {
  invalid?: boolean;
  className?: string;
  ref?: React.Ref<HTMLInputElement>;
};

export const InputText: React.FC<InputProps> = ({ invalid, className, ...rest }) => (
  <Input
    {...rest}
    aria-invalid={invalid || undefined}
    className={[field, borderFor(invalid), className].filter(Boolean).join(" ")}
  />
);

type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
  invalid?: boolean;
  autoResize?: boolean;
  className?: string;
};

export const Textarea: React.FC<TextareaProps> = ({ invalid, autoResize, className, value, ...rest }) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!autoResize || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [autoResize, value]);

  return (
    <TextArea
      {...rest}
      ref={ref}
      value={value}
      aria-invalid={invalid || undefined}
      className={[field, borderFor(invalid), autoResize ? "resize-none overflow-hidden" : "", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
};
