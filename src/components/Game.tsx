import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Game.css';

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
  const [isPcVsPc, setIsPcVsPc] = useState<boolean>(false);
  const [isChallengeMode, setIsChallengeMode] = useState<boolean>(false);
  const [challengeWeapon, setChallengeWeapon] = useState<Weapon | null>(null);
  const [challengeTimer, setChallengeTimer] = useState<number>(0);
  const [isChallengeActive, setIsChallengeActive] = useState<boolean>(false);

  // Use a ref to hold the interval ID for cleanup
  const pcIntervalRef = useRef<number | null>(null);
  const challengeIntervalRef = useRef<number | null>(null);

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

  const startChallengeMode = () => {
    if (isChallengeMode) {
      stopChallengeMode();
      return;
    }
    stopPcVsPc();
    setIsChallengeMode(true);
    startChallengeRound();
  };

  const playGame = useCallback(
    (playerChoice: Weapon) => {
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
    [isChallengeMode, isChallengeActive, challengeWeapon]
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
    stopPcVsPc();
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

  const stopPcVsPc = useCallback(() => {
    if (pcIntervalRef.current !== null) {
      window.clearInterval(pcIntervalRef.current);
      pcIntervalRef.current = null;
    }
    setIsPcVsPc(false);
  }, []);

  const startPcVsPc = () => {
    if (isPcVsPc) {
      stopPcVsPc();
      return;
    }

    stopChallengeMode();
    setIsPcVsPc(true);
    pcIntervalRef.current = window.setInterval(() => {
      const randomWeapon = WEAPON_KEYS[Math.floor(Math.random() * WEAPON_KEYS.length)];
      playGame(randomWeapon);
    }, 1000);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      stopPcVsPc();
      stopChallengeMode();
    };
  }, [stopPcVsPc, stopChallengeMode]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't register if not in a state to play
      if (isPcVsPc) return;
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
  }, [isPcVsPc, isChallengeMode, isChallengeActive, playGame]);

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
              if (isPcVsPc) stopPcVsPc();
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
            : enemyResponse || 'Make your move!'}
        </li>
      </ul>

      <div className="controls">
        <button onClick={startPcVsPc} disabled={isChallengeMode}>
          {isPcVsPc ? 'Stop PC' : 'PC vs. PC'}
        </button>
        <button onClick={startChallengeMode} disabled={isPcVsPc}>
          {isChallengeMode ? 'Stop Challenge' : 'Challenge Mode'}
        </button>
        <button onClick={resetGame}>Reset</button>
      </div>
      {isChallengeMode && (
        <div className="hint">
          Use Q (Rock), W (Paper), E (Scissor) to quick-counter!
        </div>
      )}
    </div>
  );
};

export default Game;
