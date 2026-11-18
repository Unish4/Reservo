import argon2 from "argon2";

const MEMORY_COST = 19456;

const TIME_COST = 2;

const PARALLELISM = 1;

export async function hashPassword(plain) {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: MEMORY_COST,
    timeCost: TIME_COST,
    parallelism: PARALLELISM,
  });
}

export async function verifyPassword(plain, hash) {
  try {
    return argon2.verify(hash, plain);
  } catch (error) {
    return false;
  }
}
