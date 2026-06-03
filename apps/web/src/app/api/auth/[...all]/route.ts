import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "../../../../platform/auth/server";

export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth);
