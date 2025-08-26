let video;
let bodyPose;
let poses = [];
let connections;
let coins = []; // Renomeado de 'balls' para 'coins' para clareza
let coinSprite; // Variável para armazenar a imagem da moeda

// 🎛️ Configurações fáceis:
const COIN_SIZE = 40; // Tamanho do sprite da moeda (largura e altura)
let COIN_SPEED = 3;
let COIN_SPAWN_INTERVAL = 120; // em frames

let score = 0;
let frameCounter = 0;

// --- NOVO ---
// A função preload() é executada antes do setup() e garante
// que a imagem seja carregada antes do jogo começar.
function preload() {
  // Certifique-se de que o arquivo 'coin.webp' está na mesma pasta do seu sketch.
  coinSprite = loadImage('coin.webp', 
    () => console.log("Imagem da moeda carregada com sucesso!"),
    () => console.error("Erro ao carregar a imagem 'coin.webp'. Verifique o nome e o caminho do arquivo.")
  );
}

async function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  bodyPose = await ml5.bodyPose();
  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getConnections();
  
  // --- NOVO ---
  // Define o modo de desenho da imagem a partir do centro,
  // o que facilita o cálculo de colisão.
  imageMode(CENTER);

  // Cria as moedas iniciais
  for (let i = 0; i < 10; i++) {
    coins.push(createCoin());
  }

  textSize(32);
  textAlign(LEFT, TOP);
  fill(255);
}

function draw() {
  background(0);
  
  // --- BÔNUS ---
  // Inverte a imagem do vídeo horizontalmente para criar um efeito de espelho,
  // que é mais intuitivo para o jogador.
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();


  // Pontuação
  fill(255);
  stroke(0);
  strokeWeight(4);
  text("Pontos: " + score, 10, 10);

  // Geração de novas moedas
  frameCounter++;
  if (frameCounter % COIN_SPAWN_INTERVAL === 0) {
    coins.push(createCoin());
  }

  // Atualiza e desenha as moedas
  for (let coin of coins) {
    coin.y += COIN_SPEED;

    // Se a moeda sair da tela, reseta sua posição
    if (coin.y > height + coin.r) {
      resetCoin(coin);
    }
    
    // --- MUDANÇA PRINCIPAL ---
    // Em vez de desenhar um círculo, desenhamos a imagem da moeda.
    image(coinSprite, coin.x, coin.y, COIN_SIZE, COIN_SIZE);
  }

  // Desenha o esqueleto e verifica a colisão
  for (let pose of poses) {
    // Colisão com os "ossos" (conexões)
    for (let conn of connections) {
      let a = pose.keypoints[conn[0]];
      let b = pose.keypoints[conn[1]];
      if (a.confidence > 0.1 && b.confidence > 0.1) {
        // Descomente as 3 linhas abaixo para ver as linhas do esqueleto
        // stroke(255, 0, 0);
        // strokeWeight(2);
        // line(a.x, a.y, b.x, b.y);

        for (let coin of coins) {
          // A lógica de colisão continua a mesma, usando um raio invisível
          let d = distToSegment(coin.x, coin.y, a.x, a.y, b.x, b.y);
          if (d < coin.r) { 
            resetCoin(coin);
            score++;
          }
        }
      }
    }

    // Colisão com as "juntas" (keypoints)
    for (let k of pose.keypoints) {
      if (k.confidence > 0.1) {
        // Descomente as 3 linhas abaixo para ver as juntas do esqueleto
        // fill(0, 255, 0);
        // noStroke();
        // circle(k.x, k.y, 10);

        for (let coin of coins) {
          let d = dist(k.x, k.y, coin.x, coin.y);
          if (d < coin.r) {
            resetCoin(coin);
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

// Funções renomeadas para 'coin' para maior clareza
function createCoin() {
  return {
    x: random(width),
    y: random(-height, 0),
    r: COIN_SIZE / 2 // O raio para colisão é metade do tamanho da imagem
  };
}

function resetCoin(coin) {
  coin.x = random(width);
  coin.y = random(-height / 2, -50);
}

// Responsividade ao redimensionar a janela
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(windowWidth, windowHeight);
}

// Função para calcular a distância de um ponto a um segmento de linha (sem alterações)
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