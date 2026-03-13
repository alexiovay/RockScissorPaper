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

  // Use a ref to hold the interval ID for cleanup
  const pcIntervalRef = useRef<number | null>(null);

  // Update sessionStorage whenever wins or loses change
  useEffect(() => {
    sessionStorage.setItem('wins', wins.toString());
    sessionStorage.setItem('loses', loses.toString());
  }, [wins, loses]);

  const playGame = useCallback(
    (playerChoice: Weapon) => {
      const pcChoice = WEAPON_KEYS[Math.floor(Math.random() * WEAPON_KEYS.length)];

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
    },
    []
  );

  const resetGame = () => {
    setWins(0);
    setLoses(0);
    setActiveWeapon(null);
    setEnemyResponse('');
    setResult('');
    stopPcVsPc();
    sessionStorage.removeItem('wins');
    sessionStorage.removeItem('loses');
  };

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
    };
  }, [stopPcVsPc]);

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

      <ul className="enemy">
        <li className={enemyResponse ? 'fadeIn' : 'fadeOut'}>
          {enemyResponse || 'Make your move!'}
        </li>
      </ul>

      <button onClick={startPcVsPc}>
        {isPcVsPc ? 'Stop PC' : 'PC vs. PC'}
      </button>
      <button onClick={resetGame}>Reset</button>
    </div>
  );
};

export default Game;
