/**
 * Plinko Game - Main Game Logic
 * Uses Matter.js for physics simulation
 */

(function() {
  // ===========================================
  // Configuration
  // ===========================================
  const CONFIG = {
    rows: 12,                    // Number of peg rows
    pegRadius: 4,                // Peg size
    ballRadius: 8,               // Ball size
    pegGap: 35,                  // Horizontal gap between pegs
    rowGap: 30,                  // Vertical gap between rows
    canvasWidth: 500,            // Canvas width
    canvasHeight: 450,           // Canvas height
    ballDropVariance: 15,        // Random horizontal variance for drop
    
    // Multipliers (left to right, symmetric)
    multipliers: [10, 3, 1.5, 1.2, 1, 0.5, 0.3, 0.5, 1, 1.2, 1.5, 3, 10],
    
    // Multiplier tiers for coloring
    multiplierTiers: {
      10: 'tier-1',
      3: 'tier-2',
      1.5: 'tier-3',
      1.2: 'tier-4',
      1: 'tier-4',
      0.5: 'tier-5',
      0.3: 'tier-6'
    }
  };

  // ===========================================
  // State
  // ===========================================
  let engine, render, runner;
  let balls = [];
  let isDropping = false;
  let bucketPositions = [];

  // ===========================================
  // Matter.js Setup
  // ===========================================
  const { Engine, Render, Runner, Bodies, Body, Composite, Events } = Matter;

  function initGame() {
    // Create engine
    engine = Engine.create({
      gravity: { x: 0, y: 1 }
    });

    // Get canvas
    const canvas = document.getElementById('plinkoCanvas');
    canvas.width = CONFIG.canvasWidth;
    canvas.height = CONFIG.canvasHeight;

    // Create renderer
    render = Render.create({
      canvas: canvas,
      engine: engine,
      options: {
        width: CONFIG.canvasWidth,
        height: CONFIG.canvasHeight,
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio || 1
      }
    });

    // Create pegs
    createPegs();
    
    // Create walls
    createWalls();
    
    // Create multiplier display
    createMultiplierDisplay();

    // Setup collision detection
    setupCollisionDetection();

    // Run engine and renderer
    runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);
  }

  function createPegs() {
    const startY = 50;
    const centerX = CONFIG.canvasWidth / 2;

    for (let row = 0; row < CONFIG.rows; row++) {
      const pegsInRow = row + 3;
      const rowWidth = (pegsInRow - 1) * CONFIG.pegGap;
      const startX = centerX - rowWidth / 2;

      for (let col = 0; col < pegsInRow; col++) {
        const x = startX + col * CONFIG.pegGap;
        const y = startY + row * CONFIG.rowGap;

        const peg = Bodies.circle(x, y, CONFIG.pegRadius, {
          isStatic: true,
          restitution: 0.5,
          friction: 0.1,
          render: {
            fillStyle: '#8b5cf6'
          },
          label: 'peg'
        });

        Composite.add(engine.world, peg);
      }
    }

    // Calculate bucket positions based on final row
    const finalRowPegs = CONFIG.rows + 3;
    const finalRowWidth = (finalRowPegs - 1) * CONFIG.pegGap;
    const finalStartX = centerX - finalRowWidth / 2;
    
    bucketPositions = [];
    for (let i = 0; i <= finalRowPegs; i++) {
      const leftBound = i === 0 ? 0 : finalStartX + (i - 1) * CONFIG.pegGap + CONFIG.pegGap / 2;
      const rightBound = i === finalRowPegs ? CONFIG.canvasWidth : finalStartX + i * CONFIG.pegGap - CONFIG.pegGap / 2;
      bucketPositions.push({
        left: leftBound,
        right: rightBound,
        center: (leftBound + rightBound) / 2
      });
    }
  }

  function createWalls() {
    const wallThickness = 20;
    
    // Left wall
    const leftWall = Bodies.rectangle(
      -wallThickness / 2, 
      CONFIG.canvasHeight / 2, 
      wallThickness, 
      CONFIG.canvasHeight,
      { isStatic: true, render: { visible: false } }
    );
    
    // Right wall
    const rightWall = Bodies.rectangle(
      CONFIG.canvasWidth + wallThickness / 2, 
      CONFIG.canvasHeight / 2, 
      wallThickness, 
      CONFIG.canvasHeight,
      { isStatic: true, render: { visible: false } }
    );
    
    // Bottom sensor (to detect ball landing)
    const bottomSensor = Bodies.rectangle(
      CONFIG.canvasWidth / 2,
      CONFIG.canvasHeight + 10,
      CONFIG.canvasWidth,
      20,
      { 
        isStatic: true, 
        isSensor: true, 
        label: 'bottomSensor',
        render: { visible: false } 
      }
    );

    Composite.add(engine.world, [leftWall, rightWall, bottomSensor]);
  }

  function createMultiplierDisplay() {
    const multiplierRow = document.getElementById('multiplierRow');
    multiplierRow.innerHTML = '';

    CONFIG.multipliers.forEach((mult, index) => {
      const bucket = document.createElement('div');
      bucket.className = `multiplier-bucket ${CONFIG.multiplierTiers[mult] || 'tier-4'}`;
      bucket.textContent = `${mult}x`;
      bucket.dataset.index = index;
      multiplierRow.appendChild(bucket);
    });
  }

  function setupCollisionDetection() {
    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        
        // Check if ball hit bottom sensor
        if (bodyA.label === 'bottomSensor' || bodyB.label === 'bottomSensor') {
          const ball = bodyA.label === 'ball' ? bodyA : bodyB.label === 'ball' ? bodyB : null;
          if (ball && !ball.landed) {
            ball.landed = true;
            handleBallLanding(ball);
          }
        }
      });
    });
  }

  function handleBallLanding(ball) {
    const x = ball.position.x;
    
    // Determine which bucket the ball landed in
    let bucketIndex = 0;
    for (let i = 0; i < bucketPositions.length; i++) {
      if (x >= bucketPositions[i].left && x < bucketPositions[i].right) {
        bucketIndex = i;
        break;
      }
    }

    // Map bucket to multiplier (handle edge cases)
    const multiplierIndex = Math.min(bucketIndex, CONFIG.multipliers.length - 1);
    const multiplier = CONFIG.multipliers[multiplierIndex];
    
    // Calculate winnings
    const betAmount = ball.betAmount;
    const winAmount = Math.floor(betAmount * multiplier);
    
    // Award chips
    ChipManager.award(winAmount);
    
    // Update UI
    updateResult(multiplier, winAmount, betAmount);
    highlightBucket(multiplierIndex);
    
    // Remove ball after delay
    setTimeout(() => {
      Composite.remove(engine.world, ball);
      balls = balls.filter(b => b !== ball);
      
      // Re-enable drop button if no balls
      if (balls.length === 0) {
        isDropping = false;
        document.getElementById('dropBtn').disabled = false;
      }
    }, 500);
  }

  function updateResult(multiplier, winAmount, betAmount) {
    const resultDisplay = document.getElementById('resultDisplay');
    const lastMultiplier = document.getElementById('lastMultiplier');
    const lastWin = document.getElementById('lastWin');
    
    lastMultiplier.textContent = `${multiplier}x`;
    
    const profit = winAmount - betAmount;
    if (profit > 0) {
      lastWin.textContent = `+${ChipManager.format(profit)}`;
      lastWin.className = 'result-amount win';
    } else if (profit < 0) {
      lastWin.textContent = `${ChipManager.format(profit)}`;
      lastWin.className = 'result-amount lose';
    } else {
      lastWin.textContent = `${ChipManager.format(0)}`;
      lastWin.className = 'result-amount';
    }
    
    // Celebration animation for big wins
    if (multiplier >= 3) {
      resultDisplay.classList.add('celebrate');
      setTimeout(() => resultDisplay.classList.remove('celebrate'), 600);
    }
  }

  function highlightBucket(index) {
    const buckets = document.querySelectorAll('.multiplier-bucket');
    buckets.forEach((b, i) => {
      if (i === index) {
        b.classList.add('active', 'highlight');
        setTimeout(() => {
          b.classList.remove('active', 'highlight');
        }, 1000);
      }
    });
  }

  // ===========================================
  // Game Actions
  // ===========================================
  window.dropBall = function() {
    if (isDropping) return;

    const betInput = document.getElementById('betAmount');
    const betAmount = parseInt(betInput.value, 10) || 100;

    // Validate bet
    if (betAmount < 10) {
      alert('最小下注金額為 10');
      return;
    }

    if (!ChipManager.canAfford(betAmount)) {
      alert('籌碼不足！');
      return;
    }

    // Deduct bet
    ChipManager.deduct(betAmount);
    
    // Disable button temporarily
    isDropping = true;
    document.getElementById('dropBtn').disabled = true;

    // Create ball with random horizontal offset
    const centerX = CONFIG.canvasWidth / 2;
    const dropX = centerX + (Math.random() - 0.5) * CONFIG.ballDropVariance * 2;

    const ball = Bodies.circle(dropX, 10, CONFIG.ballRadius, {
      restitution: 0.6,
      friction: 0.1,
      frictionAir: 0.01,
      density: 0.001,
      render: {
        fillStyle: '#fbbf24',
        strokeStyle: '#f59e0b',
        lineWidth: 2
      },
      label: 'ball'
    });

    ball.betAmount = betAmount;
    ball.landed = false;

    balls.push(ball);
    Composite.add(engine.world, ball);

    // Re-enable after short delay (for rapid drops)
    setTimeout(() => {
      if (balls.length < 5) {
        isDropping = false;
        document.getElementById('dropBtn').disabled = false;
      }
    }, 300);
  };

  window.adjustBet = function(delta) {
    const betInput = document.getElementById('betAmount');
    let value = parseInt(betInput.value, 10) || 100;
    value = Math.max(10, Math.min(10000, value + delta));
    betInput.value = value;
  };

  window.setBet = function(amount) {
    document.getElementById('betAmount').value = amount;
  };

  // ===========================================
  // Initialize
  // ===========================================
  document.addEventListener('DOMContentLoaded', initGame);
})();
