import express, { Request, Response } from "express";
const router = express.Router();

// Route to render the create game page
router.get("/", (req: Request, res: Response) => {
  res.render("create-game");
});

router.post("/", (req: Request, res: Response) => {
  // Extract form data
  const { gameName, maxPlayers } = req.body;

  if (!gameName || !maxPlayers) {
    return res.render("create-game", {
      error: "Game name and max players are required",
      formData: req.body,
    });
  }


  const gameId = Date.now().toString();

  // Redirect to the waiting room or game page
  res.redirect("/games/waiting-room/" + gameId);
});

export default router;
