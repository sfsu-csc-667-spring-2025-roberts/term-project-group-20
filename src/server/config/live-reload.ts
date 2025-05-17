import type { Express } from "express";

const configurReload = (app: Express) => {
  if (process.env.NODE_ENV === "development") {
    const livereload = require("connect-livereload");
    const livereloadMiddleware = livereload({
      port: 35729,
      applyScriptTag: true,
    });
    app.use(livereloadMiddleware);

    app.get("/livereload.js", (req, res) => {
      res.setHeader("Content-Type", "application/javascript");
      res.send(livereloadMiddleware.getClientScript());
    });
  }
};

export default configurReload;
