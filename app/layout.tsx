import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Safiri · School Bus Tracking",
  description:
    "Live school bus tracking, boarding confirmation and parent alerts for Riverside Academy, Nairobi.",
};

export const viewport: Viewport = {
  themeColor: "#0e7c5a",
  width: "device-width",
  initialScale: 1,
};

/**
 * Applies the saved background palette before first paint, so a chosen theme
 * never flashes the default on navigation or reload.
 */
const themeBootScript = `
(function () {
  try {
    var raw = localStorage.getItem('safiri.palette');
    if (!raw) return;
    var p = JSON.parse(raw);
    if (!p || !p.paper) return;
    var s = document.documentElement.style;
    s.setProperty('--color-paper', p.paper);
    s.setProperty('--color-paper-2', p.paper2);
    s.setProperty('--color-line', p.line);
    document.documentElement.dataset.palette = p.id || 'custom';
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
