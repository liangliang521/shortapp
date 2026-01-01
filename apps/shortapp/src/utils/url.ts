const HTTPS_HOSTS = ['exp.host', 'u.expo.dev', 'exp.direct', 'expo.dev'];

/**
 * Normalize exp/expo/exps schemes to http/https so native fetch can load bundles.
 * - exp:// / expo:// => http://
 * - exps://         => https://
 * - known hosts     => force https
 * - no protocol     => default http
 */
export function normalizeExpUrlToHttp(rawUrl: string): string {
  if (!rawUrl) throw new Error('bundleUrl is required');
  let urlStr = rawUrl.trim();
  const lower = urlStr.toLowerCase();

  // Handle schemes without assuming URL parser support
  if (lower.startsWith('exp://')) {
    urlStr = 'http://' + urlStr.slice(6);
  } else if (lower.startsWith('expo://')) {
    urlStr = 'http://' + urlStr.slice(7);
  } else if (lower.startsWith('exps://')) {
    urlStr = 'https://' + urlStr.slice(7);
  } else if (lower.startsWith('exp:')) {
    urlStr = 'http://' + urlStr.slice(4);
  } else if (lower.startsWith('expo:')) {
    urlStr = 'http://' + urlStr.slice(5);
  } else if (lower.startsWith('exps:')) {
    urlStr = 'https://' + urlStr.slice(5);
  }

  // If still no protocol, default to http
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(urlStr)) {
    urlStr = 'http://' + urlStr;
  }

  // Force https for known hosts
  try {
    const u = new URL(urlStr);
    if (u.host && HTTPS_HOSTS.some((h) => u.host.endsWith(h))) {
      u.protocol = 'https:';
    }
    return u.toString();
  } catch {
    return urlStr;
  }
}

