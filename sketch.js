// ... tudo igual acima

async function setup() {
  createCanvas(windowWidth, windowHeight);

  // carrega a moeda (p5 v2 sem preload)
  coinImg = await new Promise((res, rej) => loadImage('coin.webp', res, rej));

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  bodyPose = await ml5.bodyPose();
  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getConnections();

  for (let i = 0; i < 10; i++) balls.push(createBall());

  textSize(32);
  textAlign(LEFT, TOP);
  fill(255);
}

function draw() {
  background(0);

  // >>> desenha o VÍDEO em modo CORNER (preenche o canvas)
  push();
  imageMode(CORNER);
  image(video, 0, 0, width, height);
  pop();

  // HUD
  fill(255);
  text("Pontos: " + score, 10, 10);

  // spawn por frames (igual ao seu)
  frameCounter++;
  if (frameCounter % BALL_SPAWN_INTERVAL === 0) {
    balls.push(createBall());
  }

  // >>> desenha as MOEDAS em modo CENTER
  push();
  imageMode(CENTER);
  for (let ball of balls) {
    ball.y += BALL_SPEED;
    if (ball.y > height + ball.r) resetBall(ball);
    if (coinImg) image(coinImg, ball.x, ball.y, COIN_SIZE, COIN_SIZE);
  }
  pop();

  // ... colisões com esqueleto e keypoints (seu código)
}

// manter windowResized para responsividade
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(windowWidth, windowHeight);
}

// ... resto igual (createBall, resetBall, distToSegment, etc.)
