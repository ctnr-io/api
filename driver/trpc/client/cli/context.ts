import { ClientContext } from "api/context.ts";
import { Buffer } from "node:buffer";
import { bypassWebSocketMessageHandler } from "lib/websocket.ts";
import { TRPCClient } from "@trpc/client";
import { performOAuthFlowOnce } from "./auth.ts";
import { ServerRouter } from "../../server/router.ts";
import { createTRPCWebSocketClient } from "../mod.ts";

export type RemoteCliContext = {
  lazy: <R>(
    callback: ({ client }: {
      client: TRPCClient<ServerRouter>;
    }) => Promise<R>,
  ) => Promise<R>;
};



export function createRemoteCliContext(
  opts: ClientContext,
): RemoteCliContext {
  return {
    lazy: async (callback) => {
      const client = await createTRPCWebSocketClient();
      const session = await performOAuthFlowOnce();
      opts.auth.session = session;
      await client.trpc.auth.setSession.mutate(session);

      opts.stdio.stdin.pipeTo(
        new WritableStream({
          write(chunk) {
            // Forward stdin data to the WebSocket as a JSON object
            client.websocket.connection?.ws.send(JSON.stringify({
              type: "stdin",
              data: Buffer.from(chunk).toString("utf-8"),
            }));
          },
          close() {
            console.log("Stdin stream closed, sending EOF to server.");
            // Send a message to the WebSocket to indicate that stdin has reached EOF (Ctrl+D)
            // Instead of closing the connection, we send a special message
            client.websocket.connection?.ws.send(JSON.stringify({
              type: "stdin-eof",
            }));
          },
        }),
      );

      bypassWebSocketMessageHandler(
        client.websocket.connection!.ws,
        (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === "stdout") {
              const stdoutWriter = opts.stdio.stdout.getWriter();
              stdoutWriter.write(new TextEncoder().encode(parsed.data));
              stdoutWriter.releaseLock();
              return true;
            }
            if (parsed.type === "stderr") {
              const stderrWriter = opts.stdio.stderr.getWriter();
              stderrWriter.write(new TextEncoder().encode(parsed.data));
              stderrWriter.releaseLock();
              return true;
            }
            if (parsed.type === "set-raw") {
              opts.stdio.setRaw(parsed.value);
              return true;
            }
            if (parsed.type === "exit-code") {
              // Handle exit code message from server
              // Exit the process with the received exit code
              opts.stdio.exit(parsed.code);
              return true;
            }
          } catch (e) {
          }
          return false;
        },
      );

      while (!client.websocket.connection?.state || client.websocket.connection?.state !== "open") {
        // Wait for the WebSocket connection to be established
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      (async () => {
        for await (const signal of opts.stdio.signalChan()) {
          client.websocket.connection?.ws.send(JSON.stringify({
            type: "signal",
            data: signal,
          }));
        }
      })();

      (async () => {
        for await (const terminalSize of opts.stdio.terminalSizeChan()) {
          client.websocket.connection?.ws.send(JSON.stringify({
            type: "terminal-size",
            data: terminalSize,
          }));
        }
      })();

      return callback({
        client: client.trpc,
      });
    },
  };
}
