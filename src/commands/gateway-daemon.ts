import { createGatewayServer } from "../gateway/server.js";

// Internal entry point ??spawned as a detached background process by `rcodex` (no args).
// Not intended for direct user invocation.
export async function runGatewayDaemon(): Promise<void> {
  const server = createGatewayServer();

  try {
    await server.start();
  } catch (err) {
    process.stderr.write(`Gateway daemon failed to start: ${err}\n`);
    process.exit(1);
  }

  const shutdown = async () => {
    await server.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Keep the process alive
  setInterval(() => {}, 1000);
}
