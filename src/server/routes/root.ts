import express from "express"
import type { Request, Response } from "express"

const router = express.Router()

router.get("/", (request: Request, response: Response) => {
  // @ts-ignore
  if (request.session.user) {
    response.redirect("/lobby")
    return
  }

  response.render("root")
})

export default router
