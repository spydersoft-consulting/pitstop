import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dialog, Heading, Modal as AriaModal, ModalOverlay } from "react-aria-components";
import { Button } from "./Button";

interface ModalProps {
  open?: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open = true, onClose, header, footer, className, children }) => (
  <ModalOverlay
    isOpen={open}
    onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}
    isDismissable
    className="fixed inset-0 z-1100 flex items-end justify-center bg-black/40 sm:items-center"
  >
    <AriaModal
      className={[
        "flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-xl",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Dialog className="flex min-h-0 flex-1 flex-col outline-none">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          {header ? (
            <Heading slot="title" className="text-xl font-semibold text-content">
              {header}
            </Heading>
          ) : (
            <span />
          )}
          <Button
            variant="text"
            severity="secondary"
            size="sm"
            aria-label="Close"
            icon={<FontAwesomeIcon icon={faXmark} />}
            onClick={onClose}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">{children}</div>
        {footer && <div className="px-5 pt-3 pb-5">{footer}</div>}
      </Dialog>
    </AriaModal>
  </ModalOverlay>
);
