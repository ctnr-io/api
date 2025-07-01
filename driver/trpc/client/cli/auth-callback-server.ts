import { html } from "@tmpl/core";

/**
 * Start local HTTP server to handle OAuth callback
 */
export function startCallbackServer(): {
  port: number;
  server: Deno.HttpServer;
  promise: Promise<{ code: string; }>;
} {
  // Find available port starting from 8080
  const { resolve, reject, promise } = Promise.withResolvers<{ code: string; }>();

  const timeout = setTimeout(() => {
    reject(new Error("OAuth callback timeout (5 minutes)"));
  }, 5 * 60 * 1000); // 5 minute timeout

  let server: Deno.HttpServer;
  server = Deno.serve({ port: 0, hostname: "127.0.0.1" }, (request) => {

    const url = new URL(request.url);

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        clearTimeout(timeout);
        reject(new Error(`OAuth error: ${error}`));
        return new Response(
          html`
            <html>
              <body>
                <h1>Authentication Failed</h1>
                <p>Error: ${error}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `,
          { headers: { "content-type": "text/html" } },
        );
      }

      if (code) {
        clearTimeout(timeout);
        resolve({ code });
        return new Response(
          html`
            <html>
              <body>
                <h1>Authentication Successful!</h1>
                <p>You can close this window and return to your terminal.</p>
                <script>
                window.close();
                </script>
              </body>
            </html>
          `,
          { headers: { "content-type": "text/html" } },
        );
      }
    }

    return new Response(
      html`
        <html>
          <body>
            <h1>ctnr CLI Authentication</h1>
            <p>Waiting for authentication...</p>
          </body>
        </html>
      `,
      { headers: { "content-type": "text/html" } },
    );
  });

  let port: number;
  if (server.addr.transport === "tcp") {
    port = server.addr.port;
  } else {
    throw new Error("Unexpected server transport: " + server.addr.transport);
  }

  console.log(`🔗 Listening for OAuth callback on http://localhost:${port}/callback`);

  return { port, server, promise };
}

/**
 * Open URL in default browser
 */
export async function openBrowser(url: string): Promise<void> {
  const commands = {
    darwin: ["open"],
    linux: ["xdg-open"],
    windows: ["cmd", "/c", "start"],
  };

  const command = commands[Deno.build.os as keyof typeof commands];
  if (!command) {
    throw new Error(`Unsupported platform: ${Deno.build.os}`);
  }

  try {
    const process = new Deno.Command(command[0], {
      args: command.length > 1 ? [...command.slice(1), url] : [url],
      stdout: "null",
      stderr: "null",
    });

    await process.output();
  } catch (error) {
    throw new Error(`Failed to open browser: ${error instanceof Error ? error.message : String(error)}`);
  }
}