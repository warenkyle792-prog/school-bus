import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Safiri · School Bus Tracking",
  description:
    "Live school bus tracking, boarding confirmation and parent alerts for Riverside Academy, Nairobi.",
};

export const viewport: Viewport = {
  themeColor: "#10150e",
  width: "device-width",
  initialScale: 1,
};

/**
 * Re-applies the saved palette before first paint so a chosen background never
 * flashes the default on reload or navigation. Mirrors applyPalette() in
 * components/ThemePicker.tsx — keep the two in sync.
 */
const themeBootScript = `
(function () {
  try {
    var raw = localStorage.getItem('safiri.palette');
    if (!raw) return;
    var p = JSON.parse(raw);
    if (!p || !p.paper) return;

    function rgb(h){h=h.replace('#','');if(h.length!==6)return null;var v=parseInt(h,16);return [(v>>16)&255,(v>>8)&255,v&255];}
    function hex(c){return '#'+c.map(function(n){n=Math.max(0,Math.min(255,Math.round(n)));return ('0'+n.toString(16)).slice(-2);}).join('');}
    function mix(a,b,t){var x=rgb(a),y=rgb(b);if(!x||!y)return a;return hex([x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t]);}
    function lum(h){var c=rgb(h);if(!c)return 0;var v=c.map(function(n){n/=255;return n<=0.03928?n/12.92:Math.pow((n+0.055)/1.055,2.4);});return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];}

    var dark = typeof p.dark === 'boolean' ? p.dark : lum(p.paper) < 0.42;
    var s = document.documentElement.style;
    s.setProperty('--color-paper', p.paper);
    s.setProperty('--color-paper-2', p.paper2);
    s.setProperty('--color-line', p.line);
    s.setProperty('--color-canvas', dark ? mix(p.paper,'#000000',0.45) : mix(p.paper,'#000000',0.06));
    s.setProperty('--color-paper-3', mix(p.paper,'#ffffff', dark ? 0.11 : 0.5));
    s.setProperty('--color-brand-600','#c9f27a');
    s.setProperty('--color-brand-700', dark ? '#d2f888' : '#b2e75c');
    s.setProperty('--color-brand-100', dark ? '#28331c' : '#eafcd0');
    s.setProperty('--color-brand-200', dark ? '#3a4d26' : '#d9f6ac');

    var steps = dark
      ? ['0.045','0.085','0.14','0.22','0.34','0.47','0.6','0.74','0.88','0.96']
      : ['','','','','','','','','',''];
    var lightInk = ['#f4f8f6','#eaf1ee','#d7e3dd','#b6c9c1','#8aa79b','#5d7d70','#3c5f52','#22453a','#172e26','#10201b'];
    var keys = ['50','100','200','300','400','500','600','700','800','900'];
    for (var i = 0; i < keys.length; i++) {
      s.setProperty('--color-ink-' + keys[i], dark ? mix(p.paper, '#ffffff', Number(steps[i])) : lightInk[i]);
    }

    document.documentElement.dataset.palette = p.id || 'custom';
    document.documentElement.dataset.scheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scheme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
