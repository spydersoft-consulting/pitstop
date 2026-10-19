import { Dialog, Popover as AriaPopover } from "react-aria-components";

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<Element | null>;
  nonModal?: boolean;
  placement?: "bottom" | "bottom end" | "bottom start" | "top";
  className?: string;
  "aria-label"?: string;
  children?: React.ReactNode;
}

export const Popover: React.FC<PopoverProps> = ({
  open,
  onOpenChange,
  triggerRef,
  nonModal = false,
  placement = "bottom end",
  className,
  "aria-label": ariaLabel,
  children,
}) => (
  <AriaPopover
    isOpen={open}
    onOpenChange={onOpenChange}
    triggerRef={triggerRef}
    shouldCloseOnInteractOutside={(element) => !triggerRef.current?.contains(element)}
    isNonModal={nonModal}
    placement={placement}
    offset={8}
    className={["z-1200 rounded-lg border border-border bg-surface p-3 shadow-lg", className].filter(Boolean).join(" ")}
  >
    <Dialog aria-label={ariaLabel ?? "Details"} className="outline-none">
      {children}
    </Dialog>
  </AriaPopover>
);
