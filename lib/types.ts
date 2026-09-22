export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // sufijo de clase CSS, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

export interface Score {
  id: number;
  gameId: string;
  name: string;
  score: number;
  createdAt: string;
}

export interface User {
  name: string;
}

export interface ScoreEntry {
  gameId: string;
  score: number;
  name: string;
}
