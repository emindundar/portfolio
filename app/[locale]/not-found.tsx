import { NotFoundView } from "@/components/layout/NotFoundView";

// For notFound() called inside a locale page. Unknown URLs never get here: they match no route (or a param that
// `unstable_paramMatching` closes) and are answered by app/global-not-found.tsx, which renders the same view.
export default function NotFound() {
  return <NotFoundView />;
}
