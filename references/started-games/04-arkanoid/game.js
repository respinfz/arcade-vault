const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;

const BLOCK_COLS = 15;
const BLOCK_ROWS = 7;
const BLOCK_W = 32;
const BLOCK_H = 16;

// Filas de arriba hacia abajo con su puntaje asociado.
const ROW_COLORS = [ 'green', 'hotpink', 'magenta', 'cyan', 'yellow', 'red', 'gray' ];
const COLOR_POINTS = { gray: 1, red: 2, yellow: 3, cyan: 4, magenta: 5, hotpink: 6, green: 7 };

// Cada layout es un arreglo de 7 strings de 15 caracteres (filas de arriba hacia abajo:
// green, hotpink, magenta, cyan, yellow, red, gray). 'X' = bloque presente, '.' = hueco.
const LEVELS = [
  {
    id: 1,
    ballSpeedMultiplier: 1.00,
    paddleWidth: 162,
    layout: [
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
    ],
  },
  {
    id: 2,
    ballSpeedMultiplier: 1.15,
    paddleWidth: 152,
    layout: [
      'XXXXXXX.XXXXXXX',
      'XXXXXXX.XXXXXXX',
      'XXXXXXX.XXXXXXX',
      'XXXXXXX.XXXXXXX',
      'XXXXXXX.XXXXXXX',
      'XXXXXXX.XXXXXXX',
      'XXXXXXX.XXXXXXX',
    ],
  },
  {
    id: 3,
    ballSpeedMultiplier: 1.30,
    paddleWidth: 142,
    layout: [
      'XXX.XXXXXXX.XXX',
      'XXX.XXXXXXX.XXX',
      'XXX.XXXXXXX.XXX',
      'XXX.XXXXXXX.XXX',
      'XXX.XXXXXXX.XXX',
      'XXX.XXXXXXX.XXX',
      'XXX.XXXXXXX.XXX',
    ],
  },
  {
    id: 4,
    ballSpeedMultiplier: 1.45,
    paddleWidth: 132,
    layout: [
      '..XXXXXXXXXXX..',
      '.XXXXXXXXXXXXX.',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      '.XXXXXXXXXXXXX.',
      '..XXXXXXXXXXX..',
    ],
  },
  {
    id: 5,
    ballSpeedMultiplier: 1.60,
    paddleWidth: 122,
    layout: [
      'X.X.X.X.X.X.X.X',
      '.X.X.X.X.X.X.X.',
      'X.X.X.X.X.X.X.X',
      '.X.X.X.X.X.X.X.',
      'X.X.X.X.X.X.X.X',
      '.X.X.X.X.X.X.X.',
      'X.X.X.X.X.X.X.X',
    ],
  },
];

function createBlocks( layout ) {
  const blocks = [];
  for ( let row = 0; row < BLOCK_ROWS; row++ ) {
    const color = ROW_COLORS[ row ];
    for ( let col = 0; col < BLOCK_COLS; col++ ) {
      if ( layout[ row ][ col ] !== 'X' ) continue;

      blocks.push( {
        x: col * BLOCK_W,
        y: row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color,
        points: COLOR_POINTS[ color ],
        alive: true,
      } );
    }
  }
  return blocks;
}

const state = {
  status: 'start', // 'start' | 'playing' | 'paused' | 'gameover' | 'win'
  score: 0,
  lives: 3,
  highScore: 0,
  muted: false,
  level: 1,

  paddle: { x: 159, y: 600, w: 162, h: 14, speed: 6 },

  ball: {
    x: 240, y: 592, w: 16, h: 16,
    vx: 0, vy: 0,
    attached: true,
  },

  blocks: createBlocks( LEVELS[ 0 ].layout ),

  explosions: [],
};

const HIGH_SCORE_KEY = 'arkanoid:highScore:v1';

function loadHighScore() {
  try {
    const raw = localStorage.getItem( HIGH_SCORE_KEY );
    if ( !raw ) return 0;
    const parsed = JSON.parse( raw );
    return typeof parsed.value === 'number' ? parsed.value : 0;
  } catch ( e ) {
    return 0;
  }
}

function saveHighScore() {
  try {
    localStorage.setItem( HIGH_SCORE_KEY, JSON.stringify( { value: state.highScore } ) );
  } catch ( e ) {
    // localStorage no disponible: el high score no persiste, pero el juego sigue funcionando.
  }
}

function updateHighScore() {
  if ( state.score > state.highScore ) {
    state.highScore = state.score;
    saveHighScore();
  }
}

state.highScore = loadHighScore();

const sounds = {
  ballBounce: new Audio( 'assets/sounds/ball-bounce.mp3' ),
  breakBlock: new Audio( 'assets/sounds/break-sound.mp3' ),
};

function playSound( audio ) {
  if ( state.muted ) return;
  audio.currentTime = 0;
  audio.play();
}

const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );

function drawScene() {
  ctx.clearRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  for ( const block of state.blocks ) {
    if ( !block.alive ) continue;
    drawSprite( ctx, `block_${ block.color }`, block.x, block.y, block.w, block.h );
  }

  drawSprite( ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h );
  drawSprite( ctx, 'ball', state.ball.x, state.ball.y, state.ball.w, state.ball.h );

  const now = performance.now();
  for ( const explosion of state.explosions ) {
    const elapsed = now - explosion.startTime;
    const frameIndex = Math.min( 3, Math.floor( elapsed / ( EXPLOSION_DURATION / 4 ) ) );
    const frame = EXPLOSION_FRAMES[ explosion.color ][ frameIndex ];
    drawFrame( ctx, frame, explosion.x, explosion.y, BLOCK_W, BLOCK_H );
  }
}

const HUD_HEIGHT = 18;

function drawHUD() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, HUD_HEIGHT );

  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';

  ctx.textAlign = 'left';
  ctx.fillText( `Score: ${ state.score }`, 6, 13 );

  ctx.textAlign = 'center';
  ctx.fillText( `Nivel ${ state.level }/5   Vidas: ${ state.lives }`, CANVAS_WIDTH / 2, 13 );

  ctx.textAlign = 'right';
  ctx.fillText( `High score: ${ state.highScore }`, CANVAS_WIDTH - 6, 13 );
}

function drawStartOverlay() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';

  ctx.font = 'bold 32px sans-serif';
  ctx.fillText( 'ARKANOID', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40 );

  ctx.font = '18px sans-serif';
  ctx.fillText( 'Presiona ESPACIO para empezar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 );

  ctx.font = '16px sans-serif';
  ctx.fillText( `High score: ${ state.highScore }`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30 );
}

function drawPauseOverlay() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';

  ctx.font = 'bold 32px sans-serif';
  ctx.fillText( 'PAUSA', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 );
}

function drawLevelCompleteOverlay() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';

  ctx.font = 'bold 32px sans-serif';
  ctx.fillText( `Nivel ${ state.level } completado`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20 );

  ctx.font = '16px sans-serif';
  ctx.fillText( 'Presiona ESPACIO para continuar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20 );
}

function drawEndOverlay( title ) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';

  ctx.font = 'bold 32px sans-serif';
  ctx.fillText( title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60 );

  ctx.font = '18px sans-serif';
  ctx.fillText( `Puntaje: ${ state.score }`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20 );
  ctx.fillText( `High score: ${ state.highScore }`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10 );

  ctx.font = '16px sans-serif';
  ctx.fillText( 'Presiona ESPACIO para reiniciar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50 );
}

const keys = {};

function updatePaddle() {
  if ( keys[ 'ArrowLeft' ] ) state.paddle.x -= state.paddle.speed;
  if ( keys[ 'ArrowRight' ] ) state.paddle.x += state.paddle.speed;

  state.paddle.x = Math.max( 0, Math.min( CANVAS_WIDTH - state.paddle.w, state.paddle.x ) );
}

const BALL_SPEED = 5;

function launchBall() {
  const multiplier = LEVELS[ state.level - 1 ].ballSpeedMultiplier;

  state.ball.attached = false;
  state.ball.vx = 0;
  state.ball.vy = -BALL_SPEED * multiplier;
}

function updateBall() {
  const ball = state.ball;

  if ( ball.attached ) {
    ball.x = state.paddle.x + state.paddle.w / 2 - ball.w / 2;
    ball.y = state.paddle.y - ball.h;
    return;
  }

  ball.x += ball.vx;
  ball.y += ball.vy;

  if ( ball.x <= 0 ) {
    ball.x = 0;
    ball.vx *= -1;
    playSound( sounds.ballBounce );
  } else if ( ball.x + ball.w >= CANVAS_WIDTH ) {
    ball.x = CANVAS_WIDTH - ball.w;
    ball.vx *= -1;
    playSound( sounds.ballBounce );
  }

  if ( ball.y <= 0 ) {
    ball.y = 0;
    ball.vy *= -1;
    playSound( sounds.ballBounce );
  }

  checkPaddleCollision();
  checkBlockCollision();
  checkWinCondition();
  checkBallLost();
}

function checkWinCondition() {
  if ( !state.blocks.every( ( block ) => !block.alive ) ) return;

  state.status = state.level === 5 ? 'completed' : 'win';
}

function checkBallLost() {
  const ball = state.ball;

  if ( ball.y <= CANVAS_HEIGHT ) return;

  state.lives -= 1;

  if ( state.lives <= 0 ) {
    state.status = 'gameover';
  } else {
    ball.attached = true;
    ball.vx = 0;
    ball.vy = 0;
  }
}

function checkBlockCollision() {
  const ball = state.ball;

  for ( const block of state.blocks ) {
    if ( !block.alive ) continue;

    const collides = ball.x < block.x + block.w
      && ball.x + ball.w > block.x
      && ball.y < block.y + block.h
      && ball.y + ball.h > block.y;

    if ( !collides ) continue;

    block.alive = false;
    state.score += block.points;
    updateHighScore();
    state.explosions.push( { x: block.x, y: block.y, color: block.color, startTime: performance.now() } );
    playSound( sounds.breakBlock );

    const overlapX = Math.min( ball.x + ball.w - block.x, block.x + block.w - ball.x );
    const overlapY = Math.min( ball.y + ball.h - block.y, block.y + block.h - ball.y );

    if ( overlapX < overlapY ) {
      ball.vx *= -1;
    } else {
      ball.vy *= -1;
    }

    break; // un solo bloque por frame
  }
}

function updateExplosions() {
  const now = performance.now();
  state.explosions = state.explosions.filter( ( e ) => now - e.startTime < EXPLOSION_DURATION );
}

const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60 grados desde la vertical

function checkPaddleCollision() {
  const ball = state.ball;
  const paddle = state.paddle;

  if ( ball.vy <= 0 ) return; // solo rebota si la bola va cayendo

  const collides = ball.x < paddle.x + paddle.w
    && ball.x + ball.w > paddle.x
    && ball.y < paddle.y + paddle.h
    && ball.y + ball.h > paddle.y;

  if ( !collides ) return;

  const ballCenterX = ball.x + ball.w / 2;
  const paddleCenterX = paddle.x + paddle.w / 2;
  const relativeIntersect = Math.max( -1, Math.min( 1, ( ballCenterX - paddleCenterX ) / ( paddle.w / 2 ) ) );

  const angle = relativeIntersect * MAX_BOUNCE_ANGLE;
  const speed = Math.hypot( ball.vx, ball.vy );

  ball.vx = speed * Math.sin( angle );
  ball.vy = -speed * Math.cos( angle );
  ball.y = paddle.y - ball.h;

  playSound( sounds.ballBounce );
}

function update() {
  if ( state.status === 'playing' ) {
    updatePaddle();
    updateBall();
    updateExplosions();
  }
}

function render() {
  drawScene();

  if ( state.status === 'start' ) {
    drawStartOverlay();
  } else if ( state.status === 'gameover' ) {
    drawEndOverlay( 'GAME OVER' );
  } else if ( state.status === 'win' ) {
    drawLevelCompleteOverlay();
  } else if ( state.status === 'completed' ) {
    drawEndOverlay( 'JUEGO COMPLETADO' );
  } else if ( state.status === 'paused' ) {
    drawHUD();
    drawPauseOverlay();
  } else if ( state.status === 'playing' ) {
    drawHUD();
  }
}

function applyLevelPaddleWidth() {
  state.paddle.w = LEVELS[ state.level - 1 ].paddleWidth;
  state.paddle.x = ( CANVAS_WIDTH - state.paddle.w ) / 2;
}

function advanceLevel() {
  state.level += 1;
  state.blocks = createBlocks( LEVELS[ state.level - 1 ].layout );
  state.explosions = [];

  applyLevelPaddleWidth();

  state.ball.attached = true;
  state.ball.vx = 0;
  state.ball.vy = 0;

  state.status = 'playing';
}

function resetGame() {
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  state.blocks = createBlocks( LEVELS[ state.level - 1 ].layout );
  state.explosions = [];

  applyLevelPaddleWidth();

  state.ball.attached = true;
  state.ball.vx = 0;
  state.ball.vy = 0;

  state.status = 'playing';
}

function loop() {
  update();
  render();
  requestAnimationFrame( loop );
}

window.addEventListener( 'keydown', ( e ) => {
  keys[ e.code ] = true;

  if ( e.code === 'Space' && state.status === 'start' ) {
    state.status = 'playing';
  } else if ( e.code === 'Space' && state.status === 'playing' && state.ball.attached ) {
    launchBall();
  } else if ( e.code === 'Space' && ( state.status === 'gameover' || state.status === 'completed' ) ) {
    resetGame();
  } else if ( e.code === 'Space' && state.status === 'win' ) {
    advanceLevel();
  } else if ( ( e.code === 'KeyP' || e.code === 'Escape' ) && state.status === 'playing' ) {
    state.status = 'paused';
  } else if ( ( e.code === 'KeyP' || e.code === 'Escape' ) && state.status === 'paused' ) {
    state.status = 'playing';
  } else if ( e.code === 'KeyM' ) {
    state.muted = !state.muted;
  }
} );

window.addEventListener( 'keyup', ( e ) => {
  keys[ e.code ] = false;
} );

loadSpritesheet( () => requestAnimationFrame( loop ) );
