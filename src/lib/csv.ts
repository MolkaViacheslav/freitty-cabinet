// Pure CSV serialization. Lives in lib/ (not in the route) so the escaping rules are unit-tested
// rather than eyeballed — CLAUDE.md: "anything that can be a pure function in src/lib/** should be".

/** Values Excel/Sheets would evaluate as a formula if they lead a cell. */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/** Structural characters that force a cell to be quoted. A lone CR counts: rows join with CRLF. */
const MUST_QUOTE = /[",\r\n]/;

/**
 * Quotes a value for CSV and neutralizes spreadsheet formula injection.
 *
 * Two separate concerns:
 *  1. CSV structure — a cell containing `"`, `,`, CR or LF must be quoted, with `"` doubled.
 *  2. Formula injection — a cell starting with =, +, -, @ (or a control char) is executed on
 *     open in Excel/Sheets. Prefixing with a single quote makes it inert text. The prefix is
 *     applied first so it ends up inside the quotes when quoting is also needed.
 */
export function csvCell(value: string | number | null | undefined): string {
  let raw = value === null || value === undefined ? "" : String(value);
  if (FORMULA_PREFIXES.some((p) => raw.startsWith(p))) raw = `'${raw}`;
  return MUST_QUOTE.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

/** Header + rows joined with CRLF (RFC 4180). */
export function toCsv(header: readonly string[], rows: (string | number | null)[][]): string {
  return [header.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\r\n");
}
