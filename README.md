# Snake

A small classic Snake game built with plain HTML, CSS, and JavaScript.

## Features

- Classic snake movement with keyboard and touch controls
- Pause/resume and restart support
- Local leaderboard that stores the last 5 games
- Player name field saved in local storage

## Run

1. Open `index.html` in any modern browser.

## Files

- `index.html`: page structure and leaderboard section
- `style.css`: styling, including player name input and leaderboard
- `script.js`: deterministic game state, rendering, controls, and leaderboard persistence

## Manual Verification

- Start moving with arrow keys and `W`, `A`, `S`, `D`
- On-screen buttons move the snake on touch or mouse devices
- Pause and resume with `Space`, `P`, or the pause button
- Food increases the score and grows the snake by one segment
- Hitting a wall ends the game
- Hitting the snake body ends the game
- Restart button resets score and board
- Pressing `Enter` after game over restarts the game
- After game over, the result is added to **Last 5 Games** with player name and score

## Deploy on GitHub Pages

1. Create a new repository on GitHub (for example: `snake-game`).
2. Push this project to that repository.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` and `/ (root)`
5. Save and wait for GitHub Pages to build.
6. Your game will be available at:
   - `https://<your-username>.github.io/<repository-name>/`

### Example git commands

```bash
git init
git add .
git commit -m "Add snake game with leaderboard"
git branch -M main
git remote add origin https://github.com/<your-username>/<repository-name>.git
git push -u origin main
```
