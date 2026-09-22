-- av_games: catálogo de juegos, reemplaza el array GAMES hardcodeado
create table av_games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  best integer not null default 0,   -- fallback decorativo, se usa solo si av_scores no tiene filas para este juego
  plays text not null default '0'    -- decorativo, ej. "12.4K"
);

alter table av_games enable row level security;
create policy "av_games_select_public" on av_games for select using (true);
-- Sin policies de insert/update/delete: solo se escribe vía migración SQL (seed).

-- av_scores: un puntaje guardado por fila, reemplaza seededScores + localStorage["av_scores"]
create table av_scores (
  id bigint generated always as identity primary key,
  game_id text not null references av_games(id) on delete cascade,
  name text not null,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index av_scores_game_id_score_idx on av_scores (game_id, score desc);

alter table av_scores enable row level security;
create policy "av_scores_select_public" on av_scores for select using (true);
create policy "av_scores_insert_public" on av_scores for insert with check (true);

-- Seed: los 8 juegos hoy hardcodeados en GAMES (lib/data.ts), sin inventar contenido nuevo.
insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('bloque-buster', 'BLOQUE BUSTER', 'Rebota la pelota y destruye muros de neón.', 'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?', 'ARCADE', 'cover-bricks', 'cyan', 28450, '12.4K'),
  ('caida', 'CAÍDA', 'Encaja las piezas antes de que el techo te aplaste.', 'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.', 'PUZZLE', 'cover-tetro', 'magenta', 184220, '31.8K'),
  ('serpentina', 'SERPENTINA', 'Crece sin morder tu propia cola.', 'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.', 'ARCADE', 'cover-snake', 'green', 7820, '9.1K'),
  ('gloton', 'GLOTÓN', 'Devora puntos y escapa de los fantasmas.', 'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.', 'ARCADE', 'cover-glot', 'yellow', 96400, '27.2K'),
  ('invasores', 'INVASORES', 'Defiende el planeta de filas alienígenas.', 'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.', 'SHOOTER', 'cover-invaders', 'green', 54190, '18.0K'),
  ('asteroides', 'ASTEROIDES', 'Pulveriza rocas espaciales en gravedad cero.', 'Tu nave triangular flota en el vacío absoluto de un campo de asteroides toroidal. Dispara y rota para partir rocas grandes en fragmentos cada vez más pequeños, esquiva los impactos y sobrevive nivel tras nivel.', 'SHOOTER', 'cover-asteroides', 'yellow', 41200, '15.6K'),
  ('ranaria', 'RANARIA', 'Cruza la autopista de pixeles.', 'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.', 'ARCADE', 'cover-rana', 'green', 18900, '6.4K'),
  ('duelo-pixel', 'DUELO PIXEL', 'Dos paletas. Una pelota. Reflejos máximos.', 'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.', 'VERSUS', 'cover-duelo', 'cyan', 24, '4.2K');
