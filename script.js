const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const livesEl = document.getElementById('lives');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const boostStatusEl = document.getElementById('boostStatus');

let score = 0, time = 60, lives = 3, ended = false;

const player = { x: 280, y: 750, w: 28, h: 28, vy: 0 };
const gravity = 0.20; // Manja gravitacija = sporije padanje i duži let
const jump = -10.0;   // Manji skok = sporije i niže uzlijetanje  

let left = false, right = false;
let platforms = [];
let strawberries = [];

// --- MEHANIKA VARIJABLE ---
let strawberryCount = 0;
let isBoosting = false;
let boostTimer = 0;
let respawnProtection = 0; 

// --- ADVANCED PARALLAX POZADINA V2.5 ---
let bgElements = {
  mountains: [], // Daleki sloj (najsporiji)
  hills: [],     // Srednji sloj
  buildings: []  // Bliski sloj (najbrži)
};

// Funkcija za stvaranje jednog objekta na zadanoj Y visini
function createBgElement(type, yPosition) {
  if (type === 'mountain') {
    return {
      x: Math.random() * (canvas.width + 100) - 50,
      y: yPosition,
      r: 120 + Math.random() * 80,
      color: ['#0f172a', '#1e293b', '#111827'][Math.floor(Math.random() * 3)] // Tamne siluete planina u daljini
    };
  }
  if (type === 'hill') {
    return {
      x: Math.random() * (canvas.width + 100) - 50,
      y: yPosition,
      r: 80 + Math.random() * 50,
      color: ['#14532d', '#166534', '#064e3b'][Math.floor(Math.random() * 3)] // Nijanse zelene za doline
    };
  }
  if (type === 'building') {
    const w = 35 + Math.random() * 35;
    return {
      x: Math.random() * (canvas.width - w),
      y: yPosition,
      w: w,
      h: 60 + Math.random() * 90,
      color: ['#334155', '#475569', '#1e293b', '#3b0764'][Math.floor(Math.random() * 4)],
      // Prozori unutar zgrade
      windows: Array.from({ length: 4 }, () => ({
        xRel: 5 + Math.random() * (w - 15),
        yRel: 10 + Math.random() * 40,
        lit: Math.random() < 0.6
      }))
    };
  }
}

// Početno punjenje ekrana pozadinom odozdo prema gore
function initBackground() {
  bgElements.mountains = [];
  bgElements.hills = [];
  bgElements.buildings = [];

  // Popunjavamo cijelu visinu ekrana i malo iznad
  for (let y = 900; y > -200; y -= 120) {
    if (Math.random() < 0.7) bgElements.mountains.push(createBgElement('mountain', y));
  }
  for (let y = 900; y > -200; y -= 90) {
    if (Math.random() < 0.8) bgElements.hills.push(createBgElement('hill', y));
  }
  for (let y = 900; y > -200; y -= 140) {
    if (Math.random() < 0.6) bgElements.buildings.push(createBgElement('building', y));
  }
}

function makeLevel() {
  platforms = []; 
  strawberries = [];
  
  platforms.push({ x: player.x - 30, y: player.y + player.h + 5, w: 90, h: 12 });

  for (let i = 1; i < 24; i++) {
    const p = { x: Math.random() * 480 + 20, y: (player.y + 5) - i * 72, w: 90, h: 12 };
    platforms.push(p);
    if (Math.random() < 0.35) {
      strawberries.push({ x: p.x + 30, y: p.y - 18 });
    }
  }
}

initBackground();
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
    boostStatusEl.style.color = '#38bdf8';
  }
}

function loseLife() {
  lives--;
  livesEl.textContent = '❤️'.repeat(lives);

  if (lives <= 0) {
    ended = true;
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
    return;
  }

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

  if (isBoosting) {
    player.vy = 0;      
    player.y = 400;     
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

  if (player.y < 400 && !isBoosting) {
    const diff = 400 - player.y;
    player.y = 400;
    moveWorldUp(diff);
  }

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

  // 1. Pomicanje igrivih objekata (brzo)
  platforms.forEach(p => p.y += amount);
  strawberries.forEach(s => s.y += amount);

  // 2. BESKONAČNI MULTI-LAYER PARALLAX SUSTAV
  // Svaki sloj ima svoju brzinu padanja (najdalji je najsporiji)
  bgElements.mountains.forEach(m => m.y += amount * 0.08);
  bgElements.hills.forEach(h => h.y += amount * 0.18);
  bgElements.buildings.forEach(b => b.y += amount * 0.35);

  // Brisanje elemenata koji su otišli preduboko ispod ekrana (y > 950)
  bgElements.mountains = bgElements.mountains.filter(m => m.y < 950);
  bgElements.hills = bgElements.hills.filter(h => h.y < 950);
  bgElements.buildings = bgElements.buildings.filter(b => b.y < 950);

  // Konstantno generiranje NOVIH elemenata iznad vrha ekrana (oko y = -150)
  if (bgElements.mountains.length < 10) {
    bgElements.mountains.push(createBgElement('mountain', -150 - Math.random() * 50));
  }
  if (bgElements.hills.length < 12) {
    bgElements.hills.push(createBgElement('hill', -100 - Math.random() * 40));
  }
  if (bgElements.buildings.length < 8) {
    bgElements.buildings.push(createBgElement('building', -200 - Math.random() * 60));
  }

  score += Math.floor(amount * 0.1); 
  platforms = platforms.filter(p => p.y < 900);

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

  // 1. NEBO GRADUALNI GRADIJENT
  let skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#0c4a6e'); 
  skyGrad.addColorStop(1, '#38bdf8'); 
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. CRTANJE POZADINE PO SLOJEVIMA (Od najudaljenijeg prema najbližem)
  
  // Sloj 1: Planine u daljini
  for (const m of bgElements.mountains) {
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sloj 2: Zelene doline i brežuljci
  for (const h of bgElements.hills) {
    ctx.fillStyle = h.color;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sloj 3: Grad (zgrade i kućice s prozorima)
  for (const b of bgElements.buildings) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Crtanje osvijetljenih prozora na zgradama
    for (const w of b.windows) {
      ctx.fillStyle = w.lit ? '#fef08a' : '#475569'; // Žuta ako svijetli, siva ako ne
      ctx.fillRect(b.x + w.xRel, b.y + w.yRel, 5, 7);
    }
  }

  // 3. CRTANJE IGRIVIH ELEMENTA (Zaobljene platforme)
  for (const p of platforms) {
    ctx.fillStyle = '#0284c7'; 
    ctx.strokeStyle = '#bae6fd'; 
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 6);
    ctx.fill();
    ctx.stroke();
  }

  // 4. CRTANJE JAGODA
  ctx.font = '20px Arial';
  strawberries.forEach(s => ctx.fillText('🍓', s.x, s.y));

  // Okvir za Boost
  if (isBoosting) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }

  // 5. CRTANJE IGRAČA
  ctx.font = '28px Arial';
  if (respawnProtection > 0 && Math.floor(respawnProtection / 5) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  ctx.fillText('🧑', player.x, player.y + 24);
  ctx.globalAlpha = 1.0; 
}

function loop() {update();
  draw();
  requestAnimationFrame(loop);
}

loop();
setInterval(() => {
  if (ended) return;
  time--;
  timeEl.textContent = time;
  if (time <= 0) loseLife();
  }, 1000);
  loop();

