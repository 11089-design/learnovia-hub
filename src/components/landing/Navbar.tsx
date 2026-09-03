import { SiteHeader } from "@/components/SiteHeader";

/** Public pages use the same header as the app so navigation never changes shape. */
export function Navbar() {
  return <SiteHeader variant="public" />;
}
