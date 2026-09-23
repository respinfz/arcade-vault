-- Reemplaza el placeholder "bloque-buster" por el juego real "arkanoid" (SPEC 08).
delete from av_games where id = 'bloque-buster';

insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('arkanoid', 'ARKANOID', 'Rebota la bola y destruye 5 niveles de muros de neón.', 'Controlás una pala luminosa que devuelve una bola de plasma contra murallas de bloques cromáticos. Sobreviví cinco niveles de dificultad creciente, con paredes cada vez más angostas y una bola cada vez más veloz, sin perder tus tres vidas.', 'ARCADE', 'cover-arkanoid', 'cyan', 28450, '12.4K');
