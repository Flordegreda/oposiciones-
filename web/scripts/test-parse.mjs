import { readFileSync } from "fs";
import { parseImportText } from "../src/lib/parse-import-text.ts";

const sample = readFileSync(new URL("./sample-ebep.txt", import.meta.url), "utf8");
const qs = parseImportText(sample);
console.log("count", qs.length);
console.log("first", qs[0]?.enunciado?.slice(0, 60));
console.log("second", qs[1]?.enunciado?.slice(0, 60));
if (qs.length < 2) process.exit(1);
