-- Reemplaza el placeholder "serpentina" por el juego real "snake" (SPEC 09).
delete from av_games where id = 'serpentina';

insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('snake', 'SNAKE', 'Crece comiendo fruta sin morder tu propia cola.', 'Guía a la serpiente por una grilla neón cazando frutas de colores. Cada bocado la alarga y acelera el ritmo del juego. Un giro en falso contra el borde o contra tu propia cola termina la partida al instante.', 'ARCADE', 'cover-snake', 'green', 7820, '9.1K');
