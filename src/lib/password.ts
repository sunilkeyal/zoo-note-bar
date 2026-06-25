import crypto from "crypto"

export function generatePassword(length = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
  const bytes = crypto.randomBytes(length)
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("")
}
