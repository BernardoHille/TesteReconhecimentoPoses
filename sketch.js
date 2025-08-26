let video;
let bodyPose;
let poses = [];
let connections;
let balls = [];
let coinImg;                 // ← sprite da moeda

// 🎛️ Configurações
const COIN_SIZE = 48;        // tamanho desenhado do sprite
let BALL_SPEED = 3;          // velocidade de queda
let BALL_SPAWN_INTERVAL = 1200; // em frames (menor = mais frequente)

let score = 0;
let frameCounter = 0;

function preload() {
  // Coloque coin.webp na mesma pasta do sketch (ou ajuste o caminho)
  coinImg = loadImage('coin.webp');
}

async function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  bodyPose = await ml5.bodyPose();
  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getConnections();

  for (let i = 0; i < 10; i++) {
    balls.push(createBall());
  }

  imageMode(CENTER);         // centraliza o sprite na posição
  textSize(32);
  textAlign(LEFT, TOP);
  fill(255);
}

function draw() {
  background(0);
  image(video, 0, 0, width, height);

  // HUD de pontuação
  fill(255);
  text("Pontos: " + score, 10, 10);

  // Frequência de novas moedas (em frames)
  frameCounter++;
  if (frameCounter % BALL_SPAWN_INTERVAL === 0) {
    balls.push(createBall());
  }

  // Atualiza e desenha moedas
  for (let ball of balls) {
    ball.y += BALL_SPEED;

    if (ball.y > height + ball.r) {
      resetBall(ball);
    }

    // Desenha o sprite (sem fallback para circle)
    if (coinImg) {
      image(coinImg, ball.x, ball.y, COIN_SIZE, COIN_SIZE);
    }
  }

  // Colisões com esqueleto e keypoints
  for (let pose of poses) {
    // Conexões (linhas do esqueleto)
    for (let conn of connections) {
      let a = pose.keypoints[conn[0]];
      let b = pose.keypoints[conn[1]];
      if (a.confidence > 0.1 && b.confidence > 0.1) {
        stroke(255, 0, 0);
        strokeWeight(2);
        line(a.x, a.y, b.x, b.y);

        for (let ball of balls) {
          let d = distToSegment(ball.x, ball.y, a.x, a.y, b.x, b.y);
          if (d < ball.r) {
            resetBall(ball);
            score++;
          }
        }
      }
    }

    // Keypoints (juntas)
    for (let k of pose.keypoints) {
      if (k.confidence > 0.1) {
        fill(0, 255, 0);
        noStroke();
        circle(k.x, k.y, 10);

        for (let ball of balls) {
          let d = dist(k.x, k.y, ball.x, ball.y);
          if (d < ball.r) {
            resetBall(ball);
            score++;
          }
        }
      }
    }
  }
}

function gotPoses(results) {
  poses = results;
}

function createBall() {
  // raio para colisão ~ metade do tamanho desenhado
  return {
    x: random(width),
    y: random(-height, 0),
    r: COIN_SIZE / 2
  };
}

function resetBall(ball) {
  ball.x = random(width);
  ball.y = random(-50, -10);
  ball.r = COIN_SIZE / 2; // garante consistência se você trocar COIN_SIZE
}

// Responsividade
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(windowWidth, windowHeight);
}

// Distância de ponto a segmento
function distToSegment(px, py, x1, y1, x2, y2) {
  let A = px - x1;
  let B = py - y1;
  let C = x2 - x1;
  let D = y2 - y1;

  let dotProduct = A * C + B * D;
  let lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dotProduct / lenSq : -1;

  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }

  let dx = px - xx;
  let dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}
