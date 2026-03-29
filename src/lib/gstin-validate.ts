/**
 * GSTIN validation (Indian GST Identification Number)
 * Format: 2-digit state + 10-char PAN + 1 entity + 1 Z + 1 check digit
 * Total: 15 characters
 */

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const CHAR_VALUES: Record<string, number> = {};
"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((c, i) => {
  CHAR_VALUES[c] = i;
});

/**
 * Validate a GSTIN using the check-digit algorithm.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateGSTIN(gstin: string): { valid: boolean; error?: string } {
  if (!gstin) return { valid: false, error: "GSTIN is required" };

  const upper = gstin.toUpperCase().trim();
  if (upper.length !== 15) {
    return { valid: false, error: "GSTIN must be 15 characters" };
  }

  if (!GSTIN_REGEX.test(upper)) {
    return { valid: false, error: "Invalid GSTIN format" };
  }

  // Validate state code (01-38 + 97)
  const stateCode = parseInt(upper.substring(0, 2), 10);
  const validStateCodes = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 26, 27, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 97,
  ];
  if (!validStateCodes.includes(stateCode)) {
    return { valid: false, error: "Invalid state code in GSTIN" };
  }

  // Check digit validation (Luhn mod 36 variant)
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const charVal = CHAR_VALUES[upper[i]];
    const factor = (i % 2 === 0) ? 1 : 2;
    const product = charVal * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const remainder = sum % 36;
  const checkChar = (36 - remainder) % 36;
  const expectedCheck = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[checkChar];

  if (upper[14] !== expectedCheck) {
    return { valid: false, error: "Invalid GSTIN check digit" };
  }

  return { valid: true };
}
