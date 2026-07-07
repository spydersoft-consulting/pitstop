import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface PageTitleContextValue {
  title: string | null;
  setTitle: (title: string | null) => void;
}

const PageTitleContext = createContext<PageTitleContextValue>({
  title: null,
  setTitle: () => {},
});

export const PageTitleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [title, setTitle] = useState<string | null>(null);
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
};

export const usePageTitle = (): string | null => useContext(PageTitleContext).title;

export const useSetPageTitle = (title: string | null | undefined): void => {
  const { setTitle } = useContext(PageTitleContext);
  useEffect(() => {
    setTitle(title ?? null);
  }, [title, setTitle]);
};
