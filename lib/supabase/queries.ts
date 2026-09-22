import { createClient } from "./server";
import type { Game, Score } from "../types";

function toScore(row: {
  id: number;
  game_id: string;
  name: string;
  score: number;
  created_at: string;
}): Score {
  return {
    id: row.id,
    gameId: row.game_id,
    name: row.name,
    score: row.score,
    createdAt: row.created_at,
  };
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("av_games").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function getGameById(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("av_games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<Score[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("av_scores")
    .select("*")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toScore);
}

export interface UserBestScore {
  score: Score;
  rank: number;
}

export async function getUserBestScore(
  gameId: string,
  name: string,
): Promise<UserBestScore | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("av_scores")
    .select("*")
    .eq("game_id", gameId)
    .order("score", { ascending: false });
  if (error) throw error;
  if (!data) return null;

  const rank = data.findIndex((row) => row.name === name);
  if (rank === -1) return null;

  return { score: toScore(data[rank]), rank: rank + 1 };
}
