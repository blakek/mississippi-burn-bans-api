import { URLPattern } from "urlpattern-polyfill";

export interface Route {
  pattern: URLPattern;
  handler: (
    request: Request,
    params: URLPatternComponentResult["groups"]
  ) => Promise<Response>;
}

/**
 * A simple router function that matches incoming requests to defined routes.
 */
export function router(routes: Route[]) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    for (const route of routes) {
      const match = route.pattern.exec(url);

      if (match) {
        return route.handler(request, match.pathname.groups || {});
      }
    }

    return new Response("Not Found", { status: 404 });
  };
}
