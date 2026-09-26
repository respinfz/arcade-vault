-- Reemplaza el placeholder "ranaria" por el juego real "frogger" (SPEC 12).
delete from av_games where id = 'ranaria';

insert into av_games (id, title, short, long, cat, cover, color) values
  ('frogger', 'FROGGER', 'Cruza la carretera y el río sin convertirte en papilla.', 'Guía a tu rana a través de una carretera repleta de coches y un río de troncos y tortugas flotantes. Llena las cinco bocas del otro lado para completar la ronda; cada nivel acelera el tráfico y acorta el tiempo. Tres vidas y mucho asfalto por delante.', 'ARCADE', 'cover-frogger', 'green');
