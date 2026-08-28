import { writeFile } from "node:fs/promises";
import { loadSchema } from "./schema.js";

export async function writeDocs({ schemaPath, outPath }) {
  const schema = await loadSchema(schemaPath);
  const markdown = renderDocs(schema);
  await writeFile(outPath, markdown);
  return markdown;
}

export function renderDocs(schema) {
  const rows = Object.values(schema.secrets)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((secret) => {
      const requirement = secret.required ? "required" : "optional";
      const format = formatConstraint(secret);
      return `| \`${secret.name}\` | ${requirement} | ${format} | ${escapePipes(secret.description || "")} |`;
    });

  return [
    "# Secret Shape",
    "",
    "| Name | Required | Shape | Description |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

function formatConstraint(secret) {
  if (secret.enum) {
    return `one of: ${secret.enum.map(formatInlineCode).join(", ")}`;
  }
  if (secret.pattern) {
    return `pattern: \`${escapePipes(secret.pattern)}\``;
  }
  return "";
}

function formatInlineCode(value) {
  const escaped = escapePipes(value);
  const longestRun = Math.max(0, ...[...escaped.matchAll(/`+/g)].map(([run]) => run.length));
  const delimiter = "`".repeat(longestRun + 1);
  const padding = escaped.startsWith("`") || escaped.endsWith("`") ? " " : "";
  return `${delimiter}${padding}${escaped}${padding}${delimiter}`;
}

function escapePipes(value) {
  return value.replaceAll("|", "\\|");
}
