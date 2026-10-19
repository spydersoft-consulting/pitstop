export interface ConfirmPopupOptions {
  target: HTMLElement;
  message: string;
  accept?: () => void | Promise<void>;
  reject?: () => void;
  acceptLabel?: string;
  rejectLabel?: string;
}

let current: ConfirmPopupOptions | null = null;
const listeners = new Set<() => void>();

export const setCurrent = (next: ConfirmPopupOptions | null) => {
  current = next;
  listeners.forEach((l) => l());
};

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getSnapshot = () => current;

export const confirmPopup = (options: ConfirmPopupOptions) => setCurrent(options);
