import { define } from "../../../utils.ts";
import { PUBLIC_MODE } from "../../../lib/config.ts";
import { getRequestStats } from "../../../lib/request-stats.ts";

export const handler = define.handlers({
  GET() {
    if (PUBLIC_MODE) {
      return Response.json({
        error: "redacted",
        message: "Not available in public mode",
      }, { status: 403 });
    }
    return Response.json(getRequestStats());
  },
});
