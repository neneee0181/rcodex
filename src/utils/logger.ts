const HEADER = "[rcodex]";

export const logger = {
  header() {
    console.log(`\n${HEADER}`);
  },

  success(msg: string) {
    console.log(`[ok] ${msg}`);
  },

  warn(msg: string) {
    console.log(`[warn] ${msg}`);
  },

  error(msg: string) {
    console.error(`[error] ${msg}`);
  },

  info(msg: string) {
    console.log(`  ${msg}`);
  },

  done() {
    console.log("\nDone.");
  },

  separator() {
    console.log("-".repeat(50));
  },
};