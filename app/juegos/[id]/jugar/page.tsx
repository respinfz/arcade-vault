import { notFound } from "next/navigation";
import { getGameById } from "@/lib/supabase/queries";
import JugarClient from "@/components/jugar/jugar-client";

export default async function GamePlayerPage({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = await getGameById(id);
  if (!game) notFound();

  return <JugarClient game={game} />;
}
