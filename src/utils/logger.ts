const HEADER = "[rcodex]";

export const logger = {
  header() {
    console.log(`\n${HEADER}`);
  },

  success(msg: string) {
    console.log(`??${msg}`);
  },

  warn(msg: string) {
    console.log(`??${msg}`);
  },

  error(msg: string) {
    console.error(`??${msg}`);
  },

  info(msg: string) {
    console.log(`  ${msg}`);
  },

  done() {
    console.log("\nDone.");
  },

  separator() {
    console.log("?€".repeat(50));
  },
};
