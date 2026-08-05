import { readFile } from "node:fs/promises";

const SECRET_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;
const TOP_LEVEL_KEYS = new Set(["secrets"]);
const SECRET_SHAPE_KEYS = new Set(["required", "pattern", "enum", "description"]);

export async function loadSchema(path) {
  const source = await readFile(path, "utf8");
  return parseSchema(source, path);
}

export function parseSchema(source, sourceName = "schema") {
  const { value: parsed, locations } = parseYamlSubset(source, sourceName);
  const secrets = parsed.secrets;

  if (!secrets || typeof secrets !== "object" || Array.isArray(secrets)) {
    throw new Error(`${sourceName}: expected top-level "secrets" map`);
  }

  rejectUnsupportedKeys(parsed, TOP_LEVEL_KEYS, [], locations, sourceName);

  const entries = Object.entries(secrets).map(([name, shape]) => {
    if (!SECRET_NAME_PATTERN.test(name)) {
      throw new Error(`${sourceName}: invalid secret name "${name}"`);
    }

    if (!shape || typeof shape !== "object" || Array.isArray(shape)) {
      throw new Error(`${sourceName}: secret "${name}" must be a map`);
    }

    rejectUnsupportedKeys(
      shape,
      SECRET_SHAPE_KEYS,
      ["secrets", name],
      locations,
      sourceName,
    );

    const normalized = {
      name,
      required: shape.required !== false,
      optional: shape.required === false,
      pattern: shape.pattern,
      enum: shape.enum,
      description: shape.description ?? "",
    };

    if (normalized.pattern !== undefined && typeof normalized.pattern !== "string") {
      throw new Error(`${sourceName}: "${name}.pattern" must be a string`);
    }

    if (normalized.pattern !== undefined) {
      try {
        normalized.compiledPattern = new RegExp(normalized.pattern);
      } catch (error) {
        throw new Error(
          `${sourceName}: invalid pattern for "${name}.pattern": ${error.message}`,
          { cause: error },
        );
      }
    }

    if (normalized.enum !== undefined) {
      if (!Array.isArray(normalized.enum) || normalized.enum.some((value) => typeof value !== "string")) {
        throw new Error(`${sourceName}: "${name}.enum" must be a string array`);
      }
    }

    if (typeof normalized.description !== "string") {
      throw new Error(`${sourceName}: "${name}.description" must be a string`);
    }

    if (shape.required !== undefined && typeof shape.required !== "boolean") {
      throw new Error(`${sourceName}: "${name}.required" must be true or false`);
    }

    return normalized;
  });

  return {
    secrets: Object.fromEntries(entries.map((secret) => [secret.name, secret])),
  };
}

function parseYamlSubset(source, sourceName) {
  const root = {};
  const stack = [{ indent: -1, value: root, path: [] }];
  const definitions = new WeakMap([[root, new Map()]]);
  const locations = new Map();
  const lines = source.split(/\r?\n/);

  for (const [index, rawLine] of lines.entries()) {
    const withoutComment = stripComment(rawLine);
    if (!withoutComment.trim()) {
      continue;
    }

    const indent = withoutComment.match(/^ */)[0].length;
    if (indent % 2 !== 0) {
      throw new Error("YAML indentation must use two-space steps");
    }

    const line = withoutComment.trim();
    const match = line.match(/^([^:]+):(.*)$/);
    if (!match) {
      throw new Error(`Unsupported YAML line: ${line}`);
    }

    const key = unquote(match[1].trim());
    const rawValue = match[2].trim();

    while (stack.at(-1).indent >= indent) {
      stack.pop();
    }

    const parent = stack.at(-1).value;
    if (!parent || typeof parent !== "object" || Array.isArray(parent)) {
      throw new Error(`Cannot assign "${key}" under a scalar value`);
    }

    const lineNumber = index + 1;
    const parentDefinitions = definitions.get(parent);
    if (parentDefinitions.has(key)) {
      const keyPath = [...stack.at(-1).path, key].join(".");
      throw new Error(
        `${sourceName}:${lineNumber}: duplicate key "${keyPath}" (first defined at line ${parentDefinitions.get(key)})`,
      );
    }
    parentDefinitions.set(key, lineNumber);
    locations.set([...stack.at(-1).path, key].join("."), lineNumber);

    if (rawValue === "") {
      const child = {};
      parent[key] = child;
      definitions.set(child, new Map());
      stack.push({ indent, value: child, path: [...stack.at(-1).path, key] });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }

  return { value: root, locations };
}

function rejectUnsupportedKeys(value, supportedKeys, parentPath, locations, sourceName) {
  for (const key of Object.keys(value)) {
    if (!supportedKeys.has(key)) {
      const keyPath = [...parentPath, key].join(".");
      throw new Error(`${sourceName}:${locations.get(keyPath)}: unsupported key "${keyPath}"`);
    }
  }
}

function parseScalar(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "[]") return [];
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return splitInlineList(inner).map((item) => unquote(item.trim()));
  }
  return unquote(value);
}

function splitInlineList(value) {
  const items = [];
  let current = "";
  let quote = null;

  for (const char of value) {
    if ((char === "\"" || char === "'") && quote === null) {
      quote = char;
    } else if (char === quote) {
      quote = null;
    }

    if (char === "," && quote === null) {
      items.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  items.push(current);
  return items;
}

function stripComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === "\"" || char === "'") && quote === null) {
      quote = char;
    } else if (char === quote) {
      quote = null;
    } else if (char === "#" && quote === null) {
      return line.slice(0, index);
    }
  }
  return line;
}

function unquote(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
