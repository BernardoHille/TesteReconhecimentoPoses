let video, videoReady = false;
let bodyPose, poses = [], connections;
let balls = [];
let coinImg;

// ===== Config =====
const COIN_SIZE = 48;            // tamanho do sprite
let BALL_SPEED = 3;              // velocidade de queda
let BALL_SPAWN_INTERVAL = 1200;  // em frames (menor = mais moedas)
let score = 0, frameCounter = 0;

// helper p/ p5 v2 (sem preload)
function loadImageAsync(path) {
  return new Promise((resolve, reject) => {
    loadImage(path, img => resolve(img), err => reject(err));
  });
}

async function setup() {
  createCanvas(windowWidth, windowHeight);

  // 1) Carrega sprite
  try {
    coinImg = await loadImageAsync('coin.webp'); // ajuste o caminho se preciso
  } catch (e) {
    console.error('Falha ao carregar coin.webp:', e);
  }

  // 2) Câmera com constraints + fixes de autoplay/inline
  const constraints = {
    video: {
      facingMode: 'user',
      width:  { ideal: 1280 },
      height: { ideal: 720  }
    },
    audio: false
  };
  video = createCapture(constraints, () => {
    // callback após pedir permissão
  });
  video.elt.setAttribute('playsinline', ''); // iOS/Safari
  video.elt.muted = true;                    // evitar bloqueio de autoplay
  video.elt.autoplay = true;
  video.size(width, height);
  video.hide();

  // marca pronto quando metadata chega
  video.elt.onloadedmetadata = () => {
    videoReady = true;
    video.size(width, height);
    // 3) Só inicia o bodyPose quando o vídeo está pronto
    startPose();
  };
  video.elt.onplay = () => { videoReady = true; };
  video.elt.onerror = (e) => console.error('Camera error:', e);

  // 4) Inicializa ml5 (modelo) já em paralelo
  bodyPose = await ml5.bodyPose();
  connections = bodyPose.getConnections();

  // 5) moedas iniciais
  for (let i = 0; i < 10; i++) balls.push(createBall());

  textSize(32);
  textAlign(LEFT, TOP);
  fill(255);
}

function startPose() {
  try {
    bodyPose.detectStart(video, gotPoses);
  } catch (e) {
    console.error('Erro ao iniciar bodyPose:', e);
  }
}

function draw() {
  background(0);

  // Desenha vídeo só quando estiver pronto
  if (videoReady) {
    push();
    imageMode(CORNER);
    image(video, 0, 0, width, height);
    pop();
  } else {
    // mensagem amigável enquanto a câmera não está pronta
    noStroke();
    fill(255);
    text('Aguardando câmera...\nConfira permissões/HTTPS.', 10, 10);
  }

  // HUD
  fill(255);
  text("Pontos: " + score, 10, 10);

  // spawn por frames
  frameCounter++;
  if (frameCounter % BALL_SPAWN_INTERVAL === 0) {
    balls.push(createBall());
  }

  // atualiza/desenha moedas (CENTRO)
  push();
  imageMode(CENTER);
  for (let ball of balls) {
    ball.y += BALL_SPEED;
    if (ball.y > height + ball.r) resetBall(ball);
    if (coinImg) image(coinImg, ball.x, ball.y, COIN_SIZE, COIN_SIZE);
  }
  pop();

  // colisões com esqueleto e keypoints
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
          if (d < ball.r) { resetBall(ball); score++; }
        }
      }
    }

    // keypoints (juntas)
    for (let k of pose.keypoints) {
      if (k.confidence > 0.1) {
        noStroke(); fill(0, 255, 0); circle(k.x, k.y, 10);
        for (let ball of balls) {
          let d = dist(k.x, k.y, ball.x, ball.y);
          if (d < ball.r) { resetBall(ball); score++; }
        }
      }
    }
  }
}

function gotPoses(results) { poses = results; }

function createBall() {
  return { x: random(width), y: random(-height, 0), r: COIN_SIZE / 2 };
}

function resetBall(ball) {
  ball.x = random(width);
  ball.y = random(-50, -10);
  ball.r = COIN_SIZE / 2;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (video) video.size(width, height);
}

// distância ponto–segmento
function distToSegment(px, py, x1, y1, x2, y2) {
  let A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
  let dotProduct = A * C + B * D;
  let lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dotProduct / lenSq : -1;
  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  let dx = px - xx, dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}
