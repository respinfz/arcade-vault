-- Reemplaza el placeholder "caida" por el juego real "tetris" (SPEC 07).
delete from av_games where id = 'caida';

insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('tetris', 'TETRIS', 'Encaja piezas, limpia líneas y encadena combos explosivos.', 'Piezas geométricas caen sin descanso sobre un tablero de diez columnas. Gira, encaja y limpia líneas para escalar de nivel — cuidado con la tuerca, una pieza hueca que deja agujeros imposibles de tapar. Cada diez líneas cae un power-up: la bomba pulveriza un área 3×3 y el rayo barre una fila o columna entera. Encadena limpiezas seguidas para multiplicar tu puntaje hasta x5.', 'PUZZLE', 'cover-tetro', 'magenta', 184220, '31.8K');
