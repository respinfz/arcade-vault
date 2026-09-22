"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useUser } from "@/components/providers/user-provider";
import {
  getScoresForGameAction,
  getUserBestScoreAction,
} from "@/lib/actions/scores";
import type { UserBestScore } from "@/lib/supabase/queries";
import type { Game, Score } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES");
}

export default function HallClient({
  games,
  initialScores,
}: {
  games: Game[];
  initialScores: Score[];
}) {
  const { user } = useUser();
  const [tab, setTab] = useState(games[0].id);
  const [scores, setScores] = useState(initialScores);
  const [userBest, setUserBest] = useState<UserBestScore | null>(null);
  const [isPending, startTransition] = useTransition();

  const game = games.find((g) => g.id === tab)!;

  useEffect(() => {
    if (!user) return;
    startTransition(async () => {
      const { userBest } = await getUserBestScoreAction(tab, user.name);
      setUserBest(userBest);
    });
  }, [tab, user]);

  function handleTabChange(gameId: string) {
    setTab(gameId);
    startTransition(async () => {
      const { scores } = await getScoresForGameAction(gameId);
      setScores(scores);
    });
  }

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => handleTabChange(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div
        style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 150ms" }}
      >
        {scores.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "64px 0",
              color: "var(--ink-faint)",
            }}
          >
            AÚN NO HAY PUNTAJES PARA ESTE JUEGO
          </div>
        ) : (
          <>
            <div className="podium">
              {scores[1] && (
                <div className="podium-slot silver">
                  <div className="rank-num">02</div>
                  <div className="name">{scores[1].name}</div>
                  <div className="score">
                    {scores[1].score.toLocaleString("es-ES")}
                  </div>
                  <div className="date">{fmtDate(scores[1].createdAt)}</div>
                </div>
              )}
              {scores[0] && (
                <div className="podium-slot gold">
                  <div
                    className="pixel"
                    style={{
                      fontSize: 9,
                      color: "var(--gold)",
                      letterSpacing: "0.18em",
                    }}
                  >
                    CAMPEÓN
                  </div>
                  <div
                    className="rank-num"
                    style={{ fontSize: 36, marginTop: 4 }}
                  >
                    01
                  </div>
                  <div className="name">{scores[0].name}</div>
                  <div className="score" style={{ fontSize: 20 }}>
                    {scores[0].score.toLocaleString("es-ES")}
                  </div>
                  <div className="date">{fmtDate(scores[0].createdAt)}</div>
                </div>
              )}
              {scores[2] && (
                <div className="podium-slot bronze">
                  <div className="rank-num">03</div>
                  <div className="name">{scores[2].name}</div>
                  <div className="score">
                    {scores[2].score.toLocaleString("es-ES")}
                  </div>
                  <div className="date">{fmtDate(scores[2].createdAt)}</div>
                </div>
              )}
            </div>

            <div className="hall-table">
              <div className="th">
                <div>RANGO</div>
                <div>JUGADOR</div>
                <div>PUNTUACIÓN</div>
                <div>FECHA</div>
              </div>
              {scores.map((r, i) => (
                <div
                  key={r.id}
                  className={
                    "tr" +
                    (i === 0
                      ? " top1"
                      : i === 1
                        ? " top2"
                        : i === 2
                          ? " top3"
                          : "")
                  }
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="rk">#{String(i + 1).padStart(2, "0")}</div>
                  <div className="pl">{r.name}</div>
                  <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                  <div className="dt">{fmtDate(r.createdAt)}</div>
                </div>
              ))}
              {user && userBest && (
                <>
                  <div className="tr you-label">
                    ▸ TU MEJOR MARCA EN {game.title}
                  </div>
                  <div
                    className="tr you"
                    style={{ animationDelay: `${scores.length * 50 + 50}ms` }}
                  >
                    <div className="rk" style={{ color: "var(--yellow)" }}>
                      #{String(userBest.rank).padStart(2, "0")}
                    </div>
                    <div className="pl" style={{ color: "var(--yellow)" }}>
                      {userBest.score.name}
                    </div>
                    <div
                      className="sc"
                      style={{
                        color: "var(--yellow)",
                        textShadow: "0 0 6px rgba(245,255,0,0.5)",
                      }}
                    >
                      {userBest.score.score.toLocaleString("es-ES")}
                    </div>
                    <div className="dt">
                      {fmtDate(userBest.score.createdAt)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
