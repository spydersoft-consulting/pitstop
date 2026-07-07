type Handler = () => void;

let handler: Handler | null = null;

export const registerUnauthorizedHandler = (fn: Handler) => {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
};

export const notifyUnauthorized = () => {
  handler?.();
};
