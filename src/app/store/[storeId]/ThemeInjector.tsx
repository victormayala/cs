"use client";

import { useMemo } from 'react';

function hexToHsl(hex: string | undefined): string | null {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;

  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

interface ThemeInjectorProps {
    primaryColor?: string;
    secondaryColor?: string;
}

export default function ThemeInjector({ primaryColor, secondaryColor }: ThemeInjectorProps) {
    const primaryHsl = useMemo(() => hexToHsl(primaryColor), [primaryColor]);
    const secondaryHsl = useMemo(() => hexToHsl(secondaryColor), [secondaryColor]);

    return (
        <style jsx global>{`
            :root {
            ${primaryHsl ? `--primary: ${primaryHsl};` : ''}
            ${secondaryHsl ? `--secondary: ${secondaryHsl};` : ''}
            ${secondaryHsl ? `--accent: ${secondaryHsl};` : ''}
            }
        `}</style>
    );
}
