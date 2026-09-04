import { cpSync, rmSync } from "node:fs";

const output = new URL("../dist/", import.meta.url);
rmSync(output, { recursive: true, force: true });
cpSync(new URL("../public/", import.meta.url), output, { recursive: true });
for (const name of ["LICENSE", "THIRD_PARTY_NOTICES.md"]) {
  cpSync(new URL(`../${name}`, import.meta.url), new URL(name, output));
}
console.log("Static site copied to dist/. No bundling or compilation needed.");
