import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

// Check if environment variables exist
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is not set');
}
if (!process.env.ENCRYPTION_IV) {
  throw new Error('ENCRYPTION_IV environment variable is not set');
}

const key = Buffer.from(process.env.ENCRYPTION_KEY, "utf-8");
const iv = Buffer.from(process.env.ENCRYPTION_IV, "utf-8");

export function encryptWithIV(text) {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

export function decryptWithIV(encryptedText) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
