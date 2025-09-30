const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player, bullets, enemies, enemyBullets, missiles, powerUps, shields, score, gameOver, boss, lastShot;
const keys = {};

document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

function resetGame() {
  player = { 
    x: canvas.width / 2, 
    y: canvas.height - 40, 
    width: 30, 
    height: 30, 
    speed: 5, 
    power: 0, 
    damage: 10,
    shield: false,
    laser: { active: false, cooldown: 0, duration: 0 }
  };
  bullets = [];
  enemies = [];
  enemyBullets = [];
  missiles = [];
  powerUps = [];
  shields = [];
  boss = null;
  score = 0;
  gameOver = false;
  lastShot = 0;
}

function shoot() {
  const now = Date.now();
  if (now - lastShot > 200) {
    if (player.power >= 1) {
      bullets.push({ x: player.x + 5, y: player.y - 15, damage: player.damage });
      bullets.push({ x: player.x + player.width - 10, y: player.y - 15, damage: player.damage });
    } else {
      bullets.push({ x: player.x + player.width / 2 - 2, y: player.y - 15, damage: player.damage });
    }
    if (player.power >= 1) {
      for (let i = 0; i < 3; i++) {
        missiles.push({ x: player.x + player.width/2, y: player.y, speed: 3, target: null, damage: 1 });
      }
    }
    lastShot = now;
  }
}

function spawnEnemy() {
  enemies.push({ x: Math.random() * (canvas.width - 30), y: -20, width: 30, height: 30, speed: 2, shootTimer: 0, hp: 10 });
}

function spawnBoss() {
  boss = { 
    x: canvas.width/2 - 50, 
    y: 50, 
    width: 100, 
    height: 60, 
    hp: 100000, 
    shootTimer: 0,
    dir: 2
  };
}

function spawnPowerUp(x, y) {
  powerUps.push({ x, y, width: 15, height: 15, speed: 2 });
}

function spawnShield(x, y) {
  shields.push({ x, y, width: 20, height: 20, speed: 2 });
}

function findClosestEnemy(x, y) {
  let closest = null, minDist = Infinity;
  enemies.concat(boss ? [boss] : []).forEach(e => {
    const dx = e.x - x, dy = e.y - y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < minDist) { minDist = dist; closest = e; }
  });
  return closest;
}

function update() {
  if (gameOver) return;

  // Player movement
  if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
  if (keys["ArrowRight"] && player.x < canvas.width - player.width) player.x += player.speed;
  if (keys["Space"]) shoot();

  // Bullets
  bullets.forEach((b, i) => {
    b.y -= 6;
    if (b.y < 0) bullets.splice(i, 1);
  });

  // Missiles
  missiles.forEach((m, i) => {
    if (!m.target || (m.target.hp !== undefined && m.target.hp <= 0) || enemies.indexOf(m.target) === -1) {
      m.target = findClosestEnemy(m.x, m.y);
    }
    if (m.target) {
      const dx = (m.target.x + m.target.width/2) - m.x;
      const dy = (m.target.y + m.target.height/2) - m.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      m.x += (dx/dist) * m.speed;
      m.y += (dy/dist) * m.speed;
    } else {
      m.y -= m.speed;
    }
    if (m.y < 0 || m.x < 0 || m.x > canvas.width || m.y > canvas.height) missiles.splice(i, 1);
  });

  // Enemies
  enemies.forEach((e, ei) => {
    e.y += e.speed;
    e.shootTimer++;
    if (e.shootTimer > 90) {
      enemyBullets.push({ x: e.x + e.width/2, y: e.y + e.height, dy: 3 });
      e.shootTimer = 0;
    }
    if (e.y > canvas.height) enemies.splice(ei, 1);
  });

  // Boss
  if (boss) {
    boss.x += boss.dir;
    if (boss.x <= 0 || boss.x + boss.width >= canvas.width) boss.dir *= -1;

    boss.shootTimer++;
    if (boss.shootTimer > 50) {
      for (let angle = -40; angle <= 40; angle += 20) {
        const rad = angle * Math.PI/180;
        enemyBullets.push({ x: boss.x + boss.width/2, y: boss.y + boss.height, dx: Math.sin(rad)*3, dy: Math.cos(rad)*3 });
      }
      boss.shootTimer = 0;
    }
  }

  // Enemy bullets
  enemyBullets.forEach((b, bi) => {
    b.x += b.dx || 0;
    b.y += b.dy || 0;
    if (b.y > canvas.height) enemyBullets.splice(bi, 1);
  });

  // PowerUps
  powerUps.forEach((p, pi) => {
    p.y += p.speed;
    if (p.y > canvas.height) powerUps.splice(pi, 1);
  });

  // Shields
  shields.forEach((s, si) => {
    s.y += s.speed;
    if (s.y > canvas.height) shields.splice(si, 1);
  });

  // Bullet collisions
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (b.x > e.x && b.x < e.x+e.width && b.y > e.y && b.y < e.y+e.height) {
        e.hp -= b.damage;
        bullets.splice(bi,1);
        if (e.hp <= 0) {
          enemies.splice(ei,1);
          score += 10;
          if (Math.random()<0.1) spawnPowerUp(e.x, e.y);
          if (boss && Math.random()<0.2) spawnShield(e.x, e.y);
        }
      }
    });
    if (boss && b.x > boss.x && b.x < boss.x+boss.width && b.y > boss.y && b.y < boss.y+boss.height) {
      boss.hp -= b.damage;
      bullets.splice(bi,1);
      if (boss.hp<=0) { boss=null; score+=2000; }
    }
  });

  // Missiles collisions
  missiles.forEach((m, mi) => {
    enemies.forEach((e, ei) => {
      if (m.x > e.x && m.x < e.x+e.width && m.y > e.y && m.y < e.y+e.height) {
        e.hp -= m.damage;
        missiles.splice(mi,1);
        if (e.hp <= 0) {
          enemies.splice(ei,1);
          score += 15;
          if (Math.random()<0.1) spawnPowerUp(e.x, e.y);
          if (boss && Math.random()<0.2) spawnShield(e.x, e.y);
        }
      }
    });
    if (boss && m.x > boss.x && m.x < boss.x+boss.width && m.y > boss.y && m.y < boss.y+boss.height) {
      boss.hp -= m.damage;
      missiles.splice(mi,1);
      if (boss.hp<=0) { boss=null; score+=2000; }
    }
  });

  // Enemy bullets vs player
  enemyBullets.forEach((b, bi) => {
    if (b.x > player.x && b.x < player.x+player.width && b.y > player.y && b.y < player.y+player.height) {
      if (player.shield) {
        player.shield = false; // mất khiên
        enemyBullets.splice(bi,1);
      } else {
        gameOver = true;
      }
    }
  });

  // Player vs powerUp
  powerUps.forEach((p, pi) => {
    if (player.x < p.x+p.width && player.x+player.width > p.x && player.y < p.y+p.height && player.y+player.height > p.y) {
      player.power++;
      if (player.power === 3) {
        player.damage *= 10;
      } else if (player.power >= 4) {
        player.damage *= 2;
      }
      powerUps.splice(pi,1);
    }
  });

  // Player vs shield
  shields.forEach((s, si) => {
    if (player.x < s.x+s.width && player.x+player.width > s.x && player.y < s.y+s.height && player.y+player.height > s.y) {
      player.shield = true;
      shields.splice(si,1);
    }
  });

  // Spawns
  if (Math.random()<0.02) spawnEnemy();
  if (score>100 && !boss) spawnBoss();
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="cyan";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.fillStyle="yellow";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 10));

  ctx.fillStyle="orange";
  missiles.forEach(m => ctx.fillRect(m.x, m.y, 6, 12));

  ctx.fillStyle="red";
  enemies.forEach(e => ctx.fillRect(e.x, e.y, e.width, e.height));

  if (boss) {
    ctx.fillStyle="purple";
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    ctx.fillStyle="white";
    ctx.fillText("Boss HP: " + boss.hp, boss.x, boss.y-10);
  }

  ctx.fillStyle="pink";
  enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 8));

  ctx.fillStyle="lime";
  powerUps.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.width/2, 0, Math.PI*2);
    ctx.fill();
  });

  ctx.fillStyle="blue";
  shields.forEach(s => ctx.fillRect(s.x, s.y, s.width, s.height));

  ctx.fillStyle="white";
  ctx.fillText("Score: " + score, 10, 20);

  if (player.shield) {
    ctx.strokeStyle="aqua";
    ctx.strokeRect(player.x-5, player.y-5, player.width+10, player.height+10);
  }

  if (gameOver) {
    ctx.fillStyle="white";
    ctx.fillText("GAME OVER", canvas.width/2-40, canvas.height/2);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

document.getElementById("restartBtn").onclick = () => {
  resetGame();
};

resetGame();
gameLoop();
