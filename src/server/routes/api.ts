import express, { type Request, type Response } from "express"
import db from "../db/connection"
import auth from "../middleware/auth"

const router = express.Router()

// Get game state
router.get("/games/:id/state", auth, async (req: Request, res: Response): Promise<void> => {
  const gameId = req.params.id

  try {
    // @ts-ignore
    const userId = req.session.user.id

    // Get game details
    const game = await db.one(
      `
      SELECT * FROM games WHERE id = $1
    `,
      [gameId],
    )

    // Get all players in the game
    const players = await db.manyOrNone(
      `
      SELECT gu.*, u.email, u.gravatar,
      (SELECT COUNT(*) FROM cards WHERE user_id = gu.user_id AND location = 'hand') as card_count
      FROM game_users gu
      JOIN users u ON gu.user_id = u.id
      WHERE gu.game_id = $1
      ORDER BY gu.seat
    `,
      [gameId],
    )

    // Get top card on discard pile
    const topCard = await db.oneOrNone(
      `
      SELECT * FROM cards 
      WHERE game_id = $1 AND location = 'discard'
      ORDER BY id DESC
      LIMIT 1
    `,
      [gameId],
    )

    // Get user's hand
    const hand = await db.manyOrNone(
      `
      SELECT * FROM cards 
      WHERE game_id = $1 AND user_id = $2 AND location = 'hand'
    `,
      [gameId, userId],
    )

    // Get current player
    const currentPlayer = players.find((p) => p.is_current)

    res.json({
      success: true,
      game,
      players,
      topCard,
      hand,
      currentPlayer: currentPlayer ? currentPlayer.user_id : null,
      isYourTurn: currentPlayer && currentPlayer.user_id === userId,
    })
  } catch (error) {
    console.error("Error getting game state:", error)
    res.status(500).json({ error: "Failed to get game state" })
  }
})

// Get player's cards
router.get("/games/:id/cards", auth, async (req: Request, res: Response): Promise<void> => {
  const gameId = req.params.id

  try {
    // @ts-ignore
    const userId = req.session.user.id

    // Get user's hand
    const cards = await db.manyOrNone(
      `
      SELECT * FROM cards 
      WHERE game_id = $1 AND user_id = $2 AND location = 'hand'
    `,
      [gameId, userId],
    )

    // Get top card on discard pile
    const topCard = await db.oneOrNone(
      `
      SELECT * FROM cards 
      WHERE game_id = $1 AND location = 'discard'
      ORDER BY id DESC
      LIMIT 1
    `,
      [gameId],
    )

    res.json({
      success: true,
      cards,
      topCard,
    })
  } catch (error) {
    console.error("Error getting player cards:", error)
    res.status(500).json({ error: "Failed to get player cards" })
  }
})

// Get chat messages
router.get("/games/:id/messages", auth, async (req: Request, res: Response): Promise<void> => {
  const gameId = req.params.id

  try {
    // Get chat messages
    const messages = await db.manyOrNone(
      `
      SELECT cm.*, u.email, u.gravatar
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.game_id = $1
      ORDER BY cm.created_at ASC
      LIMIT 50
    `,
      [gameId],
    )

    res.json({
      success: true,
      messages,
    })
  } catch (error) {
    console.error("Error getting chat messages:", error)
    res.status(500).json({ error: "Failed to get chat messages" })
  }
})

// Send chat message
router.post("/games/:id/messages", auth, async (req: Request, res: Response): Promise<void> => {
  const gameId = req.params.id
  const { content } = req.body

  try {
    // @ts-ignore
    const userId = req.session.user.id

    // Validate input
    if (!content || content.trim() === "") {
      res.status(400).json({ error: "Message content is required" })
      return
    }

    // Save message to database
    await db.none(
      `
      INSERT INTO chat_messages (user_id, game_id, message)
      VALUES ($1, $2, $3)
    `,
      [userId, gameId, content.trim()],
    )

    // Get user info
    const user = await db.one(
      `
      SELECT email, gravatar FROM users WHERE id = $1
    `,
      [userId],
    )

    // Emit message to all users in the game
    const io = req.app.get("io")
    if (io) {
      io.to(`game:${gameId}`).emit("new-message", {
        user_id: userId,
        email: user.email,
        gravatar: user.gravatar,
        content: content.trim(),
        created_at: new Date(),
      })
    }

    res.json({ success: true })
  } catch (error) {
    console.error("Error sending chat message:", error)
    res.status(500).json({ error: "Failed to send chat message" })
  }
})

// Get game list
router.get("/games", auth, async (req: Request, res: Response): Promise<void> => {
  try {
    // Get active games
    const games = await db.manyOrNone(
      `
      SELECT g.*, u.email as creator_email, 
      COUNT(gu.user_id) as player_count
      FROM games g
      JOIN users u ON g.created_by = u.id
      LEFT JOIN game_users gu ON g.id = gu.game_id
      WHERE g.is_active = true
      GROUP BY g.id, u.email
      ORDER BY g.created_at DESC
    `,
    )

    res.json({
      success: true,
      games,
    })
  } catch (error) {
    console.error("Error getting game list:", error)
    res.status(500).json({ error: "Failed to get game list" })
  }
})

// Get user profile
router.get("/profile", auth, async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.session.user.id

    // Get user info
    const user = await db.one(
      `
      SELECT id, email, gravatar, created_at FROM users WHERE id = $1
    `,
      [userId],
    )

    // Get game statistics
    const stats = await db.oneOrNone(
      `
      SELECT 
        COUNT(DISTINCT g.id) as total_games,
        SUM(CASE WHEN g.created_by = $1 THEN 1 ELSE 0 END) as created_games
      FROM games g
      JOIN game_users gu ON g.id = gu.game_id
      WHERE gu.user_id = $1
    `,
      [userId],
    )

    res.json({
      success: true,
      user,
      stats,
    })
  } catch (error) {
    console.error("Error getting user profile:", error)
    res.status(500).json({ error: "Failed to get user profile" })
  }
})

export default router
