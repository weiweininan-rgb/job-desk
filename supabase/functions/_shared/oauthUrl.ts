export function poolRedirectUrl(appUrl: string, status: string, message: string) {
  const destination = new URL(appUrl);
  if (!destination.pathname.endsWith('/')) destination.pathname += '/';
  destination.hash = '/pool';
  destination.searchParams.set('feishu', status);
  destination.searchParams.set('message', message);
  return destination.toString();
}
