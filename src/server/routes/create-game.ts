// routes/create-game.ts
import express, { Request, Response } from 'express';
const router = express.Router();

// Route to render the create game page
router.get('/', (req: Request, res: Response) => {
  res.render('create-game');
});

// Route to handle the form submission
router.post('/', (req: Request, res: Response) => {
  // Extract form data
  const { gameName, maxPlayers } = req.body;
  
  // Validate input
  if (!gameName || !maxPlayers) {
    return res.render('create-game', { 
      error: 'Game name and max players are required', 
      formData: req.body 
    });
  }
  
  // Create a new game in your database or game management system
  // This would typically involve:
  // 1. Generating a unique game ID
  // 2. Creating a game record in your database
  // 3. Setting the current user as the game creator/host
  
  // For now, just mock the game creation
  const gameId = Date.now().toString();
  
  // Redirect to the waiting room or game page
  res.redirect('/games/waiting-room/' + gameId);
});

export default router;