import prisma from './prisma.js';

// Unambiguous alphabet: no 0/O, 1/I/L to avoid transcription errors when a
// manager reads the code out to a salesman.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

const randomCode = () => {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
};

/**
 * Generate a shop join code that is not already taken by another store.
 * Retries a handful of times before giving up (collisions are astronomically
 * unlikely at this scale, but the unique DB constraint is the real guarantee).
 *
 * @returns {Promise<string>} a unique 6-char join code
 */
export const generateUniqueJoinCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomCode();
    const existing = await prisma.store.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique join code');
};
