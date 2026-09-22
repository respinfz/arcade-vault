import { getGames, getTopScores } from "@/lib/supabase/queries";
import HallClient from "@/components/hall/hall-client";

export default async function HallOfFamePage() {
  const games = await getGames();
  const initialScores = await getTopScores(games[0].id, 12);

  return <HallClient games={games} initialScores={initialScores} />;
}
