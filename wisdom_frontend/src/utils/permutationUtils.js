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
 * Returns the original string and the string repeated based on level
 *
 * @param {string} input - The input string
 * @param {Object} params - Parameters object with level property
 * @param {string} params.level - Level: 'low', 'medium', or 'high'
 * @returns {string[]} Array containing original and repeated strings
 *
 * Examples:
 * - Low: "abc" → ["abc", "abcabc"]
 * - Medium: "abc" → ["abc", "abcabc", "abcabcabc"]
 * - High: "abc" → ["abc", "abcabc", "abcabcabc", "abcabcabcabc"]
 */
export function doublePermutation(input, params = {}) {
  const level = params.level || 'low';
  const results = [input];

  let maxRepetitions = 2; // low
  if (level === 'medium') maxRepetitions = 3;
  if (level === 'high') maxRepetitions = 4;

  for (let i = 2; i <= maxRepetitions; i++) {
    results.push(input.repeat(i));
  }

  return results;
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
 * - parameters: (Optional) Array of parameter definitions for this permutation
 *
 * To add a new permutation:
 * 1. Create a new function above (or import from backend)
 * 2. Add an entry to this array
 *
 * To add parameters to a permutation:
 * Add a 'parameters' array with objects defining each parameter:
 * {
 *   id: 'param_name',
 *   label: 'Display Name',
 *   type: 'select',
 *   options: [{ value: 'option1', label: 'Option 1' }, ...],
 *   default: 'option1'
 * }
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
    description: 'Search original and repeated strings',
    parameters: [
      {
        id: 'level',
        label: 'Level',
        type: 'select',
        options: [
          { value: 'low', label: 'Low (x2)' },
          { value: 'medium', label: 'Medium (x3)' },
          { value: 'high', label: 'High (x4)' }
        ],
        default: 'low'
      }
    ]
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
 * @param {Object} params - Optional parameters for the permutation function
 * @returns {string[]} Array of permuted variants (always includes original)
 */
export function applyPermutation(term, permutationId, params = {}) {
  const permutationFn = getPermutationFunction(permutationId);
  return permutationFn(term, params);
}
