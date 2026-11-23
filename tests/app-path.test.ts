import { describe, expect, it } from "vitest";

import { getLoginPath, getRouterBasename } from "../src/lib/app-path";

describe("deployment paths", () => {
  it("resolves router routes and expired-session redirects from a relative base", () => {
    const baseUrl = "./";
    const currentUrl = "https://example.test/roadmap/board/";

    expect(getRouterBasename(baseUrl, currentUrl)).toBe("/roadmap");
    expect(getLoginPath(baseUrl, currentUrl)).toBe("/roadmap/login");
  });

  it("keeps root deployments on root paths", () => {
    const baseUrl = "./";
    const currentUrl = "http://localhost:5173/board";

    expect(getRouterBasename(baseUrl, currentUrl)).toBe("/");
    expect(getLoginPath(baseUrl, currentUrl)).toBe("/login");
  });
});
