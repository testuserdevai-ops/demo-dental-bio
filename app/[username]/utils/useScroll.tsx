// utils/useScroll.tsx
import { useEffect } from "react";

export const useScroll = (callback: () => void) => {
  useEffect(() => {
    window.addEventListener("scroll", callback);

    return () => {
      window.removeEventListener("scroll", callback);
    };
  }, [callback]);
};
