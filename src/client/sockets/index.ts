import io from "socket.io-client"

const socket = io()

// Join game room
export const joinGameRoom = (gameId: string) => {
  socket.emit("join-game", { gameId })
}

// Join lobby chat
export const joinLobbyChat = () => {
  socket.emit("join-lobby")
}

// Send chat message
export const sendChatMessage = (gameId: string, message: string) => {
  socket.emit("chat-message", { gameId, message })
}

// Send lobby chat message
export const sendLobbyMessage = (message: string) => {
  socket.emit("lobby-message", { message })
}

// Play a card
export const playCard = (gameId: string, cardId: number, chosenColor?: string) => {
  socket.emit("play-card", { gameId, cardId, chosenColor })
}

// Draw a card
export const drawCard = (gameId: string) => {
  socket.emit("draw-card", { gameId })
}

// Start a game
export const startGame = (gameId: string) => {
  socket.emit("start-game", { gameId })
}

export { socket }
