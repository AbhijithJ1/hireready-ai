"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface ScatterLinkProps {
  href: string;
  label: string;
  active?: boolean;
}

interface LetterOffset {
  x: number;
  y: number;
  r: number;
}

export function ScatterLink({ href, label, active = false }: ScatterLinkProps) {
  const [offsets, setOffsets] = useState<LetterOffset[]>(() =>
    label.split("").map(() => ({ x: 0, y: 0, r: 0 }))
  );
  const [isScattered, setIsScattered] = useState(false);
  const mountedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>(null);
  const router = useRouter();

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOffsets(
      label.split("").map(() => ({
        x: (Math.random() - 0.5) * 24,
        y: (Math.random() - 0.5) * 24,
        r: (Math.random() - 0.5) * 40,
      }))
    );
    setIsScattered(true);

    timeoutRef.current = setTimeout(() => {
      setIsScattered(false);
    }, 300);
  }, [label]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsScattered(false);
  }, []);

  const handleClick = useCallback(() => {
    router.push(href);
  }, [router, href]);

  return (
    <button
      id="scatter-btn"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-colors inline-block bg-transparent border-none cursor-pointer p-0 ${active ? "text-black" : "text-white"}`}
    >
      <span id="scatter-chars" className="inline-flex">
        {label.split("").map((char, i) => (
          <span
            id={`scatter-char-${i}`}
            key={i}
            className="inline-block"
            style={{
              transform: isScattered
                ? `translate(${offsets[i].x}px, ${offsets[i].y}px) rotate(${offsets[i].r}deg) scale(1.1)`
                : "translate(0, 0) rotate(0deg) scale(1)",
              transition: mountedRef.current
                ? `transform ${isScattered ? "250ms" : "200ms"} ${isScattered ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "cubic-bezier(0.25, 0.46, 0.45, 0.94)"} ${isScattered ? `${i * 15}ms` : "0ms"}`
                : "none",
            }}
          >
            {char}
          </span>
        ))}
      </span>
    </button>
  );
}
