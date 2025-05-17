import express from "express";
const router = express.Router();

router.get("/", (_request, response) => {
  response.render("root", {
    title: "group 20 site",
    name: "group 20 site",
  });
});

export default router;
