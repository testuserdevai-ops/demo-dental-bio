// PreviewContext.tsx
"use client";
import React, { createContext, useContext, useState } from "react";

interface PreviewContextProps {
  reloadKey: number;
  triggerReload: () => void;
}

const PreviewContext = createContext<PreviewContextProps | undefined>(
  undefined,
);

export const PreviewProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [reloadKey, setReloadKey] = useState(0);

  const triggerReload = () => setReloadKey((prev) => prev + 1);

  return (
    <PreviewContext.Provider value={{ reloadKey, triggerReload }}>
      {children}
    </PreviewContext.Provider>
  );
};

export const usePreview = () => {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error("usePreview must be used within a PreviewProvider");
  }
  return context;
};
