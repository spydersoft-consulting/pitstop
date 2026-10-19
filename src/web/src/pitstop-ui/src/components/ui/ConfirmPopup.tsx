import { useRef, useSyncExternalStore } from "react";
import { Button } from "./Button";
import { Popover } from "./Popover";
import { getSnapshot, setCurrent, subscribe } from "./confirmPopupStore";

export const ConfirmPopup: React.FC = () => {
  const options = useSyncExternalStore(subscribe, getSnapshot);
  const triggerRef = useRef<HTMLElement | null>(null);
  triggerRef.current = options?.target ?? null;

  const close = () => setCurrent(null);

  return (
    <Popover
      open={options !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) close();
      }}
      triggerRef={triggerRef}
      placement="bottom"
      aria-label="Confirm"
      className="w-64"
    >
      <p className="mb-3 text-sm text-content">{options?.message}</p>
      <div className="flex justify-end gap-2">
        <Button
          label={options?.rejectLabel ?? "No"}
          size="sm"
          variant="outlined"
          onClick={() => {
            options?.reject?.();
            close();
          }}
        />
        <Button
          label={options?.acceptLabel ?? "Yes"}
          size="sm"
          severity="danger"
          onClick={() => {
            void options?.accept?.();
            close();
          }}
        />
      </div>
    </Popover>
  );
};
