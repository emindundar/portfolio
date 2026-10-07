import { defineConfig, defineCollection, s } from "velite";
import { projectMetaSchema } from "./content/schema";

const projectMeta = defineCollection({
  name: "ProjectMeta",
  pattern: "projects/*.meta.json",
  schema: projectMetaSchema,
});

const projectContent = defineCollection({
  name: "ProjectContent",
  pattern: "projects/*.{en,tr}.mdx",
  schema: s
    .object({
      title: s.string().min(1).max(120),
      summary: s.string().min(10).max(240),
      metrics: s.array(s.object({ label: s.string(), value: s.string() })).optional(),
      code: s.mdx(),
      path: s.path(),
    })
    .transform(({ path, ...rest }) => {
      const base = path.split("/").pop() ?? "";
      const [slug, locale] = base.split(".");
      if (!slug || (locale !== "en" && locale !== "tr")) {
        throw new Error(`bad content filename: ${path} (expected <slug>.<en|tr>.mdx)`);
      }
      return { ...rest, slug, locale: locale as "en" | "tr" };
    }),
});

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:6].[ext]",
    clean: true,
  },
  collections: { projectMeta, projectContent },
});
