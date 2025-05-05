import * as Bun from "bun";
import { fetchBurnBanData, type BurnBanData } from "./burn-bans";
import { SimpleCache } from "./simple-cache";
import { Time } from "./time";

const cache = new SimpleCache<BurnBanData[]>("burn-bans", 8 * Time.Hour);

interface ResponseOptions {
  servedFromCache: boolean;
  status: number;
}

function response(message: unknown, options: Partial<ResponseOptions> = {}) {
  const { servedFromCache = false, status = 200 } = options;

  return new Response(JSON.stringify(message), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Cache": servedFromCache ? "HIT" : "MISS",
    },
  });
}

async function fetchBurnBanDataOnce(): Promise<
  [BurnBanData[], HitCache: boolean]
> {
  const cachedData = await cache.get();

  if (cachedData) {
    return [cachedData, true];
  }

  const burnBanData = await fetchBurnBanData();
  await cache.set(burnBanData);

  return [burnBanData, false];
}

const server = Bun.serve({
  routes: {
    "/api/burn-bans": async () => {
      const [burnBanData, servedFromCache] = await fetchBurnBanDataOnce();
      return response(burnBanData, { servedFromCache });
    },

    "/api/burn-bans/:county": async (request) => {
      const [burnBanData, servedFromCache] = await fetchBurnBanDataOnce();

      const county = request.params.county.toLowerCase();

      const countyBurnBanData = burnBanData.find(
        (data) => data.counties.toLowerCase() === county
      );

      if (!countyBurnBanData) {
        return response("No burn ban data found for that county", {
          status: 404,
        });
      }

      return response(countyBurnBanData, { servedFromCache });
    },
  },
});

console.log(`🔥 Running at ${server.url}`);
