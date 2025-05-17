import cookieParser from "cookie-parser";
import express from "express";
import httpErrors from "http-errors";
import morgan from "morgan";
import * as path from "path";
import * as routes from "./routes";
import * as config from "./config";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

config.liveReload(app);
// Middleware
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(process.cwd(), "src", "public")));
app.use(cookieParser());

// View engine setup
app.set("views", path.join(process.cwd(), "src", "server", "views"));
app.set("view engine", "ejs");

// Routes
app.use("/", routes.root);
app.use("/test", routes.test);
app.use("/auth", routes.auth);


// Error handling
app.use((_request, _response, next) => {
  next(httpErrors(404));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
