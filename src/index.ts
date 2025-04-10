import * as Bun from "bun";
import { URLPattern } from "urlpattern-polyfill";
import { fetchBurnBanData, type BurnBanData } from "./burn-bans";
import { router, type Route } from "./router";
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

async function fetchBurnBanDataOnce(): Promise<[BurnBanData[], HitCache: boolean]> {
  const cachedData = await cache.get();

  if (cachedData) {
    return [cachedData, true];
  }

  const burnBanData = await fetchBurnBanData();
  await cache.set(burnBanData);

  return [burnBanData, false];
}

const routes: Route[] = [
  {
    pattern: new URLPattern({ pathname: "/api/burn-bans" }),
    async handler() {
      const [burnBanData, servedFromCache] = await fetchBurnBanDataOnce();
      return response(burnBanData, { servedFromCache });
    },
  },
  {
    pattern: new URLPattern({ pathname: "/api/burn-bans/:county" }),
    async handler(_request, params) {
      const [burnBanData, servedFromCache] = await fetchBurnBanDataOnce();

      const county = params.county;

      if (!county) {
        return response("A county must be provided", { status: 400 });
      }

      const countyBurnBanData = burnBanData.find(
        (data) => data.counties.toLowerCase() === county.toLowerCase()
      );

      if (!countyBurnBanData) {
        return response("No burn ban data found for that county", {
          status: 404,
        });
      }

      return response(countyBurnBanData, { servedFromCache });
    },
  },
];

const requestHandler = router(routes);

const server = Bun.serve({
  async fetch(request) {
    return requestHandler(request);
  },
});

console.log(`🔥 Running at ${server.url}`);
