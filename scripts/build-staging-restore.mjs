import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const [inputPath, outputPath] = process.argv.slice(2);
const databaseUrl = process.env.STAGING_DATABASE_URL;

if (!inputPath || !outputPath || !databaseUrl) {
  throw new Error(
    "Usage: STAGING_DATABASE_URL=... node scripts/build-staging-restore.mjs input.sql output.sql",
  );
}

if (
  !databaseUrl.includes("pcbakmokevyrpiqvbzni") ||
  databaseUrl.includes("cxqkuqtwrtgvoorxidvn")
) {
  throw new Error("Refusing to inspect a database other than staging");
}

const rows = execFileSync(
  "psql",
  [
    databaseUrl,
    "-At",
    "-F",
    "|",
    "-c",
    `select table_schema, table_name, column_name
       from information_schema.columns
      where table_schema in ('auth', 'public', 'storage', 'supabase_functions')
      order by table_schema, table_name, ordinal_position`,
  ],
  { encoding: "utf8" },
);

const targetColumns = new Map();
for (const row of rows.trim().split("\n")) {
  if (!row) continue;
  const [schema, table, column] = row.split("|");
  const key = `${schema}.${table}`;
  const columns = targetColumns.get(key) ?? new Set();
  columns.add(column);
  targetColumns.set(key, columns);
}

const sequences = new Set(
  execFileSync(
    "psql",
    [
      databaseUrl,
      "-At",
      "-c",
      `select sequence_schema || '.' || sequence_name
         from information_schema.sequences`,
    ],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean),
);

const excluded = new Set(["storage.objects", "supabase_functions.hooks"]);
const lines = readFileSync(inputPath, "utf8").split("\n");
const output = [];
const report = [];

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index];
  const sequenceMatch = line.match(
    /^SELECT pg_catalog\.setval\('\"([^\"]+)\"\.\"([^\"]+)\"'/,
  );
  if (sequenceMatch) {
    const sequence = `${sequenceMatch[1]}.${sequenceMatch[2]}`;
    if (!sequences.has(sequence)) {
      report.push(`${sequence}: excluded sequence reset`);
      continue;
    }
  }
  const match = line.match(/^COPY "([^"]+)"\."([^"]+)" \((.+)\) FROM stdin;$/);
  if (!match) {
    output.push(line);
    continue;
  }

  const [, schema, table, rawColumns] = match;
  const key = `${schema}.${table}`;
  const sourceColumns = [...rawColumns.matchAll(/"([^"]+)"/g)].map(
    ([, column]) => column,
  );
  const available = targetColumns.get(key);
  const keptIndexes = available
    ? sourceColumns.flatMap((column, columnIndex) =>
        available.has(column) ? [columnIndex] : [],
      )
    : [];
  const removed = sourceColumns.filter(
    (_, columnIndex) => !keptIndexes.includes(columnIndex),
  );
  const skip = excluded.has(key) || !available || keptIndexes.length === 0;

  if (skip) {
    report.push(`${key}: excluded`);
  } else {
    output.push(
      `COPY "${schema}"."${table}" (${keptIndexes
        .map((columnIndex) => `"${sourceColumns[columnIndex]}"`)
        .join(", ")}) FROM stdin;`,
    );
    if (removed.length) report.push(`${key}: removed ${removed.join(", ")}`);
  }

  for (index += 1; index < lines.length; index += 1) {
    const dataLine = lines[index];
    if (dataLine === "\\.") {
      if (!skip) output.push(dataLine);
      break;
    }
    if (!skip) {
      const fields = dataLine.split("\t");
      output.push(
        keptIndexes.map((columnIndex) => fields[columnIndex]).join("\t"),
      );
    }
  }
}

writeFileSync(outputPath, output.join("\n"), { mode: 0o600 });
console.log(
  report.length ? report.join("\n") : "No compatibility changes required",
);
