import { getSupabaseClient  } from "lib/supabase.ts";
import type { AuthClientContext } from "../mod.ts";
import { authStorage } from "driver/trpc/client/terminal/storage.ts";

export async function createAuthClientContext(): Promise<AuthClientContext> {
  const supabase = getSupabaseClient({
    storage: authStorage,
  });
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Failed to set session with provided tokens");
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Failed to retrieve user from session");
    }
    return {
      auth: {
        client: supabase.auth,
        session,
        user,
      },
    };
  } catch {
    return {
      auth: {
        client: supabase.auth,
        session: null,
        user: null,
      },
    }
	}
}
