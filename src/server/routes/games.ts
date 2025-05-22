import express, { type Request, type Response } from "express"
import db from "../db/connection"
import auth from "../middleware/auth"

const router = express.Router()

// Create game page
router.get("/create", auth, (req: Request, res: Response) => {
  res.render("create-game", {
    error: req.query.error,
  })
})

// Create game submission
router.post("/create", auth, async (req: Request, res: Response): Promise<void> => {
  const { name, min_players, max_players, password } = req.body

  try {
    // Validate input
    if (!name) {
      res.render("create-game", {
        error: "Game name is required",
      })
      return
    }

    // Check if game name already exists
    const existingGame = await db.oneOrNone(
      `
      SELECT * FROM games WHERE name = $1 AND is_active = true
    `,
      [name],
    )

    if (existingGame) {
      res.render("create-game", {
        error: "A game with this name already exists",
      })
      return
    }

    // Validate player counts
    const minPlayers = Number.parseInt(min_players) || 2
    const maxPlayers = Number.parseInt(max_players) || 4

    if (minPlayers < 2 || minPlayers > 8) {
      res.render("create-game", {
        error: "Minimum players must be between 2 and 8",
      })
      return
    }

    if (maxPlayers < minPlayers || maxPlayers > 8) {
      res.render("create-game", {
        error: "Maximum players must be between minimum players and 8",
      })
      return
    }

    // @ts-ignore
    const userId = req.session.user.id

    // Create game
    const game = await db.one(
      `
      INSERT INTO games (name, created_by, min_players, max_players, password)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
      [name, userId, minPlayers, maxPlayers, password || null],
    )

    // Add creator as first player
    await db.none(
      `
      INSERT INTO game_users (game_id, user_id, seat, is_current)
      VALUES ($1, $2, 0, false)
    `,
      [game.id, userId],
    )

    // Redirect to the game
    res.redirect(`/games/${game.id}`)
  } catch (error) {
    console.error("Error creating game:", error)
    res.render("create-game", {
      error: "Failed to create game",
    })
  }
})

// Join a game (GET - redirect to join form for password-protected games)
router.get("/:id/join", auth, async (req: Request, res: Response): Promise<void> => {
  const gameId = req.params.id

  try {
    // @ts-ignore
    const userId = req.session.user.id

    // Check if game exists and has space
    const game = await db.oneOrNone(
      `
      SELECT g.*, COUNT(gu.user_id) as player_count
      FROM games g
      LEFT JOIN game_users gu ON g.id = gu.game_id
      WHERE g.id = $1 AND g.is_active = true
      GROUP BY g.id
    `,
      [gameId],
    )

    if (!game) {
      res.redirect("/lobby?error=Game not found")
      return
    }

    if (Number.parseInt(game.player_count) >= game.max_players) {
      res.redirect("/lobby?error=Game is full")
      return
    }

    // Check if user is already in the game
    const existingPlayer = await db.oneOrNone(
      `
      SELECT * FROM game_users WHERE game_id = $1 AND user_id = $2
    `,
      [gameId, userId],
    )

    if (existingPlayer) {
      res.redirect(`/games/${gameId}`)
      return
    }

    // If game has a password, redirect to join form
    if (game.password && req.method === "GET") {
      res.redirect(`/lobby?error=This game requires a password`)
      return
    }

    // Find the next available seat
    const seats = await db.manyOrNone(
      `
      SELECT seat FROM game_users WHERE game_id = $1 ORDER BY seat
    `,
      [gameId],
    )

    const takenSeats = seats.map((s) => s.seat)
    let nextSeat = 0
    while (takenSeats.includes(nextSeat)) {
      nextSeat++
    }

    // Add user to the game
    await db.none(
      `
      INSERT INTO game_users (game_id, user_id, seat, is_current)
      VALUES ($1, $2, $3, false)
    `,
      [gameId, userId, nextSeat],
    )

    // Redirect to the game
    res.redirect(`/games/${gameId}`)
  } catch (error) {
    console.error("Error joining game:", error)
    res.redirect("/lobby?error=Failed to join game")
  }
})

// Join a game with password (POST)
router.post("/:id/join", auth, async (req: Request, res: Response): Promise<void> => {
  const gameId = req.params.id
  const { password } = req.body

  try {
    // @ts-ignore
    const userId = req.session.user.id

    // Check if game exists and has space
    const game = await db.oneOrNone(
      `
      SELECT g.*, COUNT(gu.user_id) as player_count
      FROM games g
      LEFT JOIN game_users gu ON g.id = gu.game_id
      WHERE g.id = $1 AND g.is_active = true
      GROUP BY g.id
    `,
      [gameId],
    )

    if (!game) {
      res.status(404).json({ error: "Game not found" })
      return
    }

    if (Number.parseInt(game.player_count) >= game.max_players) {
      res.status(400).json({ error: "Game is full" })
      return
    }

    // Check if user is already in the game
    const existingPlayer = await db.oneOrNone(
      `
      SELECT * FROM game_users WHERE game_id = $1 AND user_id = $2
    `,
      [gameId, userId],
    )

    if (existingPlayer) {
      res.json({ success: true })
      return
    }

    // Check password if game is password-protected
    if (game.password) {
      if (!password) {
        res.status(400).json({ error: "Password is required" })
        return
      }

      if (password !== game.password) {
        res.status(400).json({ error: "Incorrect password" })
        return
      }
    }

    // Find the next available seat
    const seats = await db.manyOrNone(
      `
      SELECT seat FROM game_users WHERE game_id = $1 ORDER BY seat
    `,
      [gameId],
    )

    const takenSeats = seats.map((s) => s.seat)
    let nextSeat = 0
    while (takenSeats.includes(nextSeat)) {
      nextSeat++
    }

    // Add user to the game
    await db.none(
      `
      INSERT INTO game_users (game_id, user_id, seat, is_current)
      VALUES ($1, $2, $3, false)
    `,
      [gameId, userId, nextSeat],
    )

    res.json({ success: true })
  } catch (error) {
    console.error("Error joining game:", error)
    res.status(500).json({ error: "Failed to join game" })
  }
})

// Game page
router.get("/:id", auth, async (req: Request, res: Response): Promise<void> => {
  const gameId = req.params.id

  try {
    // @ts-ignore
    const userId = req.session.user.id

    // Check if user is in the game
    const playerInGame = await db.oneOrNone(
      `
      SELECT * FROM game_users WHERE game_id = $1 AND user_id = $2
    `,
      [gameId, userId],
    )

    if (!playerInGame) {
      res.redirect(`/games/${gameId}/join`)
      return
    }

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
      SELECT gu.*, u.email, u.gravatar
      FROM game_users gu
      JOIN users u ON gu.user_id = u.id
      WHERE gu.game_id = $1
      ORDER BY gu.seat
    `,
      [gameId],
    )

    // Check if game has enough players to start
    const canStart = players.length >= game.min_players

    // Check if current user is the game creator
    const isCreator = game.created_by === userId

    res.render("game", {
      game,
      players,
      currentUserId: userId,
      canStart,
      isCreator,
    })
  } catch (error) {
    console.error("Error loading game:", error)
    res.redirect("/lobby?error=Failed to load game")
  }
})

// Start game
router.post("/:id/start", auth, async (req: Request, res: Response): Promise<void> => {
  const gameId = req.params.id

  try {
    // @ts-ignore
    const userId = req.session.user.id

    // Check if user is the game creator
    const game = await db.one(
      `
      SELECT * FROM games WHERE id = $1
    `,
      [gameId],
    )

    if (game.created_by !== userId) {
      res.status(403).json({ error: "Only the game creator can start the game" })
      return
    }

    // Get all players
    const players = await db.manyOrNone(
      `
      SELECT * FROM game_users WHERE game_id = $1 ORDER BY seat
    `,
      [gameId],
    )

    if (players.length < game.min_players) {
      res.status(400).json({ error: "Not enough players to start the game" })
      return
    }

    // Initialize the game (create deck, deal cards, etc.)
    await initializeGame(gameId, players)

    // Update game status
    await db.none(
      `
      UPDATE games SET started = true WHERE id = $1
    `,
      [gameId],
    )

    // Broadcast game update
    const broadcastGameUpdate = req.app.get("broadcastGameUpdate")
    if (broadcastGameUpdate) {
      broadcastGameUpdate(gameId)
    }

    res.json({ success: true })
  } catch (error) {
    console.error("Error starting game:", error)
    res.status(500).json({ error: "Failed to start game" })
  }
})

// Helper function to initialize a game
async function initializeGame(gameId: string, players: any[]) {
  // Create a deck of UNO cards
  const colors = ["red", "blue", "green", "yellow"]
  const values = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "skip",
    "reverse",
    "draw_two",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "skip",
    "reverse",
    "draw_two",
  ]

  // Add wild cards
  const wildCards = [
    { color: "wild", value: "wild" },
    { color: "wild", value: "wild" },
    { color: "wild", value: "wild" },
    { color: "wild", value: "wild" },
    { color: "wild", value: "wild_draw_four" },
    { color: "wild", value: "wild_draw_four" },
    { color: "wild", value: "wild_draw_four" },
    { color: "wild", value: "wild_draw_four" },
  ]

  // Create the deck
  const deck = []

  // Add number and action cards
  for (const color of colors) {
    for (const value of values) {
      deck.push({ color, value })
    }
  }

  // Add wild cards
  deck.push(...wildCards)

  // Shuffle the deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }

  // Insert cards into the database
  const cardInsertPromises = deck.map((card, index) => {
    return db.none(
      `
      INSERT INTO cards (color, value, game_id, location)
      VALUES ($1, $2, $3, $4)
    `,
      [card.color, card.value, gameId, "deck"],
    )
  })

  await Promise.all(cardInsertPromises)

  // Deal 7 cards to each player
  for (const player of players) {
    // Get 7 cards from the deck
    const playerCards = await db.manyOrNone(
      `
      SELECT id FROM cards 
      WHERE game_id = $1 AND location = 'deck'
      LIMIT 7
    `,
      [gameId],
    )

    // Update cards to be in player's hand
    for (const card of playerCards) {
      await db.none(
        `
        UPDATE cards SET location = 'hand', user_id = $1
        WHERE id = $2
      `,
        [player.user_id, card.id],
      )
    }
  }

  // Place the top card on the discard pile
  const topCard = await db.one(
    `
    SELECT id FROM cards 
    WHERE game_id = $1 AND location = 'deck'
    LIMIT 1
  `,
    [gameId],
  )

  await db.none(
    `
    UPDATE cards SET location = 'discard'
    WHERE id = $1
  `,
    [topCard.id],
  )

  // Set the first player as current
  await db.none(
    `
    UPDATE game_users SET is_current = true
    WHERE game_id = $1 AND seat = 0
  `,
    [gameId],
  )
}

// Play a card
router.post("/:id/play", auth, async (req: Request, res: Response): Promise<void> => {
  const gameId = req.params.id
  const { cardId, chosenColor } = req.body

  try {
    // @ts-ignore
    const userId = req.session.user.id

    // Check if it's the player's turn
    const playerTurn = await db.oneOrNone(
      `
      SELECT * FROM game_users 
      WHERE game_id = $1 AND user_id = $2 AND is_current = true
    `,
      [gameId, userId],
    )

    if (!playerTurn) {
      res.status(403).json({ error: "It's not your turn" })
      return
    }

    // Check if the card is in the player's hand
    const card = await db.oneOrNone(
      `
      SELECT * FROM cards 
      WHERE id = $1 AND user_id = $2 AND location = 'hand'
    `,
      [cardId, userId],
    )

    if (!card) {
      res.status(400).json({ error: "Invalid card" })
      return
    }

    // Get the top card on the discard pile
    const topCard = await db.oneOrNone(
      `
      SELECT * FROM cards 
      WHERE game_id = $1 AND location = 'discard'
      ORDER BY id DESC
      LIMIT 1
    `,
      [gameId],
    )

    // Check if the card can be played
    if (!canPlayCard(card, topCard)) {
      res.status(400).json({ error: "You cannot play this card" })
      return
    }

    // For wild cards, ensure a color was chosen
    if (card.color === "wild" && !chosenColor) {
      res.status(400).json({ error: "You must choose a color for wild cards" })
      return
    }

    // Update card color if it's a wild card
    const finalColor = card.color === "wild" ? chosenColor : card.color

    // Play the card
    await db.none(
      `
      UPDATE cards SET location = 'discard', user_id = NULL, color = $3
      WHERE id = $1
    `,
      [cardId, finalColor],
    )

    // Handle special cards
    await handleSpecialCard(gameId, card, userId, finalColor)

    // Check if player has won
    const remainingCards = await db.oneOrNone(
      `
      SELECT COUNT(*) as count FROM cards 
      WHERE game_id = $1 AND user_id = $2 AND location = 'hand'
    `,
      [gameId, userId],
    )

    if (Number.parseInt(remainingCards.count) === 0) {
      // Player has won
      await db.none(
        `
        UPDATE games SET is_active = false
        WHERE id = $1
      `,
        [gameId],
      )

      // Broadcast game update
      const broadcastGameUpdate = req.app.get("broadcastGameUpdate")
      if (broadcastGameUpdate) {
        broadcastGameUpdate(gameId)
      }

      res.json({ success: true, winner: true })
      return
    }

    // Broadcast game update
    const broadcastGameUpdate = req.app.get("broadcastGameUpdate")
    if (broadcastGameUpdate) {
      broadcastGameUpdate(gameId)
    }

    res.json({ success: true })
  } catch (error) {
    console.error("Error playing card:", error)
    res.status(500).json({ error: "Failed to play card" })
  }
})

// Helper function to check if a card can be played
function canPlayCard(card: any, topCard: any) {
  // Wild cards can always be played
  if (card.color === "wild") {
    return true
  }

  // Match color or value
  return card.color === topCard.color || card.value === topCard.value
}

// Helper function to handle special cards
async function handleSpecialCard(gameId: string, card: any, userId: number, chosenColor?: string) {
  // Get all players in order
  const players = await db.manyOrNone(
    `
    SELECT * FROM game_users 
    WHERE game_id = $1 
    ORDER BY seat
  `,
    [gameId],
  )

  // Find current player index
  const currentPlayerIndex = players.findIndex((p) => p.user_id === userId)

  // Default: move to next player
  let nextPlayerIndex = (currentPlayerIndex + 1) % players.length

  // Handle special cards
  switch (card.value) {
    case "skip":
      // Skip the next player
      nextPlayerIndex = (currentPlayerIndex + 2) % players.length
      break

    case "reverse":
      // Reverse the order (in a 2-player game, acts like skip)
      if (players.length === 2) {
        nextPlayerIndex = currentPlayerIndex // Stay with current player
      } else {
        // Reverse the order - this is simplified; in a real game you'd need to track direction
        nextPlayerIndex = (currentPlayerIndex - 1 + players.length) % players.length
      }
      break

    case "draw_two":
      // Next player draws 2 cards and is skipped
      const nextPlayerId = players[(currentPlayerIndex + 1) % players.length].user_id

      // Draw 2 cards for the next player
      const cardsToDrawTwo = await db.manyOrNone(
        `
        SELECT id FROM cards 
        WHERE game_id = $1 AND location = 'deck'
        LIMIT 2
      `,
        [gameId],
      )

      for (const card of cardsToDrawTwo) {
        await db.none(
          `
          UPDATE cards SET location = 'hand', user_id = $1
          WHERE id = $2
        `,
          [nextPlayerId, card.id],
        )
      }

      // Skip to the player after the next
      nextPlayerIndex = (currentPlayerIndex + 2) % players.length
      break

    case "wild_draw_four":
      // Next player draws 4 cards and is skipped
      const nextPlayerIdWild = players[(currentPlayerIndex + 1) % players.length].user_id

      // Draw 4 cards for the next player
      const cardsToDrawFour = await db.manyOrNone(
        `
        SELECT id FROM cards 
        WHERE game_id = $1 AND location = 'deck'
        LIMIT 4
      `,
        [gameId],
      )

      for (const card of cardsToDrawFour) {
        await db.none(
          `
          UPDATE cards SET location = 'hand', user_id = $1
          WHERE id = $2
        `,
          [nextPlayerIdWild, card.id],
        )
      }

      // Skip to the player after the next
      nextPlayerIndex = (currentPlayerIndex + 2) % players.length
      break
  }

  // Update current player
  await db.none(
    `
    UPDATE game_users SET is_current = false
    WHERE game_id = $1
  `,
    [gameId],
  )

  await db.none(
    `
    UPDATE game_users SET is_current = true
    WHERE game_id = $1 AND user_id = $2
  `,
    [gameId, players[nextPlayerIndex].user_id],
  )
}

// Draw a card
router.post("/:id/draw", auth, async (req: Request, res: Response): Promise<void> => {
  const gameId = req.params.id

  try {
    // @ts-ignore
    const userId = req.session.user.id

    // Check if it's the player's turn
    const playerTurn = await db.oneOrNone(
      `
      SELECT * FROM game_users 
      WHERE game_id = $1 AND user_id = $2 AND is_current = true
    `,
      [gameId, userId],
    )

    if (!playerTurn) {
      res.status(403).json({ error: "It's not your turn" })
      return
    }

    // Draw a card from the deck
    const card = await db.oneOrNone(
      `
      SELECT * FROM cards 
      WHERE game_id = $1 AND location = 'deck'
      LIMIT 1
    `,
      [gameId],
    )

    if (!card) {
      // Reshuffle the discard pile except the top card
      const topCard = await db.one(
        `
        SELECT * FROM cards 
        WHERE game_id = $1 AND location = 'discard'
        ORDER BY id DESC
        LIMIT 1
      `,
        [gameId],
      )

      await db.none(
        `
        UPDATE cards SET location = 'deck'
        WHERE game_id = $1 AND location = 'discard' AND id != $2
      `,
        [gameId, topCard.id],
      )

      // Try drawing again
      const newCard = await db.oneOrNone(
        `
        SELECT * FROM cards 
        WHERE game_id = $1 AND location = 'deck'
        LIMIT 1
      `,
        [gameId],
      )

      if (!newCard) {
        res.status(400).json({ error: "No cards left to draw" })
        return
      }

      // Add card to player's hand
      await db.none(
        `
        UPDATE cards SET location = 'hand', user_id = $1
        WHERE id = $2
      `,
        [userId, newCard.id],
      )

      // Move to next player
      await moveToNextPlayer(gameId, userId)

      // Broadcast game update
      const broadcastGameUpdate = req.app.get("broadcastGameUpdate")
      if (broadcastGameUpdate) {
        broadcastGameUpdate(gameId)
      }

      res.json({ success: true, card: newCard })
      return
    }

    // Add card to player's hand
    await db.none(
      `
      UPDATE cards SET location = 'hand', user_id = $1
      WHERE id = $2
    `,
      [userId, card.id],
    )

    // Move to next player
    await moveToNextPlayer(gameId, userId)

    // Broadcast game update
    const broadcastGameUpdate = req.app.get("broadcastGameUpdate")
    if (broadcastGameUpdate) {
      broadcastGameUpdate(gameId)
    }

    res.json({ success: true, card })
  } catch (error) {
    console.error("Error drawing card:", error)
    res.status(500).json({ error: "Failed to draw card" })
  }
})

// Helper function to move to the next player
async function moveToNextPlayer(gameId: string, userId: number) {
  // Get all players in order
  const players = await db.manyOrNone(
    `
    SELECT * FROM game_users 
    WHERE game_id = $1 
    ORDER BY seat
  `,
    [gameId],
  )

  // Find current player index
  const currentPlayerIndex = players.findIndex((p) => p.user_id === userId)

  // Move to next player
  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length

  // Update current player
  await db.none(
    `
    UPDATE game_users SET is_current = false
    WHERE game_id = $1
  `,
    [gameId],
  )

  await db.none(
    `
    UPDATE game_users SET is_current = true
    WHERE game_id = $1 AND user_id = $2
  `,
    [gameId, players[nextPlayerIndex].user_id],
  )
}

export default router
