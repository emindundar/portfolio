import { describe, it, expect } from "vitest";
import { caseLd, knowsAboutFrom, personLd, serializeLd, websiteLd } from "./jsonld";
import { SITE_URL } from "./seo";

const PERSON_ID = `${SITE_URL}/#person`;

describe("personLd", () => {
  const ld = personLd({ locale: "tr", jobTitle: "Yazılım Geliştirici", description: "D", knowsAbout: ["Flutter", "NestJS"] });
  it("describes the owner with a stable id and profile links", () => {
    expect(ld).toMatchObject({
      "@context": "https://schema.org", "@type": "Person", "@id": PERSON_ID, name: "Emin Dündar",
      url: `${SITE_URL}/tr`, jobTitle: "Yazılım Geliştirici", description: "D", knowsAbout: ["Flutter", "NestJS"],
    });
    expect(ld.sameAs).toEqual(["https://github.com/emindundar", "https://www.linkedin.com/in/emindundar"]);
  });
  it("publishes no e-mail, phone or street address", () => {
    expect(JSON.stringify(ld)).not.toMatch(/@gmail|telephone|streetAddress|email/i);
  });
});

describe("websiteLd", () => {
  it("links the site to the person and declares the language", () => {
    expect(websiteLd({ locale: "en", description: "D" })).toMatchObject({
      "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/en`, name: "Emin Dündar", inLanguage: "en", publisher: { "@id": PERSON_ID },
    });
  });
});

describe("caseLd", () => {
  const project = { slug: "geotrack", title: "GeoTrack", summary: "S", year: 2026, stack: ["Flutter", "NestJS"] };
  it("is a CreativeWork by the person, with keywords from the stack", () => {
    expect(caseLd({ locale: "tr", project, image: "/tr/work/geotrack/opengraph-image" })).toMatchObject({
      "@type": "CreativeWork", "@id": `${SITE_URL}/tr/work/geotrack#work`, url: `${SITE_URL}/tr/work/geotrack`,
      name: "GeoTrack", description: "S", inLanguage: "tr", dateCreated: "2026", keywords: "Flutter, NestJS",
      author: { "@id": PERSON_ID }, image: `${SITE_URL}/tr/work/geotrack/opengraph-image`,
    });
  });
  it("omits image when none is given", () => {
    expect(caseLd({ locale: "en", project })).not.toHaveProperty("image");
  });
});

describe("knowsAboutFrom", () => {
  it("puts facet labels first, de-duplicates by first appearance and caps", () => {
    expect(knowsAboutFrom(["Mobile", "Web"], [["Flutter", "Web"], ["Flutter", "NestJS"]])).toEqual(["Mobile", "Web", "Flutter", "NestJS"]);
    expect(knowsAboutFrom(["A"], [Array.from({ length: 50 }, (_, i) => `s${i}`)])).toHaveLength(30);
  });
});

describe("serializeLd", () => {
  it("cannot break out of the script element", () => {
    const raw = { name: "</script><script>alert(1)</script>", note: "a & b <!-- c --> \u2028\u2029" };
    const out = serializeLd(raw);
    expect(out).not.toContain("</script");
    expect(out).not.toContain("<!--");
    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(out)).toEqual(raw);
  });
  it("serializes an array as a JSON array", () => {
    expect(JSON.parse(serializeLd([{ a: 1 }, { b: 2 }]))).toEqual([{ a: 1 }, { b: 2 }]);
  });
});
