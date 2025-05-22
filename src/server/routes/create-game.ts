import express, { type Request, type Response } from "express"
import db from "../db/connection"
import auth from "../middleware/auth"

const router = express.Router()

// Route to render the create game page
router.get("/", auth, (req: Request, res: Response) => {
  res.render("create-game")
})

router.post("/", auth, async (req: Request, res: Response) => {
  // Extract form data
  const { gameName, maxPlayers } = req.body

  if (!gameName || !maxPlayers) {
    return res.render("create-game", {
      error: "Game name and max players are required",
      formData: req.body,
    })
  }

  try {
    // @ts-ignore
    const userId = req.session.user.id

    // Create a new game
    const game = await db.one(
      `
      INSERT INTO games (name, max_players, created_by, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING id
    `,
      [gameName, maxPlayers, userId],
    )

    // Add the creator as the first player
    await db.none(
      `
      INSERT INTO game_users (game_id, user_id, seat, is_current)
      VALUES ($1, $2, 0, true)
    `,
      [game.id, userId],
    )

    // Redirect to the game waiting room
    res.redirect(`/games/${game.id}`)
  } catch (error) {
    console.error("Error creating game:", error)
    res.render("create-game", {
      error: "Failed to create game. Please try again.",
      formData: req.body,
    })
  }
})

export default router
