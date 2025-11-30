/**
 * Permutation functions for search query expansion
 *
 * Each permutation function takes a string and returns an array of string variants.
 * These are applied to search terms behind the scenes to expand search coverage.
 *
 * This file contains mock implementations that can be easily replaced with
 * backend API calls when integrating with the real system.
 */

/**
 * Mock permutation function: Original + Reverse
 * Returns the original string and its reversed version
 *
 * Example: "abc" → ["abc", "cba"]
 *
 * @param {string} input - The input string
 * @returns {string[]} Array containing original and reversed string
 */
export function reversePermutation(input) {
  const reversed = input.split('').reverse().join('');
  return [input, reversed];
}

/**
 * Mock permutation function: Original + Double
 * Returns the original string and the string repeated twice
 *
 * Example: "abc" → ["abc", "abcabc"]
 *
 * @param {string} input - The input string
 * @returns {string[]} Array containing original and doubled string
 */
export function doublePermutation(input) {
  return [input, input + input];
}

/**
 * Available permutation functions configuration
 *
 * This array defines all available permutations that can be selected by users.
 * Each entry contains:
 * - id: Unique identifier for the permutation
 * - label: Display name shown to users
 * - function: The actual permutation function
 * - description: Human-readable description of what the permutation does
 *
 * To add a new permutation:
 * 1. Create a new function above (or import from backend)
 * 2. Add an entry to this array
 *
 * To integrate with backend:
 * Replace the function references with API calls that return Promise<string[]>
 */
export const PERMUTATION_FUNCTIONS = [
  {
    id: 'none',
    label: 'None',
    function: (input) => [input],
    description: 'No permutation - search as-is'
  },
  {
    id: 'reverse',
    label: 'Original + Reverse',
    function: reversePermutation,
    description: 'Search both original and reversed strings'
  },
  {
    id: 'double',
    label: 'Original + Double',
    function: doublePermutation,
    description: 'Search both original and doubled strings'
  }
];

/**
 * Get a permutation function by its ID
 *
 * @param {string} permutationId - The ID of the permutation
 * @returns {Function} The permutation function, or identity function if not found
 */
export function getPermutationFunction(permutationId) {
  const permutation = PERMUTATION_FUNCTIONS.find(p => p.id === permutationId);
  return permutation ? permutation.function : ((input) => [input]);
}

/**
 * Get permutation metadata by ID
 *
 * @param {string} permutationId - The ID of the permutation
 * @returns {Object|null} The permutation metadata object, or null if not found
 */
export function getPermutationMetadata(permutationId) {
  return PERMUTATION_FUNCTIONS.find(p => p.id === permutationId) || null;
}

/**
 * Apply a permutation to a search term and return all variants
 *
 * @param {string} term - The search term to permute
 * @param {string} permutationId - The ID of the permutation to apply
 * @returns {string[]} Array of permuted variants (always includes original)
 */
export function applyPermutation(term, permutationId) {
  const permutationFn = getPermutationFunction(permutationId);
  return permutationFn(term);
}
