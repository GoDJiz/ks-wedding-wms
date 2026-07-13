import "server-only";
import path from "path";
import { Font } from "@react-pdf/renderer";

let registered = false;

/**
 * Registers the bundled Sarabun font (Thai + Latin script support, OFL
 * license — see public/fonts/SARABUN-LICENSE.txt) with react-pdf.
 * Deliberately read from public/, not src/assets/: Vercel's serverless
 * function file-tracing reliably includes everything under public/, but
 * arbitrary files under src/ read via runtime fs calls (not a static
 * `import`) aren't guaranteed to survive that tracing — this would have
 * worked in local dev and silently failed to find the font file once
 * actually deployed. Caught by thinking through deployment, not by a
 * local test (both paths work identically in the dev sandbox).
 *
 * IMPORTANT: uses the .woff files, not .woff2. Verified by direct testing
 * (render a real multi-row Thai report, not just a short string) that
 * react-pdf's font engine (fontkit) throws
 * "RangeError: Offset is outside the bounds of the DataView" partway
 * through glyph subsetting when embedding this font's .woff2 variant once
 * enough distinct glyphs are used — a short test string can pass while a
 * full report with 14 category names fails. The .woff variant of the same
 * font renders correctly at full report scale. Do not switch back to
 * .woff2 without re-verifying against a real multi-row render first.
 *
 * Idempotent: react-pdf's Font.register doesn't need to be called more
 * than once per process, and calling it repeatedly across concurrent
 * requests in the same serverless instance is wasted work.
 */
export function registerReportFonts() {
  if (registered) return;

  const fontDir = path.join(process.cwd(), "public", "fonts");

  Font.register({
    family: "Sarabun",
    fonts: [
      {
        src: path.join(fontDir, "sarabun-thai-400-normal.woff"),
        fontWeight: 400,
      },
      {
        src: path.join(fontDir, "sarabun-thai-700-normal.woff"),
        fontWeight: 700,
      },
    ],
  });

  registered = true;
}
