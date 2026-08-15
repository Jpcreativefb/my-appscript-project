# Production smoke test v1.1.3

1. Open the project using VS Code Live Server.
2. Reload the page once so the old localhost service worker is removed.
3. Open browser DevTools > Application > Service Workers and confirm no service worker controls `127.0.0.1`.
4. Open `frontend/js/pages/adminGames.js` directly in the browser and confirm JavaScript text loads.
5. Open Admin > Manage Games and confirm the page loads.
6. Run Check on the incomplete Reality TV game.
7. Select Repair Reality TV Setup.
8. Confirm the main elimination question and all enabled extra questions appear in Game Setup.
9. Confirm every built question has at least two valid answers, unless the build result explicitly says the question was skipped because fewer than two groups/teams exist.
10. Run Check again and confirm the game can proceed toward activation.
