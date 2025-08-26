let video;
let bodyPose;
let poses = [];
let connections;
let balls = [];
let coinImg; // sprite da moeda

// 🎛️ Configurações
const COIN_SIZE = 48;          // tamanho do sprite desenhado
let BALL_SPEED = 3;            // velocidade de queda
let BALL_SPAWN_INTERVAL = 1200; // em frames (menor = mais frequente)

let score = 0;
let frameCounter = 0;

// helper para carregar imagem em p5 v2 (sem preload)
function loadImageAsync(path) {
  return new Promise((resolve, reject) => {
    loadImage(path, img => resolve(img), err => reject(err));
  });
}

async function setup() {
  createCanvas(windowWidth, windowHeight);

  // carrega sprite (ajuste o caminho se necessário)
  try {
    coinImg = await loadImageAsync('coin.webp'); 
  } catch (e) {
    console.error('Falha ao carregar coin.webp:', e);
  }

  // vídeo
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  // ml5 body pose
  bodyPose = await ml5.bodyPose();
  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getConnections();

  // moedas iniciais
  for (let i = 0; i < 10; i++) {
    balls.push(createBall());
  }

  imageMode(CENTER);
  textSize(32);
  textAlign(LEFT, TOP);
  fill(255);
}

function draw() {
  background(0);
  image(video, 0, 0, width, height);

  // HUD
  fill(255);
  text("Pontos: " + score, 10, 10);

  // spawn por frames
  frameCounter++;
  if (frameCounter % BALL_SPAWN_INTERVAL === 0) {
    balls.push(createBall());
  }

  // atualizar/desenhar moedas
  for (let ball of balls) {
    ball.y += BALL_SPEED;

    if (ball.y > height + ball.r) {
      resetBall(ball);
    }

    // desenha sprite (sem fallback)
    if (coinImg) image(coinImg, ball.x, ball.y, COIN_SIZE, COIN_SIZE);
  }

  // colisão com esqueleto e keypoints
  for (let pose of poses) {
    // conexões (linhas)
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

    // pontos do corpo
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
  // raio aproximado baseado no tamanho do sprite
  return {
    x: random(width),
    y: random(-height, 0),
    r: COIN_SIZE / 2
  };
}

function resetBall(ball) {
  ball.x = random(width);
  ball.y = random(-50, -10);
  ball.r = COIN_SIZE / 2;
}

// responsivo
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(windowWidth, windowHeight);
}

// distância ponto-segmento
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