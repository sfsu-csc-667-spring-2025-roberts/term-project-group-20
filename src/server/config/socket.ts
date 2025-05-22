import { Server } from "socket.io"
import type { Server as HttpServer } from "http"
import db from "../db/connection"

export default function configureSocket(server: HttpServer) {
  const io = new Server(server)

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id)

    // Join a game room
    socket.on("join-game", async (data) => {
      const { gameId } = data
      socket.join(`game:${gameId}`)
      console.log(`User ${socket.id} joined game ${gameId}`)

      // Get session user ID
      // @ts-ignore
      const userId = socket.request.session?.user?.id

      if (userId) {
        try {
          // Associate socket with user
          socket.join(`user:${userId}`)

          // Get user's hand
          const hand = await db.manyOrNone(
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

          // Get current player
          const currentPlayer = await db.oneOrNone(
            `
            SELECT user_id FROM game_users 
            WHERE game_id = $1 AND is_current = true
          `,
            [gameId],
          )

          // Get all players in the game
          const players = await db.manyOrNone(
            `
            SELECT gu.user_id, u.email, u.gravatar, gu.is_current,
            (SELECT COUNT(*) FROM cards WHERE user_id = gu.user_id AND location = 'hand') as card_count
            FROM game_users gu
            JOIN users u ON gu.user_id = u.id
            WHERE gu.game_id = $1
            ORDER BY gu.seat
          `,
            [gameId],
          )

          // Send game state to the user
          socket.emit("game-update", {
            hand,
            topCard,
            players,
            currentPlayer: currentPlayer?.user_id,
            isYourTurn: currentPlayer?.user_id === userId,
          })
        } catch (error) {
          console.error("Error getting game state:", error)
        }
      }
    })

    // Join lobby
    socket.on("join-lobby", () => {
      socket.join("lobby")
      console.log(`User ${socket.id} joined lobby`)
    })

    // Chat message
    socket.on("chat-message", async (data) => {
      const { gameId, message } = data

      // Get session user ID
      // @ts-ignore
      const userId = socket.request.session?.user?.id

      if (userId && gameId && message) {
        try {
          // Get user info
          const user = await db.one(
            `
            SELECT email, gravatar FROM users WHERE id = $1
          `,
            [userId],
          )

          // Save message to database
          await db.none(
            `
            INSERT INTO chat_messages (game_id, user_id, message)
            VALUES ($1, $2, $3)
          `,
            [gameId, userId, message],
          )

          // Broadcast message to all users in the game
          io.to(`game:${gameId}`).emit("chat-message", {
            userId,
            email: user.email,
            gravatar: user.gravatar,
            message,
            timestamp: new Date(),
          })
        } catch (error) {
          console.error("Error sending chat message:", error)
        }
      }
    })

    // Lobby chat message
    socket.on("lobby-message", async (data) => {
      const { message } = data

      // Get session user ID
      // @ts-ignore
      const userId = socket.request.session?.user?.id

      if (userId && message) {
        try {
          // Get user info
          const user = await db.one(
            `
            SELECT email, gravatar FROM users WHERE id = $1
          `,
            [userId],
          )

          // Save message to database (optional)
          await db.none(
            `
            INSERT INTO chat_messages (user_id, message, is_lobby)
            VALUES ($1, $2, true)
          `,
            [userId, message],
          )

          // Broadcast message to all users in the lobby
          io.to("lobby").emit("lobby-message", {
            userId,
            email: user.email,
            gravatar: user.gravatar,
            message,
            timestamp: new Date(),
          })
        } catch (error) {
          console.error("Error sending lobby message:", error)
        }
      }
    })

    // Play card
    socket.on("play-card", async (data) => {
      const { gameId, cardId, chosenColor } = data

      // Get session user ID
      // @ts-ignore
      const userId = socket.request.session?.user?.id

      if (userId && gameId && cardId) {
        try {
          // Make API call to play card
          const response = await fetch(`http://localhost:${process.env.PORT || 3000}/games/${gameId}/play`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Include session cookie
              Cookie: socket.request.headers.cookie || "",
            },
            body: JSON.stringify({ cardId, chosenColor }),
          })

          const result = await response.json()

          if (result.success) {
            // Card played successfully, game state will be updated via broadcastGameUpdate
            if (result.winner) {
              // Announce winner
              io.to(`game:${gameId}`).emit("game-over", {
                winnerId: userId,
              })
            }
          } else {
            // Send error to the client
            socket.emit("error", {
              message: result.error || "Failed to play card",
            })
          }
        } catch (error) {
          console.error("Error playing card:", error)
          socket.emit("error", {
            message: "Failed to play card",
          })
        }
      }
    })

    // Draw card
    socket.on("draw-card", async (data) => {
      const { gameId } = data

      // Get session user ID
      // @ts-ignore
      const userId = socket.request.session?.user?.id

      if (userId && gameId) {
        try {
          // Make API call to draw card
          const response = await fetch(`http://localhost:${process.env.PORT || 3000}/games/${gameId}/draw`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Include session cookie
              Cookie: socket.request.headers.cookie || "",
            },
          })

          const result = await response.json()

          if (result.success) {
            // Card drawn successfully, game state will be updated via broadcastGameUpdate
          } else {
            // Send error to the client
            socket.emit("error", {
              message: result.error || "Failed to draw card",
            })
          }
        } catch (error) {
          console.error("Error drawing card:", error)
          socket.emit("error", {
            message: "Failed to draw card",
          })
        }
      }
    })

    // Start game
    socket.on("start-game", async (data) => {
      const { gameId } = data

      // Get session user ID
      // @ts-ignore
      const userId = socket.request.session?.user?.id

      if (userId && gameId) {
        try {
          // Make API call to start game
          const response = await fetch(`http://localhost:${process.env.PORT || 3000}/games/${gameId}/start`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Include session cookie
              Cookie: socket.request.headers.cookie || "",
            },
          })

          const result = await response.json()

          if (result.success) {
            // Game started successfully, game state will be updated via broadcastGameUpdate
            io.to(`game:${gameId}`).emit("game-started")
          } else {
            // Send error to the client
            socket.emit("error", {
              message: result.error || "Failed to start game",
            })
          }
        } catch (error) {
          console.error("Error starting game:", error)
          socket.emit("error", {
            message: "Failed to start game",
          })
        }
      }
    })

    // Disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)
    })
  })

  // Broadcast game updates
  const broadcastGameUpdate = async (gameId: string) => {
    try {
      // Get all players in the game
      const players = await db.manyOrNone(
        `
        SELECT gu.user_id, u.email, u.gravatar, gu.is_current,
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

      // Get current player
      const currentPlayer = players.find((p) => p.is_current)

      // Broadcast to all players in the game
      io.to(`game:${gameId}`).emit("game-state-update", {
        players,
        topCard,
        currentPlayer: currentPlayer?.user_id,
      })

      // Send individual hand updates to each player
      for (const player of players) {
        // Get player's hand
        const hand = await db.manyOrNone(
          `
          SELECT * FROM cards 
          WHERE game_id = $1 AND user_id = $2 AND location = 'hand'
        `,
          [gameId, player.user_id],
        )

        // Send to specific player
        io.to(`user:${player.user_id}`).emit("hand-update", {
          hand,
          isYourTurn: player.is_current,
        })
      }
    } catch (error) {
      console.error("Error broadcasting game update:", error)
    }
  }

  return { io, broadcastGameUpdate }
}
