const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const livesEl = document.getElementById('lives');
const gameOverEl = document.getElementById('gameOver');
const boostStatusEl = document.getElementById('boostStatus');

let score = 0, time = 60, lives = 3, ended = false;

// 1. POČETNA POZICIJA: Spuštena na dno novog visokog ekrana (y: 750)
const player = { x: 280, y: 750, w: 28, h: 28, vy: 0 };
const gravity = 0.42; 
const jump = -12.5;   

let left = false, right = false;
let platforms = [];
let strawberries = [];

let strawberryCount = 0;
let isBoosting = false;
let boostTimer = 0;
let respawnProtection = 0; 

function makeLevel() {
  platforms = []; 
  strawberries = [];
  
  // Prva platforma je odmah ispod igrača na startu
  platforms.push({ x: player.x - 30, y: player.y + player.h + 5, w: 90, h: 12 });

  // 2. BROJ PLATFORMI: Povećan na 24 jer je ekran sada puno viši
  for (let i = 1; i < 24; i++) {
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
    boostTimer = 180; 
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

  // Reset pozicije na novi centar ekrana
  player.x = 280;
  player.y = 450;
  player.vy = 0;
  
  respawnProtection = 90; 

  if (isBoosting) {
    isBoosting = false;
    boostTimer = 0;
    updateBoostUI();
  }

  platforms = platforms.filter(p => p.y < player.y - 100 || p.y > player.y + 150);
  platforms.push({ x: player.x - 31, y: player.y + player.h + 5, w: 90, h: 12 });
}

function update() {
  if (ended) return;

  if (respawnProtection > 0) {
    respawnProtection--;
    player.vy = 0; 
    if (left) player.x -= 5;
    if (right) player.x += 5;
    moveWorldUp(0); 
    return; 
  }

  if (left) player.x -= 5;
  if (right) player.x += 5;

  // LOGIKA ZA BOOST
  if (isBoosting) {
    player.vy = 0;      
    player.y = 400;     // 3. POZICIJA U BOOSTU: Igrač miruje malo niže kako bi se vidjelo više prostora iznad
    boostTimer--;
    
    moveWorldUp(12);    
    
    if (boostTimer <= 0) {
      isBoosting = false;
      player.vy = jump; 
      updateBoostUI();
    }
  } else {
    player.vy += gravity;
    player.y += player.vy;
  }

  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.w) player.x = canvas.width - player.w;

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

  // 4. PRAĆENJE KAMERE: Kamera počinje gurati svijet kada igrač prijeđe visinu od 400px (umjesto 250px)
  if (player.y < 400 && !isBoosting) {
    const diff = 400 - player.y;
    player.y = 400;
    moveWorldUp(diff);
  }

  // AUTOMATSKO PADANJE PLATFORMI (PROGRESIVNO SA STABILNOM GRANICOM)
  if (!isBoosting) {
    let autoScrollSpeed = 0.6 + (score / 6000); 
    autoScrollSpeed = Math.min(autoScrollSpeed, 3.5); 
    
    moveWorldUp(autoScrollSpeed);
    player.y += autoScrollSpeed; 
  }

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

  // 5. FILTRIRANJE: Platforme brišemo tek kad odu ispod novog dna ekrana (850px + rezerva = 900px)
  platforms = platforms.filter(p => p.y < 900);

  // Održavamo stabilnih 24 platforme na ekranu
  while (platforms.length < 24) {
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

  for (const p of platforms) {
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  ctx.font = '20px Arial';
  strawberries.forEach(s => ctx.fillText('🍓', s.x, s.y));

  if (isBoosting) {
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }

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