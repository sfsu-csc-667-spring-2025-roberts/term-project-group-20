import express from "express"
import type { Request, Response } from "express"
import db from "../db/connection"

const router = express.Router()

router.get("/", async (req: Request, res: Response) => {
  try {
    // Get active games
    const games = await db.manyOrNone(`
      SELECT g.id, g.name, g.max_players, COUNT(gu.user_id) as player_count
      FROM games g
      LEFT JOIN game_users gu ON g.id = gu.game_id
      WHERE g.is_active = true
      GROUP BY g.id, g.name, g.max_players
      ORDER BY g.created_at DESC
    `)

    res.render("lobby", { games })
  } catch (error) {
    console.error("Error fetching games:", error)
    res.render("lobby", { error: "Failed to load games", games: [] })
  }
})

export default router
