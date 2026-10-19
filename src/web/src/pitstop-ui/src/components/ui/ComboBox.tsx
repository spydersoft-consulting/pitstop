import { useRef } from "react";
import {
  Button as AriaButton,
  ComboBox as AriaComboBox,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface ComboBoxProps<T> {
  inputValue: string;
  onInputChange: (value: string) => void;
  items: T[];
  getKey: (item: T) => string;
  getText: (item: T) => string;
  renderItem?: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  onSearch?: (term: string) => void;
  placeholder?: string;
  inputId?: string;
  showTrigger?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function ComboBox<T>({
  inputValue,
  onInputChange,
  items,
  getKey,
  getText,
  renderItem,
  onSelect,
  onSearch,
  placeholder,
  inputId,
  showTrigger,
  className,
  "aria-label": ariaLabel,
}: ComboBoxProps<T>) {
  const selectingRef = useRef(false);

  return (
    <AriaComboBox
      items={items}
      inputValue={inputValue}
      selectedKey={null}
      allowsCustomValue
      allowsEmptyCollection
      menuTrigger="input"
      aria-label={ariaLabel ?? (inputId ? undefined : (placeholder ?? "Search"))}
      aria-labelledby={inputId && !ariaLabel ? `${inputId}-label` : undefined}
      onInputChange={(next) => {
        if (selectingRef.current) {
          selectingRef.current = false;
          return;
        }
        onInputChange(next);
        onSearch?.(next);
      }}
      onSelectionChange={(key) => {
        if (key === null) return;
        const item = items.find((i) => getKey(i) === String(key));
        if (!item) return;
        selectingRef.current = true;
        setTimeout(() => {
          selectingRef.current = false;
        }, 0);
        onSelect(item);
      }}
      onOpenChange={(isOpen, trigger) => {
        if (isOpen && trigger === "manual") onSearch?.(inputValue);
      }}
      className={["relative w-full", className].filter(Boolean).join(" ")}
    >
      <div className="flex w-full items-center">
        <Input
          id={inputId}
          placeholder={placeholder}
          className={[
            "w-full border border-border-strong bg-surface px-3 py-3 text-base text-content placeholder:text-content-muted",
            "focus:outline-2 focus:outline-primary",
            showTrigger ? "rounded-l-md" : "rounded-md",
          ].join(" ")}
        />
        {showTrigger && (
          <AriaButton
            aria-label="Show suggestions"
            className="flex shrink-0 cursor-pointer items-center justify-center self-stretch rounded-r-md border-0 bg-primary px-4 text-white outline-none data-focus-visible:outline-2 data-focus-visible:outline-primary"
          >
            <FontAwesomeIcon icon={faChevronDown} />
          </AriaButton>
        )}
      </div>
      <Popover
        className={[
          "z-1200 w-(--trigger-width) rounded-md border border-border bg-surface shadow-lg",
          items.length === 0 ? "hidden" : "",
        ].join(" ")}
      >
        <ListBox className="max-h-72 overflow-y-auto p-1 outline-none">
          {(item: T) => (
            <ListBoxItem
              id={getKey(item)}
              textValue={getText(item)}
              className="cursor-pointer rounded px-3 py-2.5 text-base text-content outline-none data-focused:bg-surface-muted"
            >
              {renderItem ? renderItem(item) : getText(item)}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}
