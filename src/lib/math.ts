// Rounds a monetary value to 2 decimal places (cent precision).
// Use after every user-input parse and after every accumulation loop to prevent
// IEEE 754 floating-point drift from propagating through financial calculations.
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Parses a user-supplied monetary string and rounds to 2 decimal places.
// Returns 0 for empty, NaN, or non-finite inputs.
export function parseMoney(raw: string): number {
  const v = parseFloat(raw)
  return round2(isFinite(v) ? v : 0)
}
