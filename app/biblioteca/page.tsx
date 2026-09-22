import { getGames } from "@/lib/supabase/queries";
import BibliotecaClient from "@/components/biblioteca/biblioteca-client";

export default async function Biblioteca() {
  const games = await getGames();
  return <BibliotecaClient games={games} />;
}
