import { createGatewayServer } from "../gateway/server.js";
import { gerr, glog } from "../gateway/proxy.js";

// Internal entry point spawned as a detached background process by `rcodex`.
// Not intended for direct user invocation.
export async function runGatewayDaemon(): Promise<void> {
  const server = createGatewayServer();
  let shuttingDown = false;

  try {
    await server.start();
  } catch (err) {
    gerr(`[gateway] lifecycle: daemon failed to start: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    glog(`[gateway] lifecycle: received ${signal}, shutting down pid=${process.pid}`);
    try {
      await server.stop();
      glog(`[gateway] lifecycle: graceful shutdown complete pid=${process.pid}`);
      process.exit(0);
    } catch (err) {
      gerr(`[gateway] lifecycle: shutdown failed pid=${process.pid}: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("uncaughtException", (err) => {
    gerr(`[gateway] lifecycle: uncaughtException pid=${process.pid}: ${err.stack ?? err.message}`);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    const msg = reason instanceof Error ? (reason.stack ?? reason.message) : String(reason);
    gerr(`[gateway] lifecycle: unhandledRejection pid=${process.pid}: ${msg}`);
    process.exit(1);
  });
  process.on("exit", (code) => {
    glog(`[gateway] lifecycle: process exit pid=${process.pid} code=${code}`);
  });

  // Keep the process alive.
  setInterval(() => {}, 1000);
}
