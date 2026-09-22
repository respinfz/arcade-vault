import { getGames } from "@/lib/supabase/queries";
import HomeClient from "@/components/home/home-client";

export default async function Home() {
  const games = await getGames();
  return <HomeClient games={games} />;
}
