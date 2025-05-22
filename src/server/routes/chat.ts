import express, { type Request, type Response } from "express"
import db from "../db/connection"
import auth from "../middleware/auth"

const router = express.Router()

// Get chat messages for a game
router.get("/:gameId", auth, async (req: Request, res: Response): Promise<void> => {
  const gameId = req.params.gameId

  try {
    // Get chat messages
    const messages = await db.manyOrNone(
      `
      SELECT cm.*, u.email, u.gravatar
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.game_id = $1
      ORDER BY cm.created_at ASC
    `,
      [gameId],
    )

    res.json(messages)
  } catch (error) {
    console.error("Error getting chat messages:", error)
    res.status(500).json({ error: "Failed to get chat messages" })
  }
})

// Send a chat message
router.post("/:gameId", auth, async (req: Request, res: Response): Promise<void> => {
  const gameId = req.params.gameId
  const { message } = req.body

  try {
    // @ts-ignore
    const userId = req.session.user.id

    // Save message to database
    await db.none(
      `
      INSERT INTO chat_messages (user_id, game_id, message)
      VALUES ($1, $2, $3)
    `,
      [userId, gameId, message],
    )

    res.json({ success: true })
  } catch (error) {
    console.error("Error sending chat message:", error)
    res.status(500).json({ error: "Failed to send chat message" })
  }
})

export default router
