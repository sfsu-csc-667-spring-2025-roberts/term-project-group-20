document.getElementById('start-game-btn')?.addEventListener('click', () => {
  alert('Game start here');
});

document.getElementById('log-out-btn')?.addEventListener('click', () => {
  alert('Log out here');
  // Redirect to the login page
  window.location.href = '/auth/login'; // Redirects to the /login route
});
