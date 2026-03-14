import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'db.json');

// Helper to read DB
const readDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDB = {
      users: {}, // { username: { lastActive: timestamp, country: string } }
      games: {}, // { gameId: { player1: string, player2: string, p1Choice: string|null, p2Choice: string|null, status: 'waiting'|'playing'|'finished', result: any } }
      leaderboard: [] // { username: string, country: string, wins: number, losses: number, draws: number, timestamp: number }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
    return defaultDB;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
};

// Helper to write DB
const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// Helper to clear inactive users (last active > 15 mins)
const clearInactiveUsers = () => {
  const db = readDB();
  const now = Date.now();
  const fifteenMins = 15 * 60 * 1000;

  let changed = false;

  for (const username in db.users) {
    if (now - db.users[username].lastActive > fifteenMins) {
      delete db.users[username];
      changed = true;

      // Also clean up any games they were in (waiting or playing)
      for (const gameId in db.games) {
        if (db.games[gameId].status !== 'finished' && (db.games[gameId].player1 === username || db.games[gameId].player2 === username)) {
            delete db.games[gameId];
        }
      }
    }
  }

  if (changed) {
    writeDB(db);
  }
};

app.get('/ping', (req, res) => {
  res.send('pong');
});

// Update user last active timestamp
const touchUser = (db, username) => {
  if (db.users[username]) {
    db.users[username].lastActive = Date.now();
  }
};

app.post('/api/join', (req, res) => {
  clearInactiveUsers(); // check and clear anytime a user selects multiplayer

  const { username, country } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const db = readDB();

  // If username exists and is not the current session trying to rejoin
  // Actually, we'll allow rejoining if they are already in users to recover state.
  if (!db.users[username]) {
    db.users[username] = {
      lastActive: Date.now(),
      country: country || 'Unknown',
    };
  } else {
    // Just touch lastActive
    touchUser(db, username);
  }

  // Find if they are already in a game
  let activeGameId = Object.keys(db.games).find(id => {
    const g = db.games[id];
    return (g.player1 === username || g.player2 === username) && g.status !== 'finished';
  });

  if (!activeGameId) {
    // Try to find a waiting game
    const waitingGameId = Object.keys(db.games).find(id => db.games[id].status === 'waiting' && db.games[id].player1 !== username);

    if (waitingGameId) {
      // Join game
      db.games[waitingGameId].player2 = username;
      db.games[waitingGameId].status = 'playing';
      activeGameId = waitingGameId;
    } else {
      // Create new game
      const newGameId = `game_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      db.games[newGameId] = {
        player1: username,
        player2: null,
        p1Choice: null,
        p2Choice: null,
        status: 'waiting',
        result: null
      };
      activeGameId = newGameId;
    }
  }

  writeDB(db);
  res.json({ success: true, gameId: activeGameId });
});

app.get('/api/state', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });

  const db = readDB();
  touchUser(db, username);

  // Find game for user
  const gameId = Object.keys(db.games).find(id => {
    const g = db.games[id];
    return g.player1 === username || g.player2 === username;
  });

  if (!gameId) {
    writeDB(db);
    return res.json({ status: 'not_found' });
  }

  const game = db.games[gameId];

  // Clean up finished games after some time? Not necessary right now, but we'll clear them later when starting a new one.

  const isPlayer1 = game.player1 === username;
  const opponent = isPlayer1 ? game.player2 : game.player1;
  const myChoice = isPlayer1 ? game.p1Choice : game.p2Choice;
  const opponentChoice = isPlayer1 ? game.p2Choice : game.p1Choice;

  // Mask opponent choice if game is still playing
  let safeOpponentChoice = null;
  if (game.status === 'finished') {
    safeOpponentChoice = opponentChoice;
  }

  writeDB(db);

  res.json({
    status: game.status,
    opponent,
    hasOpponentChosen: !!opponentChoice,
    myChoice,
    opponentChoice: safeOpponentChoice,
    result: game.result
  });
});

app.post('/api/choice', (req, res) => {
  const { username, choice } = req.body;
  if (!username || !choice) {
    return res.status(400).json({ error: 'Username and choice are required' });
  }

  const db = readDB();
  touchUser(db, username);

  const gameId = Object.keys(db.games).find(id => {
    const g = db.games[id];
    return (g.player1 === username || g.player2 === username) && g.status === 'playing';
  });

  if (!gameId) {
    writeDB(db);
    return res.status(404).json({ error: 'No active game found' });
  }

  const game = db.games[gameId];
  const isPlayer1 = game.player1 === username;

  if (isPlayer1) {
    game.p1Choice = choice;
  } else {
    game.p2Choice = choice;
  }

  // Check if both have chosen
  if (game.p1Choice && game.p2Choice) {
    game.status = 'finished';

    let p1Result = 'draw';
    let p2Result = 'draw';

    if (game.p1Choice !== game.p2Choice) {
      if (
        (game.p1Choice === 'rock' && game.p2Choice === 'scissor') ||
        (game.p1Choice === 'scissor' && game.p2Choice === 'paper') ||
        (game.p1Choice === 'paper' && game.p2Choice === 'rock')
      ) {
        p1Result = 'win';
        p2Result = 'lose';
      } else {
        p1Result = 'lose';
        p2Result = 'win';
      }
    }

    game.result = {
      [game.player1]: p1Result,
      [game.player2]: p2Result
    };

    // Update leaderboard
    const now = Date.now();
    for (const p of [game.player1, game.player2]) {
      const pResult = game.result[p];
      const userCountry = db.users[p]?.country || 'Unknown';

      db.leaderboard.push({
        username: p,
        country: userCountry,
        result: pResult,
        timestamp: now
      });
    }
  }

  writeDB(db);
  res.json({ success: true });
});

app.get('/api/leaderboard', (req, res) => {
  const db = readDB();
  const now = Date.now();

  const getStats = (filterFn) => {
    const stats = {};
    for (const entry of db.leaderboard) {
      if (filterFn(entry)) {
        if (!stats[entry.username]) {
          stats[entry.username] = { username: entry.username, country: entry.country, wins: 0, losses: 0, draws: 0, score: 0 };
        }
        if (entry.result === 'win') { stats[entry.username].wins += 1; stats[entry.username].score += 3; }
        else if (entry.result === 'lose') { stats[entry.username].losses += 1; }
        else if (entry.result === 'draw') { stats[entry.username].draws += 1; stats[entry.username].score += 1; }
      }
    }
    return Object.values(stats).sort((a, b) => b.score - a.score || b.wins - a.wins).slice(0, 10);
  };

  const day = 24 * 60 * 60 * 1000;

  res.json({
    daily: getStats(e => (now - e.timestamp) <= day),
    weekly: getStats(e => (now - e.timestamp) <= day * 7),
    monthly: getStats(e => (now - e.timestamp) <= day * 30),
    allTime: getStats(() => true)
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
