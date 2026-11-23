const appRouteSegments = new Set(["board", "login", "register"]);

const stripTrailingSlashes = (pathname: string) => {
  let end = pathname.length;

  while (end > 0 && pathname.charCodeAt(end - 1) === 47) {
    end -= 1;
  }

  return pathname.slice(0, end);
};

const getAppBasePath = (baseUrl: string, currentUrl: string) => {
  const currentPath = stripTrailingSlashes(new URL(currentUrl).pathname) || "/";
  const segments = currentPath.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  if (lastSegment && appRouteSegments.has(lastSegment)) {
    const routeBaseSegments = segments.slice(0, -1);
    return routeBaseSegments.length === 0 ? "/" : `/${routeBaseSegments.join("/")}`;
  }

  return stripTrailingSlashes(new URL(baseUrl, currentUrl).pathname) || "/";
};

export const getRouterBasename = (baseUrl: string, currentUrl: string) =>
  getAppBasePath(baseUrl, currentUrl);

export const getLoginPath = (baseUrl: string, currentUrl: string) => {
  const appBasePath = getAppBasePath(baseUrl, currentUrl);
  return `${appBasePath === "/" ? "" : appBasePath}/login`;
};
