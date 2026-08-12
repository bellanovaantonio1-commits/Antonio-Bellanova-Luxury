import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const envPath = (() => {
  try {
    const metaUrl = typeof import.meta !== "undefined" ? import.meta.url : "";
    if (metaUrl) {
      const __dirname = path.dirname(fileURLToPath(metaUrl));
      return path.resolve(__dirname, "../.env");
    }
  } catch {
    /* CJS bundle on Render — import.meta may be empty */
  }
  return path.resolve(process.cwd(), ".env");
})();

dotenv.config({ path: envPath });
