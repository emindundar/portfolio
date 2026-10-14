import { serializeLd, type Ld } from "@/lib/jsonld";

/** The only place that writes raw markup; the payload goes through serializeLd. */
export function JsonLd({ data }: { data: Ld | Ld[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeLd(data) }} />;
}
