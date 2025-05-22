import bcrypt from "bcrypt"
import crypto from "crypto"

import db from "../connection"

const register = async (email: string, password: string) => {
  // Check if user already exists
  const existingUser = await db.oneOrNone("SELECT * FROM users WHERE email = $1", [email])

  if (existingUser) {
    throw new Error("User with this email already exists")
  }

  const sql = "INSERT INTO users (email, password, gravatar) VALUES ($1, $2, $3) RETURNING id, gravatar"

  const hashedPassword = await bcrypt.hash(password, 10)

  const { id, gravatar } = await db.one(sql, [
    email,
    hashedPassword,
    crypto.createHash("sha256").update(email).digest("hex"),
  ])

  return { id, gravatar, email }
}

const login = async (email: string, password: string) => {
  const sql = "SELECT * FROM users WHERE email = $1"

  const user = await db.oneOrNone(sql, [email])

  if (!user) {
    throw new Error("User not found")
  }

  const { id, gravatar, password: encryptedPassword } = user

  const isValidPassword = await bcrypt.compare(password, encryptedPassword)

  if (!isValidPassword) {
    throw new Error("Invalid credentials, try again.")
  }

  return { id, gravatar, email }
}

const getUserById = async (id: number) => {
  const sql = "SELECT id, email, gravatar FROM users WHERE id = $1"
  return db.oneOrNone(sql, [id])
}

export default { register, login, getUserById }
