"use server";

import { getTopScores, getUserBestScore } from "@/lib/supabase/queries";
import type { UserBestScore } from "@/lib/supabase/queries";
import type { Score } from "@/lib/types";

export async function getScoresForGameAction(
  gameId: string,
): Promise<{ scores: Score[] }> {
  const scores = await getTopScores(gameId, 12);
  return { scores };
}

export async function getUserBestScoreAction(
  gameId: string,
  name: string,
): Promise<{ userBest: UserBestScore | null }> {
  const userBest = await getUserBestScore(gameId, name);
  return { userBest };
}
