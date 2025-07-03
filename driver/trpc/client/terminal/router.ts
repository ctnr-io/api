import * as Run from "api/core/run.ts";
import * as List from "api/core/list.ts";
import * as Attach from "api/core/attach.ts";
import { initTRPC } from "@trpc/server";
import { ClientTerminalContext } from "./context.ts";
import * as Login from "../../../../api/auth/login-pkce.ts";
import * as Logout from "api/auth/logout.ts";

export const trpc = initTRPC.context<ClientTerminalContext>().create();

export const cliRouter = trpc.router({
  // Client authentication procedures
  login: trpc.procedure.mutation(({ ctx }) => Login.default(ctx)()),
  logout: trpc.procedure.mutation(({ ctx }) => Logout.default(ctx)()),

  // Core procedures
  run: trpc.procedure.meta(Run.Meta).input(Run.Input).mutation(({ input, signal, ctx }) =>
    ctx.lazy(
      { authenticate: true },
      ({ server }) =>
        server.core.run.mutate(input, {
          signal,
        }),
    )
  ),
  list: trpc.procedure.meta(List.Meta).input(List.Input).mutation(({ input, signal, ctx }) =>
    ctx.lazy(
      { authenticate: true },
      ({ server }) =>
        server.core.list.mutate(input, {
          signal,
        }),
    )
  ),
  attach: trpc.procedure.meta(Attach.Meta).input(Attach.Input).mutation(({ input, signal, ctx }) =>
    ctx.lazy(
      { authenticate: true },
      ({ server }) =>
        server.core.attach.mutate(input, {
          signal,
        }),
    )
  ),
});

export type CliRouter = typeof cliRouter;
