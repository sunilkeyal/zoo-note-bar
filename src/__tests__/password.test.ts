import { describe, it, expect } from "vitest"
import { generatePassword } from "@/lib/password"

describe("generatePassword", () => {
  it("returns a string of the specified length", () => {
    expect(generatePassword(12)).toHaveLength(12)
    expect(generatePassword(16)).toHaveLength(16)
  })

  it("contains at least one special character", () => {
    const pws = Array.from({ length: 10 }, () => generatePassword(12))
    expect(pws).toEqual(expect.arrayContaining([expect.stringMatching(/[!@#$%^&*]/)]))
  })

  it("generates different values each call", () => {
    const pw1 = generatePassword()
    const pw2 = generatePassword()
    expect(pw1).not.toBe(pw2)
  })
})
