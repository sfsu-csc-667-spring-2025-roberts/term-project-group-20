import { NextFunction, Request, Response } from "express";
import express from "express";

// Middleware to parse URL-encoded and JSON request bodies
const bodyParserMiddleware = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  // Check if request body is undefined
  if (!request.body) {
    return response.status(400).send("Request body is missing.");
  }

  // Parse urlencoded data (for forms) and JSON data
  express.urlencoded({ extended: true })(request, response, () => {
    express.json()(request, response, next); // Proceed to the next middleware
  });
};

export { bodyParserMiddleware };
