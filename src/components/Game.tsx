import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Game.css';
import Leaderboard from './Leaderboard';
import { API_BASE_URL } from '../config';

type Weapon = 'rock' | 'paper' | 'scissor';
type GameResult = 'win' | 'lose' | 'draw' | '';

const WEAPONS: Record<Weapon, string> = {
  rock: '✊🏻',
  paper: '✋🏻',
  scissor: '✌🏻',
};

const WEAPON_KEYS = Object.keys(WEAPONS) as Weapon[];

const Game: React.FC = () => {
  // Lazily initialize state from sessionStorage to avoid unnecessary re-renders
  const [wins, setWins] = useState<number>(() => parseInt(sessionStorage.getItem('wins') || '0', 10));
  const [loses, setLoses] = useState<number>(() => parseInt(sessionStorage.getItem('loses') || '0', 10));
  const [activeWeapon, setActiveWeapon] = useState<Weapon | null>(null);
  const [enemyResponse, setEnemyResponse] = useState<string>('');
  const [result, setResult] = useState<GameResult>('');
  const [isChallengeMode, setIsChallengeMode] = useState<boolean>(false);
  const [challengeWeapon, setChallengeWeapon] = useState<Weapon | null>(null);
  const [challengeTimer, setChallengeTimer] = useState<number>(0);
  const [isChallengeActive, setIsChallengeActive] = useState<boolean>(false);

  // Multiplayer State
  const [username, setUsername] = useState<string>('');
  const [isMultiplayer, setIsMultiplayer] = useState<boolean>(false);
  const [opponent, setOpponent] = useState<string | null>(null);
  const [multiplayerState, setMultiplayerState] = useState<'idle' | 'waiting' | 'playing' | 'finished'>('idle');

  // Use a ref to hold the interval ID for cleanup
  const challengeIntervalRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Update sessionStorage whenever wins or loses change
  useEffect(() => {
    sessionStorage.setItem('wins', wins.toString());
    sessionStorage.setItem('loses', loses.toString());
  }, [wins, loses]);

  const startChallengeRound = useCallback(() => {
    setIsChallengeActive(true);
    setResult('');
    setEnemyResponse('');
    setActiveWeapon(null);
    setChallengeTimer(2000); // 2 seconds to react

    const randomWeapon = WEAPON_KEYS[Math.floor(Math.random() * WEAPON_KEYS.length)];
    setChallengeWeapon(randomWeapon);

    if (challengeIntervalRef.current !== null) {
      window.clearInterval(challengeIntervalRef.current);
    }

    challengeIntervalRef.current = window.setInterval(() => {
      setChallengeTimer((prev) => {
        if (prev <= 100) {
          window.clearInterval(challengeIntervalRef.current!);
          challengeIntervalRef.current = null;

          // Time's up, player loses
          setResult('lose');
          setLoses((l) => l + 1);
          setIsChallengeActive(false);
          setEnemyResponse(`Too slow! vs. ${WEAPONS[randomWeapon]} ${randomWeapon}`);

          // Trigger next round
          setTimeout(() => {
            if (isChallengeMode) {
              setResult('');
            }
          }, 2000);

          return 0;
        }
        return prev - 100;
      });
    }, 100);
  }, [isChallengeMode]);

  const joinMultiplayer = async () => {
    if (!username.trim()) return;
    try {
      // Get country code
      let countryCode = 'Unknown';
      try {
        const geoData = await fetch('https://get.geojs.io/v1/ip/geo.json').then(r => r.json());
        countryCode = geoData.country_code || 'Unknown';
      } catch (e) {
        console.error('Failed to fetch country', e);
      }

      const res = await fetch(`${API_BASE_URL}/api/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, country: countryCode }),
      });

      if (res.ok) {
        setIsMultiplayer(true);
        setMultiplayerState('waiting');
        stopChallengeMode();
        setResult('');
        setActiveWeapon(null);
        setEnemyResponse('');
      }
    } catch (e) {
      console.error('Error joining multiplayer', e);
    }
  };

  const stopMultiplayer = () => {
    setIsMultiplayer(false);
    setMultiplayerState('idle');
    setOpponent(null);
    setResult('');
    setActiveWeapon(null);
    setEnemyResponse('');
  };

  const startChallengeMode = () => {
    if (isChallengeMode) {
      stopChallengeMode();
      return;
    }
    stopMultiplayer();
    setIsChallengeMode(true);
    startChallengeRound();
  };

  const playGame = useCallback(
    async (playerChoice: Weapon) => {
      if (isMultiplayer) {
        if (multiplayerState !== 'playing') return;

        setActiveWeapon(playerChoice);
        try {
          await fetch(`${API_BASE_URL}/api/choice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, choice: playerChoice }),
          });
        } catch (e) {
          console.error(e);
        }
        return; // Early return for multiplayer
      }

      if (isChallengeMode && !isChallengeActive) return;

      if (isChallengeMode) {
        if (challengeIntervalRef.current !== null) {
          window.clearInterval(challengeIntervalRef.current);
          challengeIntervalRef.current = null;
        }
        setIsChallengeActive(false);
      }

      const pcChoice = isChallengeMode && challengeWeapon
        ? challengeWeapon
        : WEAPON_KEYS[Math.floor(Math.random() * WEAPON_KEYS.length)];

      let currentResult: GameResult;

      if (playerChoice === pcChoice) {
        currentResult = 'draw';
      } else if (
        (playerChoice === 'rock' && pcChoice === 'scissor') ||
        (playerChoice === 'scissor' && pcChoice === 'paper') ||
        (playerChoice === 'paper' && pcChoice === 'rock')
      ) {
        currentResult = 'win';
      } else {
        currentResult = 'lose';
      }

      const responseString = `${playerChoice} ${WEAPONS[playerChoice]} vs. ${WEAPONS[pcChoice]} ${pcChoice}`;

      setActiveWeapon(playerChoice);
      setEnemyResponse(responseString);
      setResult(currentResult);

      if (currentResult === 'win') {
        setWins((prev) => prev + 1);
      } else if (currentResult === 'lose') {
        setLoses((prev) => prev + 1);
      }

      if (isChallengeMode) {
        setTimeout(() => {
          if (isChallengeMode) {
            setResult(''); // Clear result to trigger the next round in useEffect
          }
        }, 2000);
      }

    },
    [isChallengeMode, isChallengeActive, challengeWeapon, isMultiplayer, multiplayerState, username]
  );

  // Handle triggering next challenge round when inactive but still in challenge mode
  useEffect(() => {
    let timeout: number | undefined;
    // Don't trigger if we have a result that needs resetting via timeout
    if (isChallengeMode && !isChallengeActive && !result) {
      timeout = window.setTimeout(() => {
        if (isChallengeMode) {
          startChallengeRound();
        }
      }, 2000);
    }
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [isChallengeMode, isChallengeActive, result, startChallengeRound]);

  const resetGame = () => {
    setWins(0);
    setLoses(0);
    setActiveWeapon(null);
    setEnemyResponse('');
    setResult('');
    stopChallengeMode();
    sessionStorage.removeItem('wins');
    sessionStorage.removeItem('loses');
  };

  const stopChallengeMode = useCallback(() => {
    if (challengeIntervalRef.current !== null) {
      window.clearInterval(challengeIntervalRef.current);
      challengeIntervalRef.current = null;
    }
    setIsChallengeMode(false);
    setIsChallengeActive(false);
    setChallengeWeapon(null);
    setChallengeTimer(0);
  }, []);

  // Multiplayer Polling
  const pollMultiplayerState = useCallback(async () => {
    if (!username || !isMultiplayer) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/state?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'not_found') {
          setIsMultiplayer(false);
          setMultiplayerState('idle');
          setOpponent(null);
          return;
        }

        setMultiplayerState(data.status);
        setOpponent(data.opponent);

        // Let's handle the response correctly
        if (data.status === 'playing') {
          if (data.hasOpponentChosen && !data.opponentChoice) {
            setEnemyResponse("Opponent has chosen...");
          } else if (!data.hasOpponentChosen) {
            setEnemyResponse("Waiting for opponent to choose...");
          }
        }

        // If finished, calculate result and set it
        if (data.status === 'finished') {
           if (data.result && data.result[username]) {
             setResult(data.result[username]);
             setActiveWeapon(data.myChoice);
             if (data.opponentChoice) {
               setEnemyResponse(`${data.myChoice} ${WEAPONS[data.myChoice as Weapon]} vs. ${WEAPONS[data.opponentChoice as Weapon]} ${data.opponentChoice}`);
             }
           }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [username, isMultiplayer]);

  useEffect(() => {
    if (isMultiplayer) {
      pollIntervalRef.current = window.setInterval(pollMultiplayerState, 1000);
    } else {
      if (pollIntervalRef.current !== null) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
    return () => {
      if (pollIntervalRef.current !== null) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isMultiplayer, pollMultiplayerState]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      stopChallengeMode();
      if (pollIntervalRef.current !== null) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, [stopChallengeMode]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't register if not in a state to play
      if (isChallengeMode && !isChallengeActive) return;

      const key = event.key.toLowerCase();
      if (key === 'q') {
        playGame('rock');
      } else if (key === 'w') {
        playGame('paper');
      } else if (key === 'e') {
        playGame('scissor');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isChallengeMode, isChallengeActive, playGame]);

  return (
    <div className="game">
      {result && (
        <div id="result" className={result}>
          {result}
        </div>
      )}

      <div className="status">
        {wins}:{loses}
      </div>

      <ul className="weapons">
        {WEAPON_KEYS.map((weapon) => (
          <li
            key={weapon}
            id={weapon}
            onClick={() => {
              playGame(weapon);
            }}
            className={activeWeapon === weapon ? 'fadeIn' : activeWeapon === null ? 'fadeIn' : 'fadeOut'}
          >
            {WEAPONS[weapon]}
          </li>
        ))}
      </ul>

      {isChallengeMode && isChallengeActive && (
        <div className="timer-bar-container">
          <div
            className="timer-bar"
            style={{ width: `${(challengeTimer / 2000) * 100}%` }}
          />
        </div>
      )}

      <ul className="enemy">
        <li className={isChallengeMode && isChallengeActive ? 'challenge-reveal' : enemyResponse ? 'fadeIn' : 'fadeOut'}>
          {isChallengeMode && isChallengeActive && challengeWeapon
            ? WEAPONS[challengeWeapon]
            : isMultiplayer && multiplayerState === 'waiting'
            ? 'Waiting for opponent...'
            : enemyResponse || 'Make your move!'}
        </li>
      </ul>

      <div className="controls">
        {!isMultiplayer ? (
          <div className="multiplayer-join">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={isMultiplayer}
            />
            <button onClick={joinMultiplayer} disabled={!username.trim()}>
              Join Multiplayer
            </button>
          </div>
        ) : (
          <button onClick={stopMultiplayer}>Leave Multiplayer</button>
        )}

        <button onClick={startChallengeMode} disabled={isMultiplayer}>
          {isChallengeMode ? 'Stop Challenge' : 'Challenge Mode'}
        </button>
        <button onClick={resetGame}>Reset</button>
      </div>

      {isMultiplayer && (
        <div className="multiplayer-status">
          {multiplayerState === 'waiting' && <p>Waiting for opponent...</p>}
          {multiplayerState === 'playing' && opponent && <p>Playing against: {opponent}</p>}
          {multiplayerState === 'finished' && <button onClick={joinMultiplayer}>Play Again</button>}
        </div>
      )}

      {isChallengeMode && (
        <div className="hint">
          Use Q (Rock), W (Paper), E (Scissor) to quick-counter!
        </div>
      )}

      <div className="leaderboard-wrapper">
        <Leaderboard />
      </div>
    </div>
  );
};

export default Game;
