import { compileFromFile } from "json-schema-to-typescript";
import fs from "fs";
compileFromFile("jsonschema.json").then((ts) =>
    fs.writeFileSync("packages/functions/src/types.ts", ts)
);