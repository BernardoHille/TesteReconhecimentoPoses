let video;
let bodyPose;
let poses = [];
let connections;
let balls = [];
let spriteImg;              // <- imagem do sprite

// 🎛️ Configurações fáceis:
const BALL_RADIUS_BASE = 15; // base para colisão, será substituída por SPRITE_SIZE/2
const SPRITE_SIZE = 40;      // tamanho que o sprite será desenhado (ajuste aqui)
let BALL_SPEED = 3;          // velocidade da queda
let BALL_SPAWN_INTERVAL = 120; // em frames (menor = mais frequente)

let score = 0;
let frameCounter = 0;

function preload() {
  // Use WebP com alpha (ou PNG). Troque o caminho conforme seu projeto.
  spriteImg = loadImage('assets/coin.webp');
}

async function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  bodyPose = await ml5.bodyPose();
  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getConnections();

  // Começa com algumas "moedas"
  for (let i = 0; i < 10; i++) {
    balls.push(createBall());
  }

  imageMode(CENTER);         // facilita centralizar o sprite na posição da “bolinha”
  textSize(32);
  textAlign(LEFT, TOP);
  fill(255);
}

function draw() {
  background(0);
  image(video, 0, 0, width, height);

  // Pontuação
  fill(255);
  text("Pontos: " + score, 10, 10);

  // Frequência (por frames)
  frameCounter++;
  if (frameCounter % BALL_SPAWN_INTERVAL === 0) {
    balls.push(createBall());
  }

  // Atualiza e desenha sprites
  for (let ball of balls) {
    ball.y += BALL_SPEED;

    if (ball.y > height + ball.r) {
      resetBall(ball);
    }

    noStroke();
    if (spriteImg) {
      image(spriteImg, ball.x, ball.y, SPRITE_SIZE, SPRITE_SIZE);
    } else {
      // fallback visual se a imagem não carregar
      fill(0, 100, 255);
      circle(ball.x, ball.y, ball.r * 2);
    }
  }

  // Colisão com esqueleto e keypoints
  for (let pose of poses) {
    // Conexões (linhas)
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

    // Pontos do corpo
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
  // Usa raio baseado no tamanho do sprite para colisão aproximada circular
  const r = SPRITE_SIZE / 2;
  return {
    x: random(width),
    y: random(-height, 0),
    r
  };
}

function resetBall(ball) {
  ball.x = random(width);
  ball.y = random(-50, -10);
  ball.r = SPRITE_SIZE / 2; // garante que r acompanha o tamanho atual
}

// Responsivo
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
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  let dx = px - xx;
  let dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}