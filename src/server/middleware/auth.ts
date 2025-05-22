import { Request, Response, NextFunction } from "express"

export default function auth(req: Request, res: Response, next: NextFunction) {
  // @ts-ignore
  if (req.session && req.session.user) {
    next()
  } else {
    res.redirect("/auth/login")
  }
}
