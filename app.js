// ================== Responsive Canvas Setup (gesture drawing only) ==================
const viewport = document.getElementById("viewport");
const cvs = document.getElementById("gestureCanvas");
const ctx = cvs.getContext("2d");

function resizeCanvas() {
  const rect = viewport.getBoundingClientRect();
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  cvs.width = Math.floor(rect.width * dpr);
  cvs.height = Math.floor(rect.height * dpr);
  cvs.style.width = rect.width + "px";
  cvs.style.height = rect.height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale for crisp lines
  drawGrid();
  updateDebug();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ================== Placeholder Drawing (mouse/touch) ==================
let drawing = false;
const path = [];
function pt(e) {
  const rect = viewport.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  return { x, y };
}
function start(e) {
  drawing = true;
  path.length = 0;
  path.push(pt(e));
}
function move(e) {
  if (!drawing) return;
  path.push(pt(e));
  draw();
}
function end() {
  drawing = false; /* -> where you'd trigger gesture recognition */
}

viewport.addEventListener("mousedown", start);
viewport.addEventListener("mousemove", move);
window.addEventListener("mouseup", end);
viewport.addEventListener(
  "touchstart",
  (e) => {
    start(e);
    e.preventDefault();
  },
  { passive: false }
);
viewport.addEventListener(
  "touchmove",
  (e) => {
    move(e);
    e.preventDefault();
  },
  { passive: false }
);
window.addEventListener("touchend", end);

// ================== Visuals ==================
function drawGrid() {
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  const w = cvs.clientWidth,
    h = cvs.clientHeight;
  // faint 8-bit grid
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  const step = 16; // px grid size
  for (let x = 0; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  drawGrid();
  if (path.length < 2) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#01d0ff";
  ctx.shadowColor = "#00e5ff";
  ctx.shadowBlur = 8;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke();
  ctx.restore();
}

// ================== Buttons & Overlay ==================
const logEl = document.getElementById("log");
const scoreEl = document.getElementById("score");
const fpsEl = document.getElementById("fps");
const dbg = document.getElementById("debug");

function addLog(msg) {
  const now = new Date();
  const t = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  logEl.insertAdjacentHTML("afterbegin", `<p>[${t}] ${msg}</p>`);
  // bump score for fun
  const cur = parseInt(scoreEl.textContent, 10);
  scoreEl.textContent = (cur + 10).toString().padStart(6, "0");
}

// Wire buttons
const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnClear = document.getElementById("btnClear");
const btnOverlay = document.getElementById("btnOverlay");
const btnCloseHelp = document.getElementById("btnCloseHelp");
const help = document.getElementById("helpOverlay");

// ===== Main Menu Elements
const mainMenu = document.getElementById("mainMenu");
const gameUI = document.getElementById("gameUI"); // the .shell with id we added
const btnMenuStart = document.getElementById("btnMenuStart");
const btnMenuHow = document.getElementById("btnMenuHow");

btnStart.onclick = () => addLog("Game started.");
btnPause.onclick = () => addLog("Game paused.");
btnClear.onclick = () => {
  path.length = 0;
  drawGrid();
  addLog("Gesture cleared.");
};
btnOverlay.onclick = () => help.classList.add("show");
btnCloseHelp.onclick = () => help.classList.remove("show");

// Debug toggle
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "d") {
    dbg.hidden = !dbg.hidden;
    updateDebug();
  }
  if (e.key.toLowerCase() === "h") {
    help.classList.toggle("show");
  }
});

function updateDebug() {
  document.getElementById(
    "dbgSize"
  ).textContent = `${cvs.clientWidth}×${cvs.clientHeight}`;
}

// ================== FPS mock (for UI only) ==================
let last = performance.now(),
  frames = 0,
  tick = 0;
function loop(ts) {
  frames++;
  tick++;
  if (ts - last >= 1000) {
    fpsEl.textContent = frames;
    frames = 0;
    last = ts;
  }
  // idle glow on placeholder sprites
  const s1 = document.querySelector(".sprite");
  const s2 = document.querySelector(".sprite.enemy");
  if (s1) s1.style.transform = `translateY(${Math.sin(tick / 30) * 2}px)`;
  if (s2) s2.style.transform = `translateY(${Math.cos(tick / 24) * 2}px)`;
  requestAnimationFrame(loop);
}

function showGame() {
  if (mainMenu) mainMenu.classList.remove("show");
  if (gameUI) gameUI.classList.remove("hidden");
  addLog("Welcome, Larry Copper! Adventure begins.");
}

if (btnMenuStart) btnMenuStart.onclick = showGame;

if (btnMenuHow) {
  btnMenuHow.onclick = () => {
    // open the existing help overlay from your UI
    const help = document.getElementById("helpOverlay");
    if (help) help.classList.add("show");
  };
}

// Allow Enter to start from the menu
window.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && mainMenu && mainMenu.classList.contains("show")) {
    showGame();
  }
});

requestAnimationFrame(loop);

// ================== INTEGRATION HOOKS ==================
/**
 * Where to plug your CV logic:
 *  - Replace mouse/touch drawing with your hand-landmark path stream.
 *  - After end() or on a debounce, call your gesture recognizer.
 *  - When a gesture resolves, call addLog('Triangle recognized → Fireball armed.')
 *  - To render predicted path live, push points into `path` then call draw().
 */

// ================== SPRITE ANIMATION OPTIONS (no libs) ==================
/*
Option A — Pure CSS (sprite sheet):
.wiz{ width:64px; height:64px; background:url(assets/wizard.png) no-repeat 0 0 / auto 64px; }
.walk{ animation: walk 0.8s steps(8) infinite; }
@keyframes walk{ from{ background-position:0 0 } to{ background-position:-512px 0 } }

Option B — JS frame switcher:
const sheet = new Image(); sheet.src = 'assets/wizard.png';
const frames=8, fw=64, fh=64; let fi=0; setInterval(()=>{
  ctx.clearRect(x,y,fw,fh);
  ctx.drawImage(sheet, fi*fw, 0, fw, fh, x, y, fw, fh);
  fi=(fi+1)%frames;
}, 1000/12);
*/
