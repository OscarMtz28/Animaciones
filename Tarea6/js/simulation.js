/**
 * Simulation Controller for managing boid updates, rendering, and performance tracking.
 */
class Simulation {
  constructor(canvasId, useGrid = false) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.useGrid = useGrid;
    this.boids = [];
    this.grid = null;
    this.isRunning = false;
    this.animationFrameId = null;

    // Default settings
    this.settings = {
      w_sep: 1.5,
      w_ali: 1.0,
      w_coh: 1.0,
      perceptionRadius: 50,
      separationRadius: 25,
      maxSpeed: 4.0,
      maxForce: 0.15,
      numBoids: useGrid ? 300 : 50,
      showGrid: false,
      showPerception: true
    };

    // Performance and calculations statistics
    this.stats = {
      fps: 60,
      frameTime: 0,
      comparisons: 0,
      activeBoids: 0
    };

    // FPS calculation variables
    this.lastTime = 0;
    this.frameCount = 0;
    this.fpsInterval = 1000; // Recalculate FPS every second
    this.lastFpsUpdate = 0;

    // Interaction states
    this.mousePos = new Vector2D(-1000, -1000);
    this.hoveredBoid = null;

    // Bind methods to this instance
    this.loop = this.loop.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.setupCanvas();
    this.initEvents();
  }

  /**
   * Sets canvas dimensions and initializes grid if optimized mode is active.
   */
  setupCanvas() {
    const container = this.canvas.parentElement;
    this.width = container.clientWidth || 800;
    this.height = container.clientHeight || 500;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    const maxRadius = Math.max(this.settings.perceptionRadius, this.settings.separationRadius);
    if (this.useGrid) {
      if (!this.grid) {
        this.grid = new SpatialHashGrid(this.width, this.height, maxRadius);
      } else {
        this.grid.resize(this.width, this.height, maxRadius);
      }
    }
  }

  /**
   * Updates boids counts to match GUI configuration.
   */
  syncBoidsCount() {
    const target = this.settings.numBoids;
    if (this.boids.length < target) {
      const toAdd = target - this.boids.length;
      for (let i = 0; i < toAdd; i++) {
        // Spawn randomly in the canvas space
        const x = Math.random() * this.width;
        const y = Math.random() * this.height;
        this.boids.push(new Boid(x, y));
      }
    } else if (this.boids.length > target) {
      this.boids.length = target;
    }
    this.stats.activeBoids = this.boids.length;
  }

  /**
   * Installs resize and mouse interactivity events.
   */
  initEvents() {
    window.addEventListener('resize', this.handleResize);

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.set(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mousePos.set(-1000, -1000);
      this.hoveredBoid = null;
    });

    // Add boid on click
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newBoid = new Boid(x, y);
      this.boids.push(newBoid);
      this.settings.numBoids = this.boids.length;
      this.stats.activeBoids = this.boids.length;
      
      // Update UI slider if available
      const slider = document.querySelector(`.boid-count-slider[data-sim="${this.useGrid ? 'opt' : 'std'}"]`);
      if (slider) {
        slider.value = this.boids.length;
        const output = slider.nextElementSibling;
        if (output) output.textContent = this.boids.length;
      }
    });
  }

  handleResize() {
    this.setupCanvas();
  }

  /**
   * Starts the simulation cycle.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastFpsUpdate = this.lastTime;
    this.frameCount = 0;
    this.syncBoidsCount();
    
    // Clear canvas to dark blue
    this.ctx.fillStyle = '#0f111a';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  /**
   * Stops/pauses the simulation.
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Core physics and rendering update loop.
   */
  loop(timestamp) {
    if (!this.isRunning) return;

    // Calculate FPS
    this.frameCount++;
    const elapsed = timestamp - this.lastFpsUpdate;
    if (elapsed >= this.fpsInterval) {
      this.stats.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdate = timestamp;
    }

    const t0 = performance.now();
    this.stats.comparisons = 0;

    // 1. Re-populate spatial grid if optimized mode is active
    if (this.useGrid && this.grid) {
      // Re-configure grid cellSize in case radii settings changed
      const maxRadius = Math.max(this.settings.perceptionRadius, this.settings.separationRadius);
      if (this.grid.cellSize !== maxRadius) {
        this.grid.resize(this.width, this.height, maxRadius);
      }
      this.grid.clear();
      for (let i = 0; i < this.boids.length; i++) {
        this.grid.insert(this.boids[i]);
      }
    }

    // 2. Compute flocking forces
    for (let i = 0; i < this.boids.length; i++) {
      this.boids[i].flock(
        this.boids,
        this.settings,
        this.grid,
        this.useGrid,
        this.width,
        this.height,
        this.stats
      );
    }

    // 3. Update physics kinematics
    for (let i = 0; i < this.boids.length; i++) {
      this.boids[i].update(this.settings.maxSpeed, this.width, this.height);
    }

    // Measure physics computation duration
    const t1 = performance.now();
    this.stats.frameTime = t1 - t0;

    // 4. Render frame
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  /**
   * Finds the closest boid to a given point.
   */
  getClosestBoid(pos, maxDist) {
    let closest = null;
    let minDist = maxDist;

    for (let i = 0; i < this.boids.length; i++) {
      const d = this.boids[i].position.dist(pos);
      if (d < minDist) {
        minDist = d;
        closest = this.boids[i];
      }
    }
    return closest;
  }

  /**
   * Renders background, grid cells, boids, and interactive overlays.
   */
  render() {
    // Semi-transparent background fill for premium motion blur (trails)
    this.ctx.fillStyle = 'rgba(15, 17, 26, 0.22)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw grid visualization in optimized mode
    if (this.useGrid && this.settings.showGrid && this.grid) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      this.ctx.lineWidth = 1;
      
      // Draw grid vertical columns
      for (let c = 0; c <= this.grid.cols; c++) {
        const x = c * this.grid.cellSize;
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.height);
        this.ctx.stroke();
      }

      // Draw grid horizontal rows
      for (let r = 0; r <= this.grid.rows; r++) {
        const y = r * this.grid.cellSize;
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
        this.ctx.stroke();
      }

      // Render cell population sizes as small indicators
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.font = '9px monospace';
      for (let c = 0; c < this.grid.cols; c++) {
        for (let r = 0; r < this.grid.rows; r++) {
          const count = this.grid.cells[c][r].length;
          if (count > 0) {
            this.ctx.fillText(
              count,
              c * this.grid.cellSize + 5,
              r * this.grid.cellSize + 12
            );
          }
        }
      }
    }

    // Interactivity: Find boid closest to mouse
    if (this.settings.showPerception && this.mousePos.x > -500) {
      this.hoveredBoid = this.getClosestBoid(this.mousePos, 80);
    } else {
      this.hoveredBoid = null;
    }

    // Draw all boids
    for (let i = 0; i < this.boids.length; i++) {
      const isHovered = (this.boids[i] === this.hoveredBoid);
      this.boids[i].draw(this.ctx, this.settings, isHovered);
    }
  }

  /**
   * Tears down events and stops animation frame.
   */
  destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
  }
}

// Export for ES modules or global usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Simulation;
} else {
  window.Simulation = Simulation;
}
