import "lib/utils.ts";
import { createCli } from "trpc-cli";
import { createRemoteCliContext } from "./context.ts";
import { cliRouter } from "./router.ts";
import { createAsyncGeneratorListener } from "lib/async-generator.ts";

try {
  const remoteCli = createCli({
    router: cliRouter,
    name: "ctnr",
    version: Deno.env.get("CTNR_VERSION"),
    description: "Ctnr Remote CLI",
    context: createRemoteCliContext({
      // Wait for the WebSocket connection to be established
      signal: undefined,
      stdio: {
        stdin: Deno.stdin.readable,
        stdout: Deno.stdout.writable,
        stderr: Deno.stderr.writable,
        exit: Deno.exit.bind(Deno),
        setRaw: Deno.stdin.setRaw.bind(Deno.stdin),
        signalChan: async function* () {
          if (!Deno.stdin.isTerminal()) {
            return;
          }
          // yield* createAsyncGeneratorListener(
          //   [
          //     "SIGINT",
          //     "SIGQUIT",
          //   ] as const,
          //   Deno.addSignalListener,
          //   Deno.removeSignalListener,
          //   (eventType) => eventType,
          // );
        },
        terminalSizeChan: async function* () {
          if (!Deno.stdin.isTerminal()) {
            return;
          }
          // Send the initial terminal size
          yield Deno.consoleSize();
          // Send terminal size updates
          yield* createAsyncGeneratorListener(
            ["SIGWINCH"],
            Deno.addSignalListener,
            Deno.removeSignalListener,
            Deno.consoleSize,
          );
        },
      },
      auth: {
        session: null,
      },
    }),
  });

  await remoteCli.run();
} catch (error) {
  console.error("An error occurred while running the remote CLI:", error instanceof Error ? error.message : error);
  Deno.exit(1);
}
