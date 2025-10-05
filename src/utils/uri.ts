export type PageUriKind = "selector" | "xpath" | "unknown";

export function getPageUriKind(uri: string): PageUriKind {
  if (uri.startsWith("page://selector/")) {
    return "selector";
  }
  if (uri.startsWith("page://xpath/")) {
    return "xpath";
  }
  return "unknown";
}

export function extractSelector(uri: string): string | undefined {
  if (getPageUriKind(uri) !== "selector") {
    return undefined;
  }
  return decodeURIComponent(uri.replace("page://selector/", ""));
}

export function extractXPath(uri: string): string | undefined {
  if (getPageUriKind(uri) !== "xpath") {
    return undefined;
  }
  return decodeURIComponent(uri.replace("page://xpath/", ""));
}
