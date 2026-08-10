// NavbarContext.tsx
"use client";
import React, { createContext, useCallback, useContext, useState } from "react";

interface NavbarContextProps {
  navState: any;
  setNavItemState: (name: string, state: boolean) => void;
}

const NavbarContext = createContext<NavbarContextProps | undefined>(undefined);

export const NavbarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [navState, setNavState] = useState({
    Links: false,
    Blog: false,
    Gallery: false,
    Videos: false,
    Reviews: false,
    Shop: false,
    Location: false,
  });

  const setNavItemState = useCallback((name: string, state: boolean) => {
    setNavState((prev) =>
      prev[name as keyof typeof prev] === state
        ? prev
        : {
            ...prev,
            [name]: state,
          },
    );
  }, []);

  return (
    <NavbarContext.Provider value={{ navState, setNavItemState }}>
      {children}
    </NavbarContext.Provider>
  );
};

export const useNavbar = () => {
  const context = useContext(NavbarContext);
  if (!context) {
    throw new Error("useNavbar must be used within a NavbarProvider");
  }
  return context;
};
