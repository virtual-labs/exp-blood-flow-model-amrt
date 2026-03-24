/**
 * Arterial Blood Flow Simulation V-2.0
 * Integrated Physics Engine
 */

// --- Global DOM Elements ---
const DOM = {
  homePage: document.getElementById("homePage"),
  simPage: document.getElementById("simPage"),
  header: document.getElementById("mainHeader"),
  artery: document.getElementById('artery'),
  pTop: document.getElementById('p-top'),
  pBottom: document.getElementById('p-bottom'),
  btns: document.querySelectorAll('.stage-btn'),
  radiusSlider: document.getElementById('radius-slider'),
  pressureSlider: document.getElementById('pressure-slider'),
  speedSlider: document.getElementById('speed-slider'),
  radiusVal: document.getElementById('radius-val'),
  pressureVal: document.getElementById('pressure-val'),
  speedVal: document.getElementById('speed-val')
};

// --- Simulation State ---
let currentStage = 'normal';
let spawnInterval;
let globalSpeedMultiplier = 1;

const STAGES = {
  normal: { heightRatio: 0, density: 12 },
  fatty: { heightRatio: 0.15, density: 12 },
  plaque: { heightRatio: 0.30, density: 12 }, // Max density for continuous flow
  blocked: { heightRatio: 0.55, density: 0 }
};

// --- Navigation Logic ---

// (Obsolete navigation functions removed)

// --- Simulation Logic ---

function getCurrentArteryHeight() {
  return parseInt(DOM.radiusSlider.value);
}

function updateRadius() {
  const val = DOM.radiusSlider.value;
  document.documentElement.style.setProperty('--artery-height', `${val}px`);
  DOM.radiusVal.innerText = `${val}px`;
  setStage(currentStage); // Re-adjust plaque
}

function updatePressure() {
  const val = DOM.pressureSlider.value;
  // Physics approximation for visual pulse
  const duration = 2.2 - (val / 55);
  const scale = 1 + (val / 400);

  document.documentElement.style.setProperty('--pulse-speed', `${duration}s`);
  document.documentElement.style.setProperty('--pulse-scale', scale);

  let label = "Normal";
  if (val > 80) label = "Hypertensive";
  if (val < 40) label = "Hypotensive";
  DOM.pressureVal.innerText = label;
}

function updateSpeed() {
  const val = DOM.speedSlider.value;
  globalSpeedMultiplier = 6 / val;
  DOM.speedVal.innerText = `${val} m/s`;
}

// --- Cell Spawner ---

function createCell() {
  // Only spawn if simulation is visible
  if (DOM.simPage.style.display === 'none') return;

  const cell = document.createElement('div');
  // WBCs disabled as per user request
  const isWBC = false;
  cell.classList.add('cell');
  cell.classList.add(isWBC ? 'wbc' : 'rbc');

  const currentHeight = getCurrentArteryHeight();
  const stageConfig = STAGES[currentStage];
  const wallPx = currentHeight * stageConfig.heightRatio;

  const muscleWall = 22;
  let openTop, openBottom;

  if (currentStage === 'blocked') {
    // Randomize: Top, Bottom, or Center blockage
    const rand = Math.random();

    if (rand < 0.33) {
      // Stuck near top plaque
      openTop = muscleWall + 2;
      openBottom = muscleWall + 15;
    } else if (rand < 0.66) {
      // Stuck near bottom plaque
      openTop = currentHeight - muscleWall - 50;
      openBottom = currentHeight - muscleWall - 38;
    } else {
      // Stuck in the center (where plaques meet)
      const center = currentHeight / 2;
      openTop = center - 15;
      openBottom = center + 5;
    }
  } else {
    // Constrain to open channel
    openTop = muscleWall + wallPx + 5;
    openBottom = currentHeight - muscleWall - wallPx - 45;

    if (openBottom < openTop) {
      const center = (currentHeight / 2) - 20;
      openTop = center - 5; openBottom = center + 5;
    }
  }

  let randomTop = Math.random() * (openBottom - openTop) + openTop;
  cell.style.top = `${randomTop}px`;

  // Animation Logic
  if (currentStage === 'blocked') {
    cell.classList.add('stuck');
    // For 'stuck' cells, we might need a horizontal offset so they don't all pile on exact x=50%
    // The CSS uses --stack-offset to vary the "end" position.
    const stackOffset = (Math.random() * 60) - 30; // wider spread
    cell.style.setProperty('--stack-offset', `${stackOffset}px`);
    cell.style.animationDuration = `${1.5 * globalSpeedMultiplier}s`;

    DOM.artery.appendChild(cell);

    // Cleanup stuck cells after 10s to prevent memory leaks
    setTimeout(() => { if (cell.parentNode) cell.remove(); }, 10000);
  } else {
    cell.classList.add('flowing');
    let baseSpeed = 3 * globalSpeedMultiplier;

    // Add resistance physics
    if (currentStage === 'plaque') baseSpeed *= 1.5;
    if (currentStage === 'fatty') baseSpeed *= 1.1;

    const finalSpeed = baseSpeed + (Math.random() * 0.5);
    cell.style.animationDuration = `${finalSpeed}s`;

    DOM.artery.appendChild(cell);

    // Cleanup after flow
    setTimeout(() => { if (cell.parentNode) cell.remove(); }, finalSpeed * 1000);
  }
}

// --- Stage Controller ---

// Expose setStage to global scope for HTML onclick access
window.setStage = function (stageName) {
  // Enable sliders and tools once a stage is selected
  document.querySelectorAll('input[type="range"], #toggle-graph-btn, #reset-btn').forEach(el => {
    if (el.disabled) {
      el.disabled = false;
      // Start animations on first real stage selection
      isHandFlowActive = true;
      updatePressure(); 
    }
  });

  currentStage = stageName;
  const config = STAGES[stageName];
  const h = getCurrentArteryHeight();

  DOM.btns.forEach(b => b.classList.remove('active'));
  document.getElementById(`btn-${stageName}`).classList.add('active');

  const pHeight = h * config.heightRatio;
  DOM.pTop.style.height = `${pHeight}px`;
  DOM.pBottom.style.height = `${pHeight}px`;

  clearInterval(spawnInterval);
  document.querySelectorAll('.cell').forEach(c => c.remove());

  if (stageName === 'blocked') {
    // Standard rate for blocked, no burst
    // Rate similar to others, or slightly slower/faster as preferred
    spawnInterval = setInterval(() => createCell(), 600);
  } else {
    const rate = 800 / (config.density / 5);
    spawnInterval = setInterval(() => createCell(), rate);
  }
}

// --- Reset Simulation ---

window.resetSimulation = function() {
  // 1. Reset Sliders to Defaults
  DOM.radiusSlider.value = 220;
  DOM.pressureSlider.value = 50;
  DOM.speedSlider.value = 5;

  // 2. Trigger Visual Updates
  updateRadius();
  updatePressure();
  updateSpeed();

  // 3. Reset completely to the Start Simulation screen
  window.resetSimulationControls();
  
  // 4. Force Graph Close if open
  if (isMaximized) {
    toggleMaximize();
  }
}

// --- Hand Animation & View Logic ---

const handCanvas = document.getElementById('handCanvas');
const handCtx = handCanvas ? handCanvas.getContext('2d') : null;
let handParticles = [];
let handAnimFrame;
let isHandFlowActive = false; // Controls blood flow animation in the hand SVG

// Coordinates from user provided SVG logic
const ARTERY_PATH = {
  start: { x: 0.075, y: 0.433 },
  cp: { x: 0.25, y: 0.425 },
  end: { x: 0.40, y: 0.383 }
};

class HandParticle {
  constructor() {
    this.progress = Math.random();
    this.speed = 0.003 + Math.random() * 0.003;

    // Scale particles proportionally to the hand size
    // Base width: 600px (Desktop max-width)
    const baseWidth = 600;
    const currentWidth = handCanvas ? handCanvas.width : baseWidth;
    let scaleFactor = currentWidth / baseWidth;

    // Clamp minimum scale to prevent particles from being invisible on small mobiles
    if (scaleFactor < 0.5) scaleFactor = 0.5;

    this.radius = (2 + Math.random() * 2) * scaleFactor;
  }
  update() {
    this.progress += this.speed;
    if (this.progress > 1) this.progress = 0;
  }
  draw(w, h) {
    if (!handCtx) return;
    const t = this.progress;

    // Quadratic Bezier (User provided logic)
    const invT = 1 - t;
    const x = (invT * invT * ARTERY_PATH.start.x * w) + (2 * invT * t * ARTERY_PATH.cp.x * w) + (t * t * ARTERY_PATH.end.x * w);
    const y = (invT * invT * ARTERY_PATH.start.y * h) + (2 * invT * t * ARTERY_PATH.cp.y * h) + (t * t * ARTERY_PATH.end.y * h);

    handCtx.beginPath();
    handCtx.arc(x, y, this.radius, 0, Math.PI * 2);

    let alpha = 1;
    if (this.progress < 0.1) alpha = this.progress * 10;
    if (this.progress > 0.9) alpha = (1 - this.progress) * 10;

    const g = handCtx.createRadialGradient(x, y, 0, x, y, this.radius);
    g.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
    g.addColorStop(1, `rgba(180, 0, 0, ${alpha})`);
    handCtx.fillStyle = g;
    handCtx.fill();
  }
}

function initHand() {
  if (!handCanvas) return;
  handCanvas.width = handCanvas.parentElement.offsetWidth;
  handCanvas.height = handCanvas.parentElement.offsetHeight;

  handParticles = [];
  for (let i = 0; i < 40; i++) handParticles.push(new HandParticle());

  if (handAnimFrame) cancelAnimationFrame(handAnimFrame);
  animateHand();
}

function animateHand() {
  if (!handCanvas) return;
  handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);
  
  if (isHandFlowActive) {
    handParticles.forEach(p => { p.update(); p.draw(handCanvas.width, handCanvas.height); });
  }
  
  handAnimFrame = requestAnimationFrame(animateHand);
}

// --- View Navigation ---

function goToSimulation() {
  DOM.homePage.style.display = "none";
  DOM.simPage.style.display = "block";
  document.getElementById("sim-entry-stage").style.display = "flex";
  document.getElementById("sim-hand-stage").style.display = "none";
}

function goToHandView() {
  document.getElementById("sim-entry-stage").style.display = "none";
  document.getElementById("sim-hand-stage").style.display = "flex";

  // START HAND ANIMATION
  setTimeout(initHand, 50);

  // START BLOOD FLOW SIM
  initSimulation();

  // Setup Initial State: Start Button visible, all other controls disabled
  window.resetSimulationControls();
}

window.resetSimulationControls = function() {
  const startBtn = document.getElementById('start-sim-action-btn');
  if (startBtn) startBtn.style.display = 'block';

  // Disable all controls initially
  document.querySelectorAll('.stage-btn, input[type="range"], #toggle-graph-btn, #reset-btn').forEach(el => el.disabled = true);
  
  // Remove active styling from stage buttons
  document.querySelectorAll('.stage-btn').forEach(b => b.classList.remove('active'));

  // Hide the simulation card
  const simCard = document.querySelector('.simulation-card');
  if (simCard) {
    simCard.style.opacity = '0';
    simCard.style.pointerEvents = 'none';
    simCard.style.transition = 'opacity 0.4s ease';
  }
  
  // Pause flow completely
  isHandFlowActive = false;
  clearInterval(spawnInterval);
  spawnInterval = null;
  document.querySelectorAll('.cell').forEach(c => c.remove());

  // Default visuals
  document.documentElement.style.setProperty('--pulse-speed', `0s`); // Pause pulse until start
}

window.startLabSimulation = function() {
  const startBtn = document.getElementById('start-sim-action-btn');
  if (startBtn) startBtn.style.display = 'none';

  // Note: Pulse is NOT restored here. It waits for Stage selection.

  // Show the simulation card
  const simCard = document.querySelector('.simulation-card');
  if (simCard) {
    simCard.style.opacity = '1';
    simCard.style.pointerEvents = 'auto';
  }

  // Enable Stages Condition buttons
  document.querySelectorAll('.stage-btn').forEach(btn => btn.disabled = false);
}

// expandToFullLab REMOVED


function goHome() {
  DOM.simPage.style.display = "none";
  DOM.homePage.style.display = "block";
  document.getElementById("sim-entry-stage").style.display = "none";

  // Stop Hand Animation
  if (handAnimFrame) cancelAnimationFrame(handAnimFrame);

  // Stop Sim
  clearInterval(spawnInterval);
  spawnInterval = null;
  document.querySelectorAll('.cell').forEach(c => c.remove());
}

// --- Initialization ---

function initSimulation() {
  // Listeners
  DOM.radiusSlider.addEventListener('input', updateRadius);
  DOM.pressureSlider.addEventListener('input', updatePressure);
  DOM.speedSlider.addEventListener('input', updateSpeed);

  // Set Defaults
  updatePressure();
  updateSpeed();
  initGraph();
}

let resizeTimeout;
window.addEventListener('resize', () => {
  // Clear previous timeout
  if (resizeTimeout) clearTimeout(resizeTimeout);

  // Update immediately for responsiveness
  if (document.getElementById("sim-hand-stage").style.display !== 'none') {
    initHand();
  }

  // Update again after delay to catch mobile URL bar settlements
  resizeTimeout = setTimeout(() => {
    if (document.getElementById("sim-hand-stage").style.display !== 'none') {
      initHand();
      updateMaximizedGraph();
    }
  }, 300);
});


// --- Analysis Graph Logic ---


let graphInterval;
let isMaximized = false;
let flowChart;

function toggleGraph() {
  const container = document.getElementById('graph-container');
  const btn = document.getElementById('toggle-graph-btn');

  // NOTE: Artery stays put in the magnifier.
  // Graph overlays or floats.

  if (!container) return;

  if (container.style.display === 'none') {
    // SHOW GRAPH
    container.style.display = 'block';

    if (btn) {
      btn.innerHTML = 'Hide Analysis Graph 📉';
      btn.classList.add('active');
    }

    if (!graphInterval) startGraphLoop();

    // On mobile, auto-maximize the graph for better viewing
    if (window.innerWidth <= 768 && !isMaximized) {
      setTimeout(() => toggleMaximize(), 100);
    }
  } else {
    // HIDE GRAPH
    if (isMaximized) {
      toggleMaximize();
    }

    container.style.display = 'none';

    if (btn) {
      btn.innerHTML = 'Show Analysis Graph 📈';
      btn.classList.remove('active');
    }

    stopGraphLoop();
  }
}



function updateMaximizedGraph() {
  if (!isMaximized) return;
  const container = document.getElementById('graph-container');
  if (!container) return;

  if (window.innerWidth > 900) {
    // Desktop: Large Graph (Centered in Sim Area)
    container.style.setProperty('width', 'calc(100vw - 400px)', 'important');
    container.style.setProperty('height', '80vh', 'important');
    container.style.setProperty('top', '50%', 'important');
    // Center in sim area
    container.style.setProperty('left', 'calc(340px + (100vw - 340px) / 2)', 'important');
    container.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
    container.style.setProperty('right', 'auto', 'important');
    container.style.setProperty('position', 'fixed', 'important');
    container.style.borderRadius = '12px';
  } else {
    // Mobile/Tablet: Landscape style at Top (Artery Location)
    if (document.getElementById('artery-wrapper')) document.getElementById('artery-wrapper').style.display = 'none';

    // User Update: Bigger Size and Hide Background
    container.style.setProperty('width', '95vw', 'important');
    container.style.setProperty('height', '85vh', 'important'); // Increased from 40vh
    container.style.setProperty('top', '50%', 'important'); // Center vertically
    container.style.setProperty('left', '50%', 'important');
    container.style.setProperty('transform', 'translate(-50%, -50%)', 'important'); // Center

    container.style.setProperty('right', 'auto', 'important');
    container.style.setProperty('position', 'fixed', 'important');
    container.style.setProperty('background', '#0f0f1b', 'important');
    container.style.setProperty('z-index', '21000', 'important');
    container.style.borderRadius = '12px';
  }
}

function toggleMaximize() {
  const container = document.getElementById('graph-container');
  const controls = document.getElementById('graph-controls');
  const canvas = document.getElementById('flowChart');
  const arteryWrapper = document.getElementById('artery-wrapper');

  if (!container) return;

  const footer = document.querySelector('.site-footer');


  isMaximized = !isMaximized;

  // Toggle Body Class for CSS targeting
  document.body.classList.toggle('graph-maximized', isMaximized);

  if (isMaximized) {
    // Maximize (Replace Simulation View)
    // MAXIMIZE
    container.classList.add('maximized'); // Add Class

    updateMaximizedGraph(); // Apply responsive styles
    window.addEventListener('resize', updateMaximizedGraph);

    // Common Maximized Styles
    // container.style.transform = 'none'; // Removed to allow updateMaximizedGraph to set transform
    container.style.bottom = ''; // Let CSS/JS handle
    container.style.right = '';  // Let CSS/JS handle
    container.style.zIndex = '10000';
    container.style.boxShadow = 'none'; // Remove dimming to see sidebar
    container.style.position = 'fixed'; // Ensure fixed positioning
    container.style.overflow = 'visible'; // Ensure buttons aren't clipped

    // Adjust controls (so they are visible inside)
    if (controls) {
      // Force position inside with high z-index - FIXED for scrolling
      controls.style.cssText = 'position: fixed !important; top: 15px !important; right: 15px !important; display: flex !important; gap: 5px; z-index: 20002 !important; transform: none !important;';
    }

    // Hide artery simulation
    // if (arteryWrapper) arteryWrapper.style.opacity = '0'; // Keep visible to allow overlap
    // Hide artery simulation Globally
    if (arteryWrapper) {
      arteryWrapper.style.display = 'none';
    }

    // Hide Footer to prevent overlap
    if (footer) footer.style.display = 'none';
  } else {
    // Minimize (Restore)
    container.classList.remove('maximized'); // Remove Class
    window.removeEventListener('resize', updateMaximizedGraph);

    // Reset to CSS defaults (defined in style.css #graph-container)
    container.style.width = '';
    container.style.height = '';
    container.style.top = '';
    container.style.left = '';
    container.style.bottom = '';
    container.style.right = '';
    container.style.transform = '';
    container.style.borderRadius = '';
    container.style.zIndex = '';
    container.style.boxShadow = '';
    container.style.position = '';
    container.style.overflow = '';

    // Reset controls (floating badge style)
    if (controls) {
      // Force position floating
      controls.style.cssText = 'position: absolute !important; top: -10px !important; right: -10px !important; display: flex !important; gap: 5px; z-index: 20002 !important; transform: none !important;';
    }

    // Show artery simulation
    if (arteryWrapper) {
      arteryWrapper.style.display = ''; // Restore default display
      arteryWrapper.style.opacity = '1';
      // Restore upward shift for minimized view
      arteryWrapper.style.transition = "all 0.5s ease";
      // arteryWrapper.style.transform = "translateY(-60%) scale(0.9)"; // OLD centering
      // NEW: It lives in Magnifier. Reset transform to be centered there.
      // In style.css .magnified-artery has transform: translate(-50%, -50%) scale(0.55);
      // So we should actually just clear inline transform?
      arteryWrapper.style.transform = '';
    }

    // Restore Footer
    if (footer) footer.style.display = '';
  }

  // Resize chart
  if (typeof flowChart !== 'undefined' && flowChart) flowChart.resize();
}


function initGraph() {
  if (typeof Chart === 'undefined') {
    console.error("Chart.js not loaded!");
    document.getElementById('graph-container').innerHTML += "<p style='color:red; text-align:center;'>Error: Chart library not loaded.</p>";
    return;
  }

  const ctx = document.getElementById('flowChart').getContext('2d');

  // Fix: Destroy existing chart instance if it exists
  if (typeof flowChart !== 'undefined' && flowChart) {
    flowChart.destroy();
  }

  flowChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Blood Flow Rate (mL/min)',
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        data: [],
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: {
        padding: 10
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Time (s)',
            color: '#aaa',
            font: { size: 12 }
          },
          grid: { color: '#333' },
          ticks: { color: '#ccc', maxTicksLimit: 8 }
        },
        y: {
          beginAtZero: true,
          suggestedMax: 100,
          title: {
            display: true,
            text: 'Flow Rate (mL/min)',
            color: '#aaa',
            font: { size: 12 }
          },
          grid: { color: '#333' },
          ticks: { color: '#eee' }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#eee', font: { size: 14 } }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      }
    }
  });
}

function calculateFlowRate() {
  // Simplified Poiseuille's Law: Q = P * r^4
  // We need to normalize values to a readable scale (0-100ish)

  const P = parseInt(DOM.pressureSlider.value); // 1-100
  const r_base = parseInt(DOM.radiusSlider.value); // 150-350

  // Calculate Effective Radius based on Obstruction
  let obstruction = 0;
  // Use STAGES data if available, else infer
  if (STAGES[currentStage]) {
    obstruction = STAGES[currentStage].heightRatio;
    // If blocked, effective radius is much smaller (or zero if totally blocked)
    // blocked heightRatio is 0.55, meaning 55% obstructed? 
    // Actually in code: wallPx = H * ratio. 
    // The open space is H - 2*wall - 2*plaque?
    // Let's rely on the ratio.
    // 0.55 means >50% blocked from top AND bottom? effectively 100% blocked?
    // In the visual code: openTop/Bottom logic suggests:
    // Plaque: ratio 0.30 -> Top=30%, Bottom=30% -> 60% blocked -> 40% open.
    // Blocked: ratio 0.55 -> Top=55%, Bottom=55% -> Overlap -> 100% blocked.
  }

  // Cap obstruction at almost 1 (100%)
  const effective_r_ratio = Math.max(0, 1 - (obstruction * 2));
  // *2 because plaque is on both sides (top and bottom) usually in models, 
  // or simple approximation: r_eff = r_base * (1 - ratio).
  // Let's use the visual open gap as proxy.
  // Stage "Blocked" (0.55) -> 1 - 1.1 = -0.1 -> 0 flow. Correct.
  // Stage "Plaque" (0.30) -> 1 - 0.6 = 0.4 -> 40% capacity.

  const r_eff = r_base * effective_r_ratio;

  // Q propto P * r^4
  // Normalize: Max Flow (P=100, r=350, obs=0) -> 100 * 350^4
  // Let's allow numbers to just be relative score 0-100.

  // Constants for scaling
  const K = 0.000000006;
  let flow = P * Math.pow(r_eff, 4) * K;

  return Math.max(0, flow.toFixed(1));
}

function startGraphLoop() {
  if (graphInterval) clearInterval(graphInterval);
  graphInterval = setInterval(() => {
    const flow = calculateFlowRate();

    // Add Data
    const now = new Date().toLocaleTimeString();
    flowChart.data.labels.push(now);
    flowChart.data.datasets[0].data.push(flow);

    // Keep only last 20 points
    if (flowChart.data.labels.length > 30) {
      flowChart.data.labels.shift();
      flowChart.data.datasets[0].data.shift();
    }

    flowChart.update();
  }, 500); // Update every 500ms
}

function stopGraphLoop() {
  clearInterval(graphInterval);
  graphInterval = null;
}

// --- Dynamic Connector Positioning ---
function positionConnectors() {
  const wrapper = document.querySelector('.hand-wrapper');
  const magnifier = document.querySelector('.magnifier-container');
  const topConn = document.querySelector('.connector-desktop.top');
  const botConn = document.querySelector('.connector-desktop.bottom');
  const mobLeft = document.querySelector('.connector-mobile.left');
  const mobRight = document.querySelector('.connector-mobile.right');

  if (!wrapper || !magnifier) return;

  const wrapperRect = wrapper.getBoundingClientRect();
  const magRect = magnifier.getBoundingClientRect();

  // The artery fork is at roughly 40% from left, 38.3% from top of the hand SVG
  const forkX = wrapperRect.left + wrapperRect.width * 0.40;
  const forkY = wrapperRect.top + wrapperRect.height * 0.383;

  // Magnifier center and radius
  const magCX = magRect.left + magRect.width / 2;
  const magCY = magRect.top + magRect.height / 2;
  const magR = magRect.width / 2;

  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // Mobile: connectors go downward from fork to magnifier top-left and top-right edges
    const magTopLeftX = magCX - magR * 0.85;
    const magTopLeftY = magCY - magR * 0.5;
    const magTopRightX = magCX + magR * 0.85;
    const magTopRightY = magCY - magR * 0.5;

    setConnectorLine(mobLeft, forkX, forkY, magTopLeftX, magTopLeftY, wrapperRect);
    setConnectorLine(mobRight, forkX, forkY, magTopRightX, magTopRightY, wrapperRect);
  } else {
    // Desktop: connectors go rightward from fork to magnifier top and bottom edges
    const magTopX = magCX - magR * 0.25;
    const magTopY = magCY - magR * 0.97;
    const magBotX = magCX - magR * 0.25;
    const magBotY = magCY + magR * 0.97;

    setConnectorLine(topConn, forkX, forkY, magTopX, magTopY, wrapperRect);
    setConnectorLine(botConn, forkX, forkY, magBotX, magBotY, wrapperRect);
  }
}

function setConnectorLine(el, x1, y1, x2, y2, parentRect) {
  if (!el) return;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Position relative to parent (.hand-wrapper)
  const relX = x1 - parentRect.left;
  const relY = y1 - parentRect.top;

  el.style.position = 'absolute';
  el.style.left = relX + 'px';
  el.style.top = relY + 'px';
  el.style.width = length + 'px';
  el.style.height = '2px';
  el.style.transform = `rotate(${angle}deg)`;
  el.style.transformOrigin = '0 0';
}

// Run on resize and after entering hand view
window.addEventListener('resize', () => {
  requestAnimationFrame(positionConnectors);
});

// Also hook into the goToHandView transition
const _origGoToHandView = window.goToHandView;
if (typeof _origGoToHandView === 'function') {
  window.goToHandView = function() {
    _origGoToHandView.apply(this, arguments);
    // Allow DOM to settle, then position connectors
    setTimeout(positionConnectors, 400);
    setTimeout(positionConnectors, 800);
  };
}