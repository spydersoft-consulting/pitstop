import { Dialog, Modal, ModalOverlay } from "react-aria-components";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ open, onClose, className, children }) => (
  <ModalOverlay
    isOpen={open}
    onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}
    isDismissable
    className="fixed inset-0 z-1100 bg-black/40"
  >
    <Modal className={["h-full bg-surface p-4 shadow-xl overflow-y-auto", className].filter(Boolean).join(" ")}>
      <Dialog aria-label="Navigation" className="outline-none">
        {children}
      </Dialog>
    </Modal>
  </ModalOverlay>
);
