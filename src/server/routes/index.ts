import express from "express"
import rootRoutes from "./root"
import authRoutes from "./auth"
import chatRoutes from "./chat"
import gamesRoutes from "./games"
import lobbyRoutes from "./lobby"
import apiRoutes from "./api"
import auth from "../middleware/auth"

const router = express.Router()

// Public routes
router.use("/", rootRoutes)
router.use("/auth", authRoutes)
router.use("/api", apiRoutes)

// Protected routes
router.use("/chat", auth, chatRoutes)
router.use("/games", gamesRoutes) // This includes the create game route
router.use("/lobby", auth, lobbyRoutes)

export default router
