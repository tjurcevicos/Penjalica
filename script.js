const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const livesEl = document.getElementById('lives');
const gameOverEl = document.getElementById('gameOver');
const boostStatusEl = document.getElementById('boostStatus');

let score = 0, time = 60, lives = 3, ended = false;

const player = { x: 280, y: 300, w: 28, h: 28, vy: 0 };
const gravity = 0.42; 
const jump = -12.5;   

let left = false, right = false;
let platforms = [];
let strawberries = [];

// --- VARIJABLE MEHANIKE ---
let strawberryCount = 0;
let isBoosting = false;
let boostTimer = 0;
let respawnProtection = 0; 

function makeLevel() {
  platforms = []; 
  strawberries = [];
  
  // Prva platforma je odmah ispod igrača na startu
  platforms.push({ x: player.x - 30, y: player.y + player.h + 5, w: 90, h: 12 });

  // Generiranje ostalih platformi iznad prve
  for (let i = 1; i < 18; i++) {
    const p = { x: Math.random() * 480 + 20, y: (player.y + 5) - i * 72, w: 90, h: 12 };
    platforms.push(p);
    if (Math.random() < 0.35) {
      strawberries.push({ x: p.x + 30, y: p.y - 18 });
    }
  }
}

makeLevel();

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') left = true;
  if (e.key === 'ArrowRight') right = true;
  
  if (e.key === ' ' && strawberryCount >= 10 && !isBoosting && respawnProtection <= 0) {
    strawberryCount -= 10;
    isBoosting = true;
    boostTimer = 180; // 3 sekunde na 60 FPS
    updateBoostUI();
  }
});

document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft') left = false;
  if (e.key === 'ArrowRight') right = false;
});

function updateBoostUI() {
  if (isBoosting) {
    boostStatusEl.textContent = '🚀 BOOST AKTIVAN!';
    boostStatusEl.style.color = '#f59e0b';
  } else if (strawberryCount >= 10) {
    boostStatusEl.textContent = '⚡ SPACE ZA BOOST';
    boostStatusEl.style.color = '#10b981';
  } else {
    boostStatusEl.textContent = `🍓 ${strawberryCount}/10`;
    boostStatusEl.style.color = '#60a5fa';
  }
}

function loseLife() {
  lives--;
  livesEl.textContent = '❤️'.repeat(lives);

  if (lives <= 0) {
    ended = true;
    gameOverEl.classList.remove('hidden');
    return;
  }

  // Reset pozicije na sredinu ekrana
  player.x = 280;
  player.y = 300;
  player.vy = 0;
  
  // Aktivacija zaštite na sekundu i pol
  respawnProtection = 90; 

  if (isBoosting) {
    isBoosting = false;
    boostTimer = 0;
    updateBoostUI();
  }

  // Čistimo platforme oko igrača i radimo novu sigurnu platformu točno ispod njega
  platforms = platforms.filter(p => p.y < player.y - 100 || p.y > player.y + 150);
  platforms.push({ x: player.x - 31, y: player.y + player.h + 5, w: 90, h: 12 });
}

function update() {
  if (ended) return;

  // Ako traje zaštita nakon stvaranja, odbrojavaj i smanji kretanje
  if (respawnProtection > 0) {
    respawnProtection--;
    player.vy = 0; 
    if (left) player.x -= 5;
    if (right) player.x += 5;
    moveWorldUp(0); 
    return; 
  }

  // Kretanje lijevo - desno
  if (left) player.x -= 5;
  if (right) player.x += 5;

  // LOGIKA ZA BOOST 
  if (isBoosting) {
    player.vy = 0;      
    player.y = 250;     // Igrač ostaje na fiksnoj visini dok svijet leti dolje
    boostTimer--;
    
    moveWorldUp(12);    // Brzo guranje platformi prema dolje
    
    if (boostTimer <= 0) {
      isBoosting = false;
      player.vy = jump; // Izlazni odraz prema gore nakon kraja boosta
      updateBoostUI();
    }
  } else {
    // Standardna fizika
    player.vy += gravity;
    player.y += player.vy;
  }

  // Granice ekrana s lijeve i desne strane
  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.w) player.x = canvas.width - player.w;

  // Sudar s platformama (samo ako nismo u boostu)
  if (!isBoosting) {
    for (const p of platforms) {
      if (player.vy > 0 &&
         player.x + player.w > p.x &&
         player.x < p.x + p.w &&
         player.y + player.h > p.y &&
         player.y + player.h < p.y + 15) {
          player.vy = jump;
          score += 5;
      }
    }
  }

  // Skupljanje jagoda
  strawberries = strawberries.filter(s => {
    const hit = player.x < s.x + 20 && player.x + player.w > s.x &&
                player.y < s.y + 20 && player.y + player.h > s.y;
    if (hit) {
      score += 50;
      time += 5;
      if (!isBoosting) {
        strawberryCount++;
        updateBoostUI();
      }
      return false;
    }
    return true;
  });

  // Standardno guranje kamere kada igrač ide sam prema vrhu skakanjem
  if (player.y < 250 && !isBoosting) {
    const diff = 250 - player.y;
    player.y = 250;
    moveWorldUp(diff);
  }

  // --- AUTOMATSKO PADANJE PLATFORMI (PROGRESIVNO SA STABILNOM GRANICOM) ---
  if (!isBoosting) {
    // Početna brzina je 0.6. Brzina raste lagano s bodovima, ali maksimalno do 3.5.
    // Koristimo Math.min() kako igra nikada ne bi prešla granicu ljudskih refleksa.
    let autoScrollSpeed = 0.6 + (score / 6000); 
    autoScrollSpeed = Math.min(autoScrollSpeed, 3.5); // 3.5 je idealan balans za brzu, ali igrivu akciju
    
    moveWorldUp(autoScrollSpeed);
    player.y += autoScrollSpeed; 
  }

  // Smrt ako ispadne s dna ekrana
  if (player.y > canvas.height) {
    loseLife();
  }

  scoreEl.textContent = score;
  timeEl.textContent = time;
}

function moveWorldUp(amount) {
  if (amount <= 0) return;

  platforms.forEach(p => p.y += amount);
  strawberries.forEach(s => s.y += amount);

  score += Math.floor(amount * 0.1); 

  platforms = platforms.filter(p => p.y < 650);

  while (platforms.length < 18) {
    const top = platforms.length > 0 ? Math.min(...platforms.map(p => p.y)) : 0;
    const p = { x: Math.random() * 480 + 20, y: top - 72, w: 90, h: 12 };
    platforms.push(p);

    if (Math.random() < 0.35) {
      strawberries.push({ x: p.x + 30, y: p.y - 18 });
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Crtanje platformi
  for (const p of platforms) {
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  // Crtanje jagoda
  ctx.font = '20px Arial';
  strawberries.forEach(s => ctx.fillText('🍓', s.x, s.y));

  // Plavi okvir oko ekrana za vrijeme Boosta
  if (isBoosting) {
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }

  // Crtanje igrača
  ctx.font = '28px Arial';
  
  if (respawnProtection > 0 && Math.floor(respawnProtection / 5) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  ctx.fillText('🧑', player.x, player.y + 24);
  ctx.globalAlpha = 1.0; 
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

setInterval(() => {
  if (ended) return;
  time--;
  timeEl.textContent = time;
  if (time <= 0) loseLife();
}, 1000);

loop();