const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const cfuEl = document.getElementById('cfu');
const livesEl = document.getElementById('lives');
const messageEl = document.getElementById('message');

const ESAMI = [
  {n:"PROGRAMMAZIONE",cfu:12},
  {n:"ANALISI MAT. I E GEOMETRIA",cfu:12},
  {n:"FISICA",cfu:12},
  {n:"ANALISI MATEMATICA II",cfu:6},
  {n:"STATISTICA PER ECONOMIA",cfu:9},
  {n:"INGEGNERIA DEL SOFTWARE",cfu:9},
  {n:"SOCIOLOGIA",cfu:6},
  {n:"GEOGRAFIA POL. ED EC.",cfu:6},
  {n:"FOND. DI AUTOMATICA",cfu:9},
  {n:"ELAB. SEGNALI E MISURE",cfu:9},
  {n:"FOND. DI ELETTRONICA",cfu:9},
  {n:"ARCH. E RETI CALCOLATORI",cfu:9},
  {n:"ELETTROTECNICA",cfu:6},
  {n:"RICERCA OPERATIVA ICT",cfu:9},
  {n:"ING. DATI E MODELLIZZAZIONE",cfu:9},
  {n:"DIRITTO DIGITALE",cfu:9},
  {n:"SICUREZZA INFORMATICA",cfu:6},
  {n:"FOND. TELECOMUNICAZIONI",cfu:9},
  {n:"SICUREZZA RETI & CYBER",cfu:6},
  {n:"TEC. SISTEMI DI CONTROLLO",cfu:6},
  {n:"LINGUA INGLESE",cfu:3},
  {n:"TIROCINI I",cfu:3},
  {n:"TIROCINI II",cfu:3},
];
const BOSS = {n:"PROVA FINALE",cfu:3};

let W, H, scale;
let player, bullets, enemies, enemyBullets;
let score, lives, cfuTotal, wave, gameRunning, gameOver;
let keys = {};
let lastShot = 0;
let bossMode = false;
let boss = null;
let bossHp = 0;
let animFrame;
let touchX = null;
let touchShoot = false;
let enemyDir = 1, enemyMoveTimer = 0, enemyMoveInterval = 60;
let enemyShootTimer = 0;
let shake = 0;
let particles = [];
let winMode = false;
let bossFlash = 0;
let powerUps = [];          
let doubleShotTimer = 0;
let tripleShotTimer = 0;
const TRIPLE_SHOT_MAX_DURATION = 360;

function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const GAME_RATIO = 1.5; 

  let width = vw - 15;
  let height = vw * GAME_RATIO;

  if (height > vh) {
    height = vh;
    width = vh / GAME_RATIO;
  }

  W = width;
  H = height;
  scale = W / 480;

  canvas.width = W;
  canvas.height = H;

  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  if (player) updatePlayerPosition();
}
document.addEventListener('touchmove', e => {
  e.preventDefault();
}, { passive: false });
function fullScreenFix() {
  requestAnimationFrame(resize);
  setTimeout(resize, 100);
  setTimeout(resize, 300);
}

function startGame() {
  canvas.style.display = 'block'; 
  
  messageEl.style.display = 'none';
  
  powerUps = [];
  doubleShotTimer = 0;
  tripleShotTimer = 0;
  
  fullScreenFix();
  
  score = 0; 
  lives = 3; 
  cfuTotal = 0; 
  wave = 0;
  gameRunning = true; 
  gameOver = false; 
  bossMode = false; 
  winMode = false;
  particles = [];
  
  initPlayer();
  spawnWave();
  
  scoreEl.textContent = 0;
  cfuEl.textContent = '0';
  livesEl.textContent = '3';
  
  if(animFrame) cancelAnimationFrame(animFrame);
  loop();
}

function initPlayer() {
  player = {
    x: W / 2,
    y: 0,
    w: 48 * scale,
    h: 36 * scale,
    speed: 4.5 * scale
  };

  bullets = [];
  enemyBullets = [];
}

function updatePlayerPosition() {
  player.y = H - player.h / 2 - 4 * scale;
}

function spawnWave() {

  enemies = [];
  bossMode = false;
  boss = null;

  const chunk = ESAMI.slice(wave * 6, wave * 6 + 6);

  if (chunk.length === 0) {
    spawnBoss();
    return;
  }

const ew = 110 * scale;
const eh = 28 * scale;

const cols = 2;
const rows = 3;

const startX = W * 0.25;
const endX = W * 0.75;

const startY = 40 * scale;
const gapY = 65 * scale;

const grid = [];

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {

    grid.push({
      x: startX + (endX - startX) * (c / (cols - 1)) + (Math.random() * 30 - 15) * scale,
      y: startY + r * gapY + (Math.random() * 10) * scale
    });
  }
}

  for (let i = grid.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [grid[i], grid[j]] = [grid[j], grid[i]];
  }

  const positions = grid.slice(0, 6);

  chunk.forEach((e, i) => {

    const p = positions[i];

    enemies.push({
      x: p.x,
      y: p.y,
      w: ew,
      h: eh,
      name: e.n,
      cfu: e.cfu,
      hp: e.cfu > 9 ? 3 : e.cfu > 6 ? 2 : 1,
      maxHp: e.cfu > 9 ? 3 : e.cfu > 6 ? 2 : 1,
      flash: 0,
      alive: true
    });
  });

  enemyDir = 1;
  enemyMoveTimer = 0;
  enemyMoveInterval = Math.max(20, 60 - wave * 6);
}
function spawnBoss() {
  bossMode = true;
  bossHp = 20;
  boss = {
    x: W/2, y: 60*scale,
    w: 200*scale, h: 44*scale,
    hp: 20, maxHp: 20,
    dir: 1, speed: 2*scale,
    flash: 0, shootTimer: 0
  };
}

function loop() {
    updatePlayerPosition();
  if(!gameRunning) return;
  update();
  draw();
  animFrame = requestAnimationFrame(loop);
}

function update() {
  if (winMode) return;

  if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
  if (keys['ArrowRight'] || keys['d']) player.x += player.speed;

  if (touchX !== null) {
    const dx = touchX - player.x;
    if (Math.abs(dx) > 5) player.x += dx * 0.18;
  }

  player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));


const SHOOT_COOLDOWN = 400;

if (!player._shootTimer) player._shootTimer = 0;
player._shootTimer++;

if (tripleShotTimer > 0) tripleShotTimer--;
if (doubleShotTimer > 0) doubleShotTimer--;

const canShoot = (keys[' '] || touchShoot) && player._shootTimer >= SHOOT_COOLDOWN / 16;

if (canShoot) {
  if (tripleShotTimer > 0) {
    bullets.push(
      { x: player.x, y: player.y - player.h / 2, w: 3 * scale, h: 12 * scale, speed: 9 * scale, vx: 0 },
      { x: player.x - 6 * scale, y: player.y - player.h / 2, w: 3 * scale, h: 12 * scale, speed: 9 * scale, vx: -2 * scale },
      { x: player.x + 6 * scale, y: player.y - player.h / 2, w: 3 * scale, h: 12 * scale, speed: 9 * scale, vx: 2 * scale }
    );
  } else if (doubleShotTimer > 0) {
    bullets.push(
      { x: player.x - 12 * scale, y: player.y - player.h / 2, w: 3 * scale, h: 12 * scale, speed: 9 * scale, vx: 0 },
      { x: player.x + 12 * scale, y: player.y - player.h / 2, w: 3 * scale, h: 12 * scale, speed: 9 * scale, vx: 0 }
    );
  } else {
    // Colpo singolo standard
    bullets.push({
      x: player.x,
      y: player.y - player.h / 2,
      w: 3 * scale,
      h: 12 * scale,
      speed: 9 * scale,
      vx: 0
    });
  }
  player._shootTimer = 0;
}

bullets = bullets.filter(b => {
    b.y -= b.speed;
    b.x += b.vx || 0; 
    return b.y > -20 && b.x > -20 && b.x < W + 20;
  });
  // =========================
  // ENEMY LOGIC (NO ZIG-ZAG)
  // =========================
  if (!bossMode) {
    enemyMoveTimer++;

    if (enemyMoveTimer >= enemyMoveInterval) {
      enemyMoveTimer = 0;

      const alive = enemies.filter(e => e.alive);

      

      enemies.forEach(e => {
        if (e.alive) {
          e.y += 16 * scale;
        }
      });

      const lowest = alive.length
        ? Math.max(...alive.map(e => e.y + e.h / 2))
        : 0;

      if (lowest >= player.y - player.h / 2 - 10) {
        loseLife();
        return;
      }
    }

    // --- ENEMY SHOOT ---
    enemyShootTimer++;

const shootInterval = Math.max(35, 50- wave * 25);

    if (enemyShootTimer >= shootInterval) {
      enemyShootTimer = 0;

      const alive = enemies.filter(e => e.alive);

      if (alive.length > 0) {
        const shooter = alive[Math.floor(Math.random() * alive.length)];

        enemyBullets.push({
          x: shooter.x,
          y: shooter.y + shooter.h / 2,
          w: 3 * scale,
          h: 10 * scale,
          speed: 3.5 * scale
        });
      }
    }

    // --- FLASH DECAY ---
    enemies.forEach(e => {
      if (e.flash > 0) e.flash--;
    });

    // --- BULLET COLLISIONS ---
    bullets.forEach(b => {
      enemies.forEach(e => {
        if (!e.alive) return;

        if (Math.abs(b.x - e.x) < e.w / 2 &&
            Math.abs(b.y - e.y) < e.h / 2) {

          e.hp--;
          e.flash = 8;
          b.y = -999;

         if (e.hp <= 0) {
            e.alive = false;
            score += e.cfu * 10;
            cfuTotal += e.cfu;

            scoreEl.textContent = score;
            cfuEl.textContent = cfuTotal;

            spawnParticles(e.x, e.y, '#7fff7f', 8);

            const rand = Math.random();
            if (rand < 0.25) { 
              powerUps.push({
                x: e.x, y: e.y,
                w: 25 * scale, h: 25 * scale,
                speed: 2.5 * scale, 
                text: "❤️",
                type: "life"
              });
            } else if (rand < 0.20) { 
              powerUps.push({
                x: e.x, y: e.y,
                w: 42 * scale, h: 20 * scale,
                speed: 2.2 * scale,
                text: "110L",
                type: "triple"
              });
            } else if (rand < 0.35) { 
              powerUps.push({
                x: e.x, y: e.y,
                w: 35 * scale, h: 20 * scale,
                speed: 2 * scale,
                text: "30L",
                type: "double"
              });
            }
          }
        }
      });
    });

   const alive = enemies.filter(e => e.alive);

if (alive.length === 0) {
  wave++;

  const TOTAL_CFU = ESAMI.reduce((s, e) => s + e.cfu, 0);

  if (cfuTotal >= TOTAL_CFU) {
    spawnBoss();
  } else {
    spawnWave();
  }

  return;
}
  }

  // =========================
  // BOSS MODE
  // =========================
  else {
    if (boss) {
      boss.x += boss.dir * boss.speed;

      if (boss.x + boss.w / 2 > W - 4) boss.dir = -1;
      if (boss.x - boss.w / 2 < 4) boss.dir = 1;

      if (boss.flash > 0) boss.flash--;

      boss.shootTimer++;

      if (boss.shootTimer >= 45) {
        boss.shootTimer = 0;

        enemyBullets.push(
          { x: boss.x - 30 * scale, y: boss.y + boss.h / 2, w: 3 * scale, h: 10 * scale, speed: 3 * scale },
          { x: boss.x + 30 * scale, y: boss.y + boss.h / 2, w: 3 * scale, h: 10 * scale, speed: 3 * scale },
          { x: boss.x, y: boss.y + boss.h / 2, w: 3 * scale, h: 10 * scale, speed: 4 * scale }
        );
      }

      bullets.forEach(b => {
        if (Math.abs(b.x - boss.x) < boss.w / 2 &&
            Math.abs(b.y - boss.y) < boss.h / 2) {

          boss.hp--;
          boss.flash = 8;
          b.y = -999;

          spawnParticles(b.x, b.y, '#ffe066', 5);

          if (boss.hp <= 0) {
            spawnParticles(boss.x, boss.y, '#ffe066', 30);
             cfuTotal += boss.cfu || 3;
            score = cfuTotal
            winMode = true;
            setTimeout(showWin, 1200);
          }
        }
      });
    }
  }

  // --- ENEMY BULLETS ---
  enemyBullets = enemyBullets.filter(b => {
    b.y += b.speed;

    if (Math.abs(b.x - player.x) < player.w / 2 &&
        Math.abs(b.y - player.y) < player.h / 2) {
      loseLife();
      return false;
    }

    return b.y < H + 20;
  });

  // --- PARTICLES ---
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    return p.life > 0;
  });

 // --- LOGICA POWER-UP (30L, 110L e CUORE) ---
  powerUps = powerUps.filter(p => {
    p.y += p.speed;

    if (Math.abs(p.x - player.x) < (player.w / 2 + p.w / 2) &&
        Math.abs(p.y - player.y) < (player.h / 2 + p.h / 2)) {
      
      if (p.type === "life") {
        if (lives < 5) {
          lives++;
          livesEl.textContent = lives;
        }
        spawnParticles(p.x, p.y, '#ff4444', 20); 
      } else if (p.type === "triple") {
        tripleShotTimer = TRIPLE_SHOT_MAX_DURATION;
        doubleShotTimer = 0; 
        spawnParticles(p.x, p.y, '#ff3366', 20); 
      } else {
        doubleShotTimer = 420;
        tripleShotTimer = 0; 
        spawnParticles(p.x, p.y, '#ffe066', 15);
      }
      return false;
    }
    return p.y < H + 20;
  });

  if (shake > 0) shake--;
}

function loseLife() {
  lives--;
  livesEl.textContent = lives;
  spawnParticles(player.x, player.y, '#ff5555', 12);
  shake = 18;
  enemyBullets = [];
  if(lives <= 0) {
    gameRunning = false;
    showMessage('💀 BOCCIATO!', 'Hai esaurito i tentativi...', 'Riprova');
  } else {
    player.x = W/2;
  }
}

function showWin() {
  gameRunning = false;

  // Stoppa il loop di gioco
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }

  // Forza il punteggio finale di laurea
  score = 180;
  scoreEl.textContent = score;

  // Nasconde il campo di gioco
  canvas.style.display = 'none';

  // 🔥 Sostituito l'ID con 'startBtn' esattamente come nel Game Over e nell'HTML iniziale
  messageEl.innerHTML = `
    <h2 style="font-size:26px;color:#ffe066">🎓 COMPLIMENTI, DOTTORE!</h2>
    <p style="color:#7fff7f;font-size:16px;margin-top:8px">
      Tutti gli esami superati!
    </p>
    <p style="color:#aaa;margin-top:6px">
      Punteggio finale: <b style="color:#fff">180</b> &nbsp;|&nbsp;
      CFU: <b style="color:#fff">${cfuTotal}</b>
    </p>

    <br>

    <button id="startBtn" onclick="startGame()"
      style="
        margin-top:14px;
        padding:10px 18px;
        font-size:16px;
        font-weight:bold;
        border-radius:10px;
        border:2px solid #ffe066;
        background:#111;
        color:#ffe066;
        cursor:pointer;
        box-shadow:0 0 12px #ffe06655;
      ">
      ▶ GIOCA ANCORA
    </button>
  `;

  messageEl.style.display = 'block';
}
function showMessage(title, sub, btn) {
  canvas.style.display = 'none';
  
  messageEl.innerHTML = `
    <h2>${title}</h2>
    <p>${sub}</p>
    <br>
    <button id="startBtn" onclick="startGame()" 
      style="
        padding:10px 18px; 
        font-weight:bold; 
        border-radius:10px; 
        cursor:pointer;
        background:#111;
        color:#ff5555;
        border:2px solid #ff5555;
      ">${btn}</button>
  `;
  messageEl.style.display = 'block';
}

function spawnParticles(x, y, color, n) {
  for(let i=0; i<n; i++) {
    particles.push({
      x, y,
      vx: (Math.random()-0.5)*4,
      vy: (Math.random()-0.5)*4,
      life: 20+Math.random()*20,
      color
    });
  }
}

function drawPlayer() {
  const x = player.x, y = player.y, s = scale;
  ctx.save();
  ctx.font = `bold ${Math.round(30*s)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎓', x, y);
  ctx.restore();
}

function drawBullets() {
  ctx.fillStyle = '#7fff7f';
  bullets.forEach(b => {
    ctx.fillRect(b.x - b.w/2, b.y, b.w, b.h);
  });
  ctx.fillStyle = '#ff5555';
  enemyBullets.forEach(b => {
    ctx.fillRect(b.x - b.w/2, b.y, b.w, b.h);
  });
}

function drawEnemy(e) {
  if (!e.alive) return;

  const flash = e.flash > 0;
  const pct = e.hp / e.maxHp;
  const col = pct > 0.6 ? '#cc44ff' : pct > 0.3 ? '#ff9900' : '#ff4444';

  ctx.save();

  // 🔥 BOX PIÙ GRANDE
  const w = e.w * 1.6;
  const h = e.h * 1.6;

  ctx.strokeStyle = flash ? '#fff' : col;
  ctx.lineWidth = flash ? 3 : 2;
  ctx.fillStyle = flash ? '#ffffff22' : '#22002244';

  ctx.beginPath();
  ctx.roundRect(
    e.x - w / 2,
    e.y - h / 2,
    w,
    h,
    6
  );
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = flash ? '#fff' : col;
  ctx.font = `bold ${Math.round(12 * scale)}px 'Courier New'`;
  ctx.fillText(e.name, e.x, e.y - 6 * scale);

  ctx.fillStyle = flash ? '#fff' : '#ffcc00';
  ctx.font = `${Math.round(11 * scale)}px 'Courier New'`;
  ctx.fillText(e.cfu + ' CFU', e.x, e.y + 10 * scale);

  const barWidth = e.maxHp * 14 * scale;

  for (let i = 0; i < e.maxHp; i++) {
    ctx.fillStyle = i < e.hp ? '#ffe066' : '#333';
    ctx.fillRect(
      e.x - barWidth / 2 + i * 16 * scale,
      e.y + h / 2 - 8 * scale,
      10 * scale,
      5 * scale
    );
  }

  ctx.restore();
}

function drawBoss() {
  if(!boss) return;
  const flash = boss.flash > 0;
  const pct = boss.hp / boss.maxHp;
  ctx.save();
  const grad = ctx.createLinearGradient(boss.x-boss.w/2, 0, boss.x+boss.w/2, 0);
  grad.addColorStop(0,'#aa0000');
  grad.addColorStop(0.5,'#ff3300');
  grad.addColorStop(1,'#aa0000');
  ctx.fillStyle = flash ? '#ffffff44' : grad;
  ctx.strokeStyle = flash ? '#fff' : '#ff0000';
  ctx.lineWidth = flash ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(boss.x-boss.w/2, boss.y-boss.h/2, boss.w, boss.h, 6);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = flash ? '#fff' : '#ffe066';
  ctx.font = `bold ${Math.round(11*scale)}px 'Courier New'`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💀 PROVA FINALE', boss.x, boss.y - 5*scale);
  ctx.fillStyle = '#ff9900';
  ctx.font = `${Math.round(8.5*scale)}px 'Courier New'`;
  ctx.fillText('BOSS', boss.x, boss.y + 8*scale);

  ctx.fillStyle = '#330000';
  ctx.fillRect(boss.x-boss.w/2+4, boss.y+boss.h/2-8*scale, boss.w-8, 5*scale);
  ctx.fillStyle = `hsl(${Math.round(pct*120)},100%,50%)`;
  ctx.fillRect(boss.x-boss.w/2+4, boss.y+boss.h/2-8*scale, (boss.w-8)*pct, 5*scale);
  ctx.restore();
}

function draw() {
  ctx.save();
  if(shake > 0) {
    ctx.translate((Math.random()-0.5)*4, (Math.random()-0.5)*4);
  }
  ctx.clearRect(-10,-10,W+20,H+20);
  ctx.fillStyle = '#000';
  ctx.fillRect(-10,-10,W+20,H+20);

  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 0.5;
  for(let y=0;y<H;y+=30*scale){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  powerUps.forEach(p => {
    ctx.save();
    
    if (p.type === "life") {
      // 🔥 Stile per il Cuore
      ctx.font = `${Math.round(22 * scale)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, p.x, p.y);
    } else {
      // Stile standard per i voti d'esame (30L e 110L)
      const isTriple = p.type === "triple";
      ctx.strokeStyle = isTriple ? '#ff3366' : '#ffe066';
      ctx.fillStyle = isTriple ? '#330011' : '#332200';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.roundRect(p.x - p.w/2, p.y - p.h/2, p.w, p.h, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isTriple ? '#ff3366' : '#ffe066';
      ctx.font = `bold ${Math.round(11 * scale)}px 'Courier New'`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, p.x, p.y);
    }
    
    ctx.restore();
  });

  // --- BARRA DI ATTIVITÀ (TRIPLO O DOPPIO COLPO) ---
  if ((tripleShotTimer > 0 || doubleShotTimer > 0) && !winMode) {
    ctx.save();
    
    // Determina quale bonus mostrare (il triplo vince graficamente)
    const isTriple = tripleShotTimer > 0;
    const pct = isTriple ? (tripleShotTimer / TRIPLE_SHOT_MAX_DURATION) : (doubleShotTimer / 420);
    const color = isTriple ? '#ff3366' : '#ffe066';
    const text = isTriple ? "🔥 TRIPLO COLPO 🔥" : "⚡ DOPPIO COLPO ⚡";
    const bg = isTriple ? '#330011' : '#332200';

    const barW = 65 * scale;
    const barH = 5 * scale;
    const barX = player.x - barW / 2;
    const barY = player.y - player.h - 12 * scale;

    ctx.fillStyle = bg;
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barW * pct, barH);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = color;
    ctx.font = `bold ${Math.round(10 * scale)}px 'Courier New'`;
    ctx.textAlign = 'center';
    ctx.fillText(text, player.x, barY - 6 * scale);
    
    ctx.restore();
  }

  if(!winMode) {
    enemies.forEach(drawEnemy);
    drawBoss();
    drawBullets();
    drawPlayer();
  }

  particles.forEach(p => {
    ctx.globalAlpha = p.life/40;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x-2, p.y-2, 4, 4);
  });
  ctx.globalAlpha = 1;

  if(!bossMode && enemies.length > 0) {
    const waveNum = Math.floor(wave) + 1;
    ctx.fillStyle = '#333';
    ctx.font = `${Math.round(10*scale)}px 'Courier New'`;
    ctx.textAlign = 'right';
    ctx.fillText(`WAVE ${waveNum}`, W-8, H-8);
  }

  ctx.restore();
}

document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if(e.key === ' ') e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
  touchShoot = true;
}, {passive:false});
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
}, {passive:false});
canvas.addEventListener('touchend', e => {
  e.preventDefault();
  touchShoot = false;
  touchX = null;
}, {passive:false});

window.addEventListener('resize', () => {
  if(gameRunning) { resize(); }
});

resize();
