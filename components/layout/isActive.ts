/** Exact match for `/`, segment-prefix match for everything else (`/work/geotrack` activates `/work`). */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
