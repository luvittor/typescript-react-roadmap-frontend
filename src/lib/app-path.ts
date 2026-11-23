const appRouteSegments = new Set(["board", "login", "register"]);

const getAppBasePath = (baseUrl: string, currentUrl: string) => {
  const currentPath = new URL(currentUrl).pathname.replace(/\/+$/, "") || "/";
  const segments = currentPath.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  if (lastSegment && appRouteSegments.has(lastSegment)) {
    return `/${segments.slice(0, -1).join("/")}` || "/";
  }

  return new URL(baseUrl, currentUrl).pathname.replace(/\/+$/, "") || "/";
};

export const getRouterBasename = (baseUrl: string, currentUrl: string) =>
  getAppBasePath(baseUrl, currentUrl);

export const getLoginPath = (baseUrl: string, currentUrl: string) => {
  const appBasePath = getAppBasePath(baseUrl, currentUrl);
  return `${appBasePath === "/" ? "" : appBasePath}/login`;
};
