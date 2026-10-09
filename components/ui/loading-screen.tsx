"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const pathname = usePathname();
  const initialLoadDone = useRef(false);

  // Handle initial page load
  useEffect(() => {
    const timer = setTimeout(() => {
      const hide = () => {
        setVisible(false);
        initialLoadDone.current = true;
        window.removeEventListener("load", hide);
      };
      if (document.readyState === "complete") {
        hide();
      } else {
        window.addEventListener("load", hide);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Handle route changes
  useEffect(() => {
    if (!initialLoadDone.current) return;
    setRouteLoading(true);
    const timer = setTimeout(() => {
      setRouteLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!visible && !routeLoading) return null;

  return (
    <div
      id="loading-screen"
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-500"
      style={{ opacity: visible ? 1 : undefined }}
    >
      <p className="loader"><span>Loading</span></p>
    </div>
  );
}
