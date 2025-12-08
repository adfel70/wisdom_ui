/**
 * Text transformation utilities
 *
 * NOTE: These are placeholder implementations for development/testing.
 * In production, these will be replaced with backend API calls.
 *
 * To integrate with real backend:
 * 1. Replace the function implementations with API calls
 * 2. Each function should call POST /api/transform with:
 *    { text: string, operation: string }
 * 3. Return the transformed text from the API response
 */

/**
 * Example transformation 1: Reverse the character order
 * @param {string} text - Input text
 * @returns {string} - Reversed text
 */
export const reverseText = (text) => {
  return text.split('').reverse().join('');
};

/**
 * Example transformation 2: Remove every second character
 * @param {string} text - Input text
 * @returns {string} - Text with even-indexed characters removed
 */
export const removeEvenChars = (text) => {
  return text
    .split('')
    .filter((_, index) => index % 2 === 0)
    .join('');
};

/**
 * Example transformation 3: Convert to alternating case (aLtErNaTiNg)
 * @param {string} text - Input text
 * @returns {string} - Text in alternating case
 */
export const alternatingCase = (text) => {
  return text
    .split('')
    .map((char, index) =>
      index % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
    )
    .join('');
};

/**
 * List of available transformations
 * Add or modify entries here to change available options
 */
export const TRANSFORMATIONS = [
  {
    id: 'reverse',
    label: 'Reverse Text',
    function: reverseText,
    description: 'Reverse character order',
    shortcut: 'Ctrl + A'
  },
  {
    id: 'removeEven',
    label: 'Remove Even Characters',
    function: removeEvenChars,
    description: 'Remove every 2nd character',
    shortcut: 'Ctrl + B'
  },
  {
    id: 'alternating',
    label: 'Alternating Case',
    function: alternatingCase,
    description: 'aLtErNaTiNg CaSe',
    shortcut: 'Ctrl + C'
  }
];

/**
 * Apply a transformation by ID
 * @param {string} text - Input text
 * @param {string} transformId - ID of the transformation to apply
 * @returns {string} - Transformed text
 */
export const applyTransformation = (text, transformId) => {
  const transformation = TRANSFORMATIONS.find(t => t.id === transformId);
  if (!transformation) {
    console.error(`Unknown transformation: ${transformId}`);
    return text;
  }
  return transformation.function(text);
};
