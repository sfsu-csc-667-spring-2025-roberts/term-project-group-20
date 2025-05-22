import cookieParser from "cookie-parser"
import express from "express"
import createError from "http-errors"
import morgan from "morgan"
import path from "path"
import { createServer } from "http"
import dotenv from "dotenv"
import session from "express-session"
import pgSession from "connect-pg-simple"

// Load environment variables
dotenv.config()

// Import routes and middleware
import routes from "./routes"
import configureSocket from "./config/socket"
import db from "./db/connection"

// Create Express app
const app = express()
const server = createServer(app)

// Configure session
const PgSession = pgSession(session)
const sessionMiddleware = session({
  store: new PgSession({
    pgPromise: db,
    createTableIfMissing: true,
    tableName: "session",
  }),
  secret: process.env.SESSION_SECRET || "uno-game-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
})

// Configure Socket.io
const { io, broadcastGameUpdate } = configureSocket(server)

// Make socket.io available to routes
app.set("io", io)
app.set("broadcastGameUpdate", broadcastGameUpdate)

// View engine setup
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "ejs")

// Middleware
app.use(morgan("dev"))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")))
app.use(sessionMiddleware)

// Share session with Socket.io
// @ts-ignore
io.use((socket, next) => {
  // @ts-ignore
  sessionMiddleware(socket.request, {}, next)
})

// Routes
app.use("/", routes)

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get("env") === "development" ? err : {}

  // Render the error page
  res.status(err.status || 500)
  res.render("error", { error: err })
})

// Start server
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

export default app
