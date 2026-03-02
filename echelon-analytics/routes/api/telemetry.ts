import { define } from "../../utils.ts";
import { TELEMETRY_OVERRIDE } from "../../lib/config.ts";
import { getTelemetryState, setTelemetryChoice } from "../../lib/telemetry.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const state = await getTelemetryState(ctx.state.db);
    return Response.json({
      telemetry: state,
      envOverride: TELEMETRY_OVERRIDE,
    });
  },

  async POST(ctx) {
    if (TELEMETRY_OVERRIDE !== null) {
      return Response.json(
        { error: "Telemetry is locked by ECHELON_TELEMETRY env variable" },
        { status: 409 },
      );
    }

    const body = await ctx.req.json();
    if (typeof body.optin !== "boolean") {
      return Response.json(
        { error: "Missing boolean 'optin' field" },
        { status: 400 },
      );
    }

    await setTelemetryChoice(ctx.state.db, body.optin);
    const state = await getTelemetryState(ctx.state.db);
    return Response.json({ telemetry: state });
  },
});
