import express from "express"
import type { Request, Response } from "express"

import { User } from "../db"

const router = express.Router()

router.get("/register", async (_request: Request, response: Response) => {
  response.render("auth/register")
})

router.post("/register", async (request: Request, response: Response) => {
  const { username, email, password } = request.body

  if (!email || !password) {
    return response.render("auth/register", {
      error: "Email and password are required.",
      email,
      username,
    })
  }

  try {
    const user = await User.register(email, password)

    // @ts-ignore
    request.session.user = user
    response.redirect("/lobby")
  } catch (error) {
    console.error("Error registering user:", error)

    response.render("auth/register", { error: "Email already exists or invalid credentials.", email, username })
  }
})

router.get("/login", async (_request: Request, response: Response) => {
  response.render("auth/login")
})

router.post("/login", async (request: Request, response: Response) => {
  const { email, password } = request.body

  if (!email || !password) {
    return response.render("auth/login", {
      error: "Email and password are required.",
      email,
    })
  }

  try {
    const user = await User.login(email, password)

    // @ts-ignore
    request.session.user = user
    response.redirect("/lobby")
  } catch (error) {
    console.error("Error logging in user:", error)

    response.render("auth/login", { error: "Invalid credentials.", email })
  }
})

router.get("/logout", async (request: Request, response: Response) => {
  // @ts-ignore
  request.session.user = null
  request.session.destroy(() => {
    // intentional no-op for now
  })

  response.redirect("/")
})

export default router
