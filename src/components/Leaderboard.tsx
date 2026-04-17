import React, { useEffect, useState } from 'react';
import './Leaderboard.css';
import { API_BASE_URL } from '../config';

interface LeaderboardEntry {
  username: string;
  country: string;
  wins: number;
  losses: number;
  draws: number;
  score: number;
}

interface LeaderboardData {
  daily: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
}

type TabType = 'daily' | 'weekly' | 'monthly' | 'allTime';

// Simple helper to convert country code to flag emoji
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode === 'Unknown' || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char =>  127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const Leaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('allTime');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/leaderboard`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error('Failed to fetch leaderboard', e);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000); // refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (!data) return <div className="leaderboard">Loading Leaderboard...</div>;

  const currentData = data[activeTab];

  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      <div className="leaderboard-tabs">
        <button className={activeTab === 'daily' ? 'active' : ''} onClick={() => setActiveTab('daily')}>Daily</button>
        <button className={activeTab === 'weekly' ? 'active' : ''} onClick={() => setActiveTab('weekly')}>Weekly</button>
        <button className={activeTab === 'monthly' ? 'active' : ''} onClick={() => setActiveTab('monthly')}>Monthly</button>
        <button className={activeTab === 'allTime' ? 'active' : ''} onClick={() => setActiveTab('allTime')}>All-Time</button>
      </div>

      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Wins</th>
            <th>Draws</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {currentData.length === 0 ? (
            <tr>
              <td colSpan={5}>No games played yet!</td>
            </tr>
          ) : (
            currentData.map((entry, index) => (
              <tr key={entry.username}>
                <td>#{index + 1}</td>
                <td>
                  <span className="flag">{getFlagEmoji(entry.country)}</span> {entry.username}
                </td>
                <td>{entry.wins}</td>
                <td>{entry.draws}</td>
                <td>{entry.score}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
