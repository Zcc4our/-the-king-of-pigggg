(() => {
  "use strict";

  const { Engine, Bodies, Body, Composite, Events } = Matter;
  const config = window.GAME_CONFIG;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const nextCanvas = document.getElementById("next");
  const nextCtx = nextCanvas.getContext("2d");
  const scoreElement = document.getElementById("score");
  const bestElement = document.getElementById("best");
  const dialog = document.getElementById("game-over");
  const resultPicture = document.getElementById("result-picture");
  const resultImage = document.getElementById("game-over-image");
  const pauseDialog = document.getElementById("pause-dialog");
  const music = document.getElementById("background-music");
  const musicButton = document.getElementById("music");
  const width = 420;
  const height = 570;
  const radii = [17, 22, 28, 35, 43, 52, 63, 75, 89, 105, 120, 136, 152];
  const dangerY = radii[2] * 2;
  const colors = ["#e9a6a4", "#e58286", "#f2b775", "#eac9a4", "#ed977b", "#b9afd1", "#a5c4a1", "#9abfc7", "#e5a8a1", "#e58e80", "#d2c48d", "#c9a3bd", "#97b8a1"];
  const images = config.characters.map(character => {
    if (!character.image) return null;
    const image = new Image();
    image.onload = () => drawNext();
    image.src = character.image;
    return image;
  });
  const background = config.backgroundImage ? new Image() : null;
  if (background) background.src = config.backgroundImage;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  nextCtx.scale(2, 2);

  document.title = config.title;
  if (config.backgroundImage) {
    document.body.style.backgroundImage = `linear-gradient(#f7f2e9bf, #f7f2e9bf), url(${JSON.stringify(config.backgroundImage)})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
  }
  let musicEnabled = Boolean(config.music);
  if (musicEnabled) {
    music.src = config.music;
    music.volume = 0.45;
    musicButton.disabled = false;
    musicButton.textContent = "关闭背景音乐";
    musicButton.addEventListener("click", async () => {
      if (musicEnabled) {
        musicEnabled = false;
        music.pause();
        musicButton.textContent = "开启背景音乐";
      } else {
        musicEnabled = true;
        try {
          await music.play();
          if (musicEnabled) musicButton.textContent = "关闭背景音乐";
        } catch {
          if (!musicEnabled) return;
          musicEnabled = false;
          musicButton.textContent = "音乐无法播放，点击重试";
        }
      }
    });
  }

  function startMusic() {
    if (musicEnabled && music.paused) {
      music.play().catch(() => {
        if (!musicEnabled) return;
        musicEnabled = false;
        musicButton.textContent = "音乐无法播放，点击重试";
      });
    }
  }

  let best = 0;
  try { best = Number(localStorage.getItem("little-merge-best")) || 0; } catch { /* Game works without storage. */ }
  let engine, score, current, next, aim, lastDrop, dangerSince, isOver, isPaused, mergeQueue, highestLevel;
  let resultImageTimer = null;
  let accumulator = 0;
  let previousFrame = 0;
  const randomLevel = () => Math.floor(Math.random() * 4);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function addCharacter(level, x, y) {
    const radius = radii[level];
    const body = Bodies.circle(clamp(x, radius, width - radius), Math.min(y, height - radius), radius, {
      restitution: 0.14, friction: 0.06, frictionStatic: 0.35, frictionAir: 0.001,
      density: 0.002, label: "character"
    });
    body.level = level;
    body.born = engine.timing.timestamp;
    body.merging = false;
    Composite.add(engine.world, body);
    highestLevel = Math.max(highestLevel, level + 1);
    return body;
  }

  function hideResultPicture() {
    clearTimeout(resultImageTimer);
    resultImageTimer = null;
    resultPicture.hidden = true;
    if (resultPicture.contains(document.activeElement)) document.getElementById("play-again").focus();
  }

  function reset() {
    hideResultPicture();
    if (dialog.open) dialog.close();
    engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = 1;
    Composite.add(engine.world, [
      Bodies.rectangle(-30, 260, 60, 1200, { isStatic: true, label: "wall" }),
      Bodies.rectangle(width + 30, 260, 60, 1200, { isStatic: true, label: "wall" }),
      Bodies.rectangle(width / 2, height + 30, width + 100, 60, { isStatic: true, label: "wall" })
    ]);
    score = 0;
    highestLevel = 0;
    current = Math.floor(Math.random() * 3);
    next = randomLevel();
    aim = width / 2;
    lastDrop = -1000;
    dangerSince = null;
    isOver = false;
    isPaused = false;
    mergeQueue = [];
    accumulator = 0;
    updateScore();
    drawNext();
    Events.on(engine, "collisionStart", event => {
      for (const pair of event.pairs) {
        const a = pair.bodyA, b = pair.bodyB;
        if (a.label !== "character" || b.label !== "character" || a.level !== b.level || a.level >= radii.length - 1 || a.merging || b.merging) continue;
        a.merging = b.merging = true;
        mergeQueue.push([a, b]);
      }
    });
  }

  function updateScore() {
    scoreElement.textContent = score;
    if (score > best) {
      best = score;
      try { localStorage.setItem("little-merge-best", String(best)); } catch { /* Storage is optional. */ }
    }
    bestElement.textContent = best;
  }

  function drop() {
    if (isOver || isPaused || engine.timing.timestamp - lastDrop < 420) return;
    const radius = radii[current];
    addCharacter(current, aim, Math.max(radius, dangerY / 2));
    lastDrop = engine.timing.timestamp;
    current = next;
    next = randomLevel();
    aim = clamp(aim, radii[current], width - radii[current]);
    drawNext();
  }

  function mergeCharacters() {
    for (const [a, b] of mergeQueue) {
      const x = (a.position.x + b.position.x) / 2;
      const y = (a.position.y + b.position.y) / 2;
      const level = a.level + 1;
      Composite.remove(engine.world, [a, b]);
      const merged = addCharacter(level, x, y);
      Body.setVelocity(merged, { x: (a.velocity.x + b.velocity.x) * 0.25, y: -1.5 });
      score += Math.pow(2, level) * 10;
    }
    if (mergeQueue.length) updateScore();
    mergeQueue = [];
  }

  function containCharacters() {
    for (const body of Composite.allBodies(engine.world)) {
      if (body.label !== "character") continue;
      const radius = radii[body.level];
      const x = clamp(body.position.x, radius, width - radius);
      const y = Math.min(body.position.y, height - radius);
      if (x === body.position.x && y === body.position.y) continue;
      const velocityX = x > body.position.x ? Math.max(body.velocity.x, 0) : x < body.position.x ? Math.min(body.velocity.x, 0) : body.velocity.x;
      const velocityY = y < body.position.y ? Math.min(body.velocity.y, 0) : body.velocity.y;
      Body.setPosition(body, { x, y });
      Body.setVelocity(body, { x: velocityX, y: velocityY });
    }
  }

  function checkGameOver() {
    const inDanger = Composite.allBodies(engine.world).some(body => body.label === "character" && !body.merging && engine.timing.timestamp - body.born > 1400 && body.position.y - radii[body.level] < dangerY);
    if (!inDanger) { dangerSince = null; return; }
    if (dangerSince === null) dangerSince = engine.timing.timestamp;
    if (engine.timing.timestamp - dangerSince > 1800) {
      isOver = true;
      document.getElementById("game-over-score").textContent = `得分：${score}`;
      const won = highestLevel >= 12;
      resultImage.alt = won ? "最高合成等级达到十二级或以上" : "最高合成等级未达到十二级";
      resultImage.src = won ? "assets/win.jpg" : "assets/over.jpg";
      dialog.showModal();
    }
  }

  function drawCharacter(context, level, x, y, radius, angle = 0) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    const image = images[level];
    if (image && image.complete && image.naturalWidth) {
      const scale = Math.max(radius * 2 / image.naturalWidth, radius * 2 / image.naturalHeight);
      const imageWidth = image.naturalWidth * scale, imageHeight = image.naturalHeight * scale;
      context.clip();
      context.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
    } else {
      context.fillStyle = colors[level];
      context.fill();
      context.fillStyle = "#ffffff55";
      context.beginPath(); context.ellipse(-radius * 0.28, -radius * 0.43, radius * 0.24, radius * 0.11, -0.5, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#524e48";
      context.beginPath(); context.ellipse(-radius * 0.25, -radius * 0.02, radius * 0.055, radius * 0.085, 0, 0, Math.PI * 2); context.ellipse(radius * 0.25, -radius * 0.02, radius * 0.055, radius * 0.085, 0, 0, Math.PI * 2); context.fill();
      context.strokeStyle = "#66564f"; context.lineWidth = Math.max(1, radius * 0.045); context.lineCap = "round";
      context.beginPath(); context.arc(0, radius * 0.08, radius * 0.14, 0.15, Math.PI - 0.15); context.stroke();
      context.fillStyle = "#ed817d88";
      context.beginPath(); context.ellipse(-radius * 0.45, radius * 0.2, radius * 0.13, radius * 0.07, 0, 0, Math.PI * 2); context.ellipse(radius * 0.45, radius * 0.2, radius * 0.13, radius * 0.07, 0, 0, Math.PI * 2); context.fill();
    }
    context.restore();
  }

  function drawNext() {
    nextCtx.clearRect(0, 0, 44, 44);
    drawCharacter(nextCtx, next, 22, 22, Math.min(radii[next], 18));
    nextCanvas.setAttribute("aria-label", `下一个伙伴：${config.characters[next].name}`);
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f3f3e9"; ctx.fillRect(0, 0, width, height);
    if (background && background.complete && background.naturalWidth) {
      const scale = Math.max(width / background.naturalWidth, height / background.naturalHeight);
      const imageWidth = background.naturalWidth * scale, imageHeight = background.naturalHeight * scale;
      ctx.save(); ctx.globalAlpha = 0.28;
      ctx.drawImage(background, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
      ctx.restore();
    }
    ctx.fillStyle = "#ffffff35";
    for (let y = 20; y < height; y += 36) for (let x = 20; x < width; x += 36) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = dangerSince === null ? "#d6aaa0" : "#dd766f"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.moveTo(14, dangerY); ctx.lineTo(width - 14, dangerY); ctx.stroke();
    ctx.strokeStyle = "#c7d0bf"; ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.moveTo(aim, Math.max(radii[current], dangerY / 2) + radii[current] + 5); ctx.lineTo(aim, height - 15); ctx.stroke(); ctx.setLineDash([]);
    for (const body of Composite.allBodies(engine.world)) {
      if (body.label === "character") drawCharacter(ctx, body.level, body.position.x, body.position.y, radii[body.level], body.angle);
    }
    if (!isOver) drawCharacter(ctx, current, aim, Math.max(radii[current], dangerY / 2), radii[current]);
  }

  function frame(time) {
    if (!previousFrame) previousFrame = time;
    const elapsed = Math.min(time - previousFrame, 50);
    previousFrame = time;
    if (!isOver && !isPaused) {
      accumulator += elapsed;
      while (accumulator >= 1000 / 60 && !isOver) {
        Engine.update(engine, 1000 / 60);
        mergeCharacters();
        containCharacters();
        checkGameOver();
        accumulator -= 1000 / 60;
      }
    }
    render();
    requestAnimationFrame(frame);
  }

  function setAim(event) {
    const rect = canvas.getBoundingClientRect();
    aim = clamp((event.clientX - rect.left) * width / rect.width, radii[current], width - radii[current]);
  }
  canvas.addEventListener("pointerdown", event => { if (event.button !== 0 || isOver || isPaused) return; startMusic(); canvas.setPointerCapture(event.pointerId); setAim(event); canvas.focus({ preventScroll: true }); });
  canvas.addEventListener("pointermove", event => { if (event.pointerType === "mouse" || canvas.hasPointerCapture(event.pointerId)) setAim(event); });
  canvas.addEventListener("pointerup", event => { if (canvas.hasPointerCapture(event.pointerId)) { setAim(event); canvas.releasePointerCapture(event.pointerId); drop(); } });
  canvas.addEventListener("keydown", event => {
    if (isPaused || isOver) return;
    startMusic();
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); aim = clamp(aim + (event.key === "ArrowLeft" ? -18 : 18), radii[current], width - radii[current]); }
    if (event.key === " " || event.key === "Enter") { event.preventDefault(); if (!event.repeat) drop(); }
  });
  document.getElementById("restart").addEventListener("click", reset);
  document.getElementById("play-again").addEventListener("click", reset);
  resultImage.addEventListener("load", () => {
    if (!isOver || !dialog.open) return;
    resultPicture.hidden = false;
    clearTimeout(resultImageTimer);
    resultImageTimer = setTimeout(hideResultPicture, 2000);
  });
  resultImage.addEventListener("error", hideResultPicture);
  document.getElementById("close-result-picture").addEventListener("click", hideResultPicture);
  dialog.addEventListener("cancel", event => event.preventDefault());
  function resume() {
    pauseDialog.close();
    isPaused = false;
    previousFrame = 0;
    accumulator = 0;
    startMusic();
  }
  document.getElementById("pause").addEventListener("click", () => {
    if (isOver || isPaused) return;
    isPaused = true;
    pauseDialog.showModal();
  });
  document.getElementById("resume").addEventListener("click", resume);
  pauseDialog.addEventListener("cancel", event => { event.preventDefault(); resume(); });
  document.addEventListener("visibilitychange", () => { previousFrame = 0; accumulator = 0; });
  reset();
  requestAnimationFrame(frame);
})();
