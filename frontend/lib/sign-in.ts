/** Keep return destinations on this site, including a property's #reviews anchor. */
export function signInReturnPath(value: unknown, siteUrl?: string): string {
  if (typeof value !== "string" || !value || /[\\\u0000-\u0020]/.test(value)) return "/";
  try {
    const origin = new URL(siteUrl ?? "http://localhost:3000").origin;
    const url = new URL(value, origin);
    if (url.origin !== origin || url.username || url.password) return "/";
    if (!value.startsWith("/") && !/^https?:\/\//.test(value)) return "/";

    // Do not return to an auth endpoint or another login page and create a loop.
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith("//") || pathname.includes("\\") ||
        /^\/(?:api\/)?auth(?:\/|$)/i.test(pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function signInErrorMessage(code: unknown): string | null {
  if (typeof code !== "string" || !code) return null;
  switch (code) {
    case "OAuthAccountNotLinked":
      return "Please use the Google account you originally used to join KEYRAK.";
    case "AccessDenied":
      return "Sign-in was not completed. Try again with your Google account, or contact support if you need help.";
    case "Configuration":
      return "Sign-in is temporarily unavailable. Please try again shortly or contact support.";
    case "SessionRequired":
      return "Please sign in to continue to your account.";
    default:
      return "We couldn’t complete your Google sign-in. Please try again.";
  }
}
