import express from 'express';
// import { Request, Response } from 'express';
// import {Request} from 'express';
// import {Response} from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set the views directory to where your .ejs files are located
app.set('views', path.join(__dirname, '/views/auth'));


// Serve static files (CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Handle the root route to render the home page
app.get('/', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle the /login route to render the login.ejs page
app.get('/auth/login', (req: express.Request, res: express.Response) => {
  res.render('login'); // Render 'login.ejs' from the 'views' folder
});

//-----
// Route to handle login form submission
app.post('/auth/login', (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;

  // Placeholder for login validation (replace with your own authentication logic)
  if (email === 'user@example.com' && password === 'password') {
    // Save user session or JWT
    req.session.user = { email };  // Example session data
    res.redirect('/');  // Redirect to main page after login
  } else {
    res.render('login', { error: 'Invalid email or password', email });
  }
});

// Route to render the registration page
app.get('/auth/register', (req: express.Request, res: express.Response) => {
  res.render('register'); // Render the registration form (register.ejs)
});


// Route to handle register form submission
app.post('/auth/register', (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;

  // Placeholder for registration logic (e.g., store user in database)
  if (email && password) {
    // Assuming registration is successful
    res.redirect('/login');  // Redirect to login after successful registration
  } else {
    res.render('register', { error: 'Please fill in all fields' });
  }
});
//-----


// Start the server
app.listen(port, () => {
  console.log(`UNO game app listening at http://localhost:${port}`);
});
//-------




