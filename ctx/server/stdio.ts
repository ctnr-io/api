import { ensureUserNamespace, getKubeClient } from "lib/kube-client.ts";
import { AuthContext, KubeContext, StdioContext } from "../mod.ts";

// This is dependent of the driver
export async function createStdioServerContext(config: StdioContext['stdio']): Promise<StdioContext> {
	return {
		stdio: config,
	}
}
