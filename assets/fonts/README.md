# OG image fonts

Read at build time by `lib/og/fonts.ts` for `next/og` `ImageResponse` (which accepts only ttf/otf/woff). Not served; the site's own web fonts are the variable files in `public/fonts`.

| File | Source | Licence |
|---|---|---|
| `CabinetGrotesk-Extrabold.otf` | Owner's licensed Cabinet Grotesk kit (Fontshare, Indian Type Foundry), `Fonts/OTF/` | ITF Free Font License 2.0, `CabinetGrotesk-FFL.txt` (§01: use in digital images and self-hosting for own sites is permitted; §02 forbids making the font available to others, see the note below) |
| `JetBrainsMono-Regular.ttf` | Official `JetBrains/JetBrainsMono` release tag `v2.304` (`JetBrainsMono-2.304.zip`, 5 622 857 bytes, SHA-256 `6f6376c6ed2960ea8a963cd7387ec9d76e3f629125bc33d1fdcd7eb7012f7bbf`), path `fonts/ttf/` | SIL OFL 1.1, `JetBrainsMono-OFL.txt` |

SHA-256 of the files as committed:

- `CabinetGrotesk-Extrabold.otf`: `466230933dfcda58406cc3bbdb3e3fbb88c6218821681565cd888efc16b1b389` (unchanged copy of the kit file)
- `JetBrainsMono-Regular.ttf`: `a0bf60ef0f83c5ed4d7a75d45838548b1f6873372dfac88f71804491898d138f`

Name tables (platform 3): `CabinetGrotesk-Extrabold.otf` family "Cabinet Grotesk" (typographic family, ID 16), subfamily "Extrabold"; `JetBrainsMono-Regular.ttf` family "JetBrains Mono", subfamily "Regular". Both files are byte-for-byte copies; no subsetting or conversion (the FFL forbids both).

Note: this repository is public. The FFL §02 forbids distribution "through ... repository" or "publicly accessible servers"; the variable `public/fonts/CabinetGrotesk-Variable.woff2` has the same exposure. Owner decision whether to keep the Cabinet files in the public repository or move the repository/fonts to a private location.
