import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getBasePath } from "@/lib/base-path";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Magic Frame",
    template: "%s · Magic Frame",
  },
  description:
    "Magic Frame – smart-display dashboard for tablets and TVs with Home Assistant, weather and calendar widgets.",
  applicationName: "Magic Frame",
  appleWebApp: {
    capable: true,
    title: "Magic Frame",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

/**
 * Nur im Home-Assistant-Add-on: ein winziges Skript, das window.fetch und
 * EventSource einmalig umhüllt und absoluten App-Adressen den Ingress-Pfad
 * voranstellt.
 *
 * Warum umhüllen statt 121 Aufrufstellen anfassen: die Stellen sind über 35
 * Dateien verteilt, und die 122. entsteht beim nächsten Feature. Eine Regel,
 * die man beim Schreiben einhalten MUSS, wird irgendwann vergessen — eine
 * Hülle, die es von selbst tut, nicht. Next schreibt seine eigenen Adressen
 * (Seiten, Assets, RSC) bereits selbst um; hier geht es ausschliesslich um
 * unsere eigenen Aufrufe.
 *
 * Ohne Unterpfad wird das Skript GAR NICHT ausgeliefert — nicht leer, nicht
 * wirkungslos, sondern es steht nicht in der Seite. Eine normale Installation
 * bekommt exakt das HTML von vorher.
 */
function basePathBootstrap(base: string): string {
  return `
(function () {
  var B = ${JSON.stringify(base)};
  window.__MF_BASE__ = B;
  // Der Port, unter dem die Wandtablets die Ansichten erreichen. Im Rahmen
  // ist window.location der von Home Assistant — der hilft einem Tablet nicht.
  window.__MF_DIRECT_PORT__ = ${JSON.stringify(process.env.MAGIC_FRAME_PUBLIC_PORT || "8098")};
  function withBase(u) {
    if (typeof u !== "string") return u;
    if (u.charAt(0) !== "/" || u.charAt(1) === "/") return u;
    if (u === B || u.indexOf(B + "/") === 0 || u.indexOf(B + "?") === 0) return u;
    return B + u;
  }
  var of = window.fetch;
  window.fetch = function (input, init) {
    try {
      if (typeof input === "string") input = withBase(input);
      else if (input && typeof input.url === "string" && typeof Request !== "undefined" && input instanceof Request) {
        var n = withBase(input.url);
        if (n !== input.url) input = new Request(n, input);
      }
    } catch (e) { /* im Zweifel unverändert weiterreichen */ }
    return of.call(this, input, init);
  };
  if (typeof EventSource !== "undefined") {
    var OE = EventSource;
    function PatchedEventSource(url, cfg) { return new OE(withBase(url), cfg); }
    PatchedEventSource.prototype = OE.prototype;
    PatchedEventSource.CONNECTING = OE.CONNECTING;
    PatchedEventSource.OPEN = OE.OPEN;
    PatchedEventSource.CLOSED = OE.CLOSED;
    window.EventSource = PatchedEventSource;
  }
})();`;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const basePath = getBasePath();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {basePath ? (
          <script dangerouslySetInnerHTML={{ __html: basePathBootstrap(basePath) }} />
        ) : null}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;600;700&family=Open+Sans:wght@300;400;600;700&family=Oswald:wght@300;400;600;700&family=Roboto:wght@300;400;500;700&family=Cutive+Mono&family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
