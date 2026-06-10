import React from 'react';
import { useTheme } from './ThemeProvider.jsx';
import { darkBgGradient, meshConicStops, meshOrbs, PP } from './petpals-tokens.js';

/**
 * Pixel-match of iOS `PetPalsAmbientBackground`:
 * - Dark: ONLY `darkBackgroundGradient` (no orbs, no mesh sweep)
 * - Light: flat #F0F4F8 page background (clean SaaS look, no animated orbs)
 */
export default function MeshBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (isDark) {
    return (
      <div
        className="pp-mesh pp-mesh--dark"
        aria-hidden
        style={{ background: '#0F172A' }}
      />
    );
  }

  // Light mode: flat background, no mesh orbs
  return (
    <div
      className="pp-mesh pp-mesh--light"
      aria-hidden
      style={{ background: '#F0F4F8' }}
    />
  );
}

