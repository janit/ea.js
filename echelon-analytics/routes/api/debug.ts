import { define } from "../../utils.ts";
import { DEBUG } from "../../lib/config.ts";
import { isDebugEnabled, setRuntimeDebug } from "../../lib/debug.ts";

export const handler = define.handlers({
  GET(_ctx) {
    return Response.json({
      debug: isDebugEnabled(),
      envOverride: DEBUG,
    });
  },

  async POST(ctx) {
    if (DEBUG) {
      return Response.json(
        { error: "Debug is locked by ECHELON_DEBUG env variable" },
        { status: 409 },
      );
    }

    const body = await ctx.req.json();
    if (typeof body.enabled !== "boolean") {
      return Response.json(
        { error: "Missing boolean 'enabled' field" },
        { status: 400 },
      );
    }

    setRuntimeDebug(body.enabled ? true : null);
    return Response.json({ debug: isDebugEnabled() });
  },
});
