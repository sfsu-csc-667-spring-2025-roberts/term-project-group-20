import express from "express";
const router = express.Router();

router.get("/login", (_request, response) => {
  response.render("auth/login");
});
router.get("/register", (_request, response) => {
    response.render("auth/register");
  });

export default router;