export const GITHUB_USER = "emindundar";
export const GITHUB_URL = `https://github.com/${GITHUB_USER}`;
export const LINKEDIN_URL = "https://www.linkedin.com/in/emindundar";
export const REPO_URL = "https://github.com/emindundar/portfolio";
/** Public contact address (owner decision, 2026-10-09). The form recipient stays in `CONTACT_TO`. */
export const CONTACT_EMAIL = "emindundared0@gmail.com";

/**
 * Person `knowsAbout` after the facet labels: technologies from the projects' `stack` arrays, normalised and curated
 * (no techniques such as QR, JWT or rate limiting). lib/site.test.ts checks every entry against the stacks.
 */
export const KNOWS_ABOUT: readonly string[] = [
  "Flutter", "Riverpod", "TypeScript", "Node.js", "NestJS", "Next.js", "PostgreSQL", "Prisma", "Socket.IO",
  "Docker", "Firebase", "Python", "MCP", "Google Gemini API", "Cloudflare R2", "Web Audio API",
];
