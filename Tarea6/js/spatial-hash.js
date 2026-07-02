/**
 * Spatial Hash Grid for 2D neighborhood queries.
 * Divides the 2D space into uniform grid cells to optimize neighbor lookup from O(N^2) to O(N).
 */
class SpatialHashGrid {
  constructor(width, height, cellSize) {
    this.width = width;
    this.height = height;
    this.cellSize = Math.max(10, cellSize); // Avoid division by zero or extremely small cells
    this.cols = Math.ceil(width / this.cellSize);
    this.rows = Math.ceil(height / this.cellSize);
    
    this.initGrid();
  }

  /**
   * Initializes or resets the grid cells array.
   */
  initGrid() {
    this.cells = new Array(this.cols);
    for (let i = 0; i < this.cols; i++) {
      this.cells[i] = new Array(this.rows);
      for (let j = 0; j < this.rows; j++) {
        this.cells[i][j] = [];
      }
    }
  }

  /**
   * Reconfigures grid parameters and reinitializes cells.
   */
  resize(width, height, cellSize) {
    this.width = width;
    this.height = height;
    this.cellSize = Math.max(10, cellSize);
    this.cols = Math.ceil(width / this.cellSize);
    this.rows = Math.ceil(height / this.cellSize);
    this.initGrid();
  }

  /**
   * Clears the items in all grid cells.
   */
  clear() {
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        this.cells[i][j].length = 0;
      }
    }
  }

  /**
   * Inserts a boid into the grid.
   * Handles clamping/wrapping of positions to valid grid cells.
   */
  insert(boid) {
    const cx = Math.floor(boid.position.x / this.cellSize);
    const cy = Math.floor(boid.position.y / this.cellSize);

    // Toroidal wrapping of grid indices
    const col = ((cx % this.cols) + this.cols) % this.cols;
    const row = ((cy % this.rows) + this.rows) % this.rows;

    this.cells[col][row].push(boid);
  }

  /**
   * Retrieves all boids in cells within distance `radius` of a given position.
   * Supports toroidal wrap-around cell checks.
   */
  getNeighbors(position, radius) {
    const neighbors = [];
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    const cellRange = Math.ceil(radius / this.cellSize);

    for (let dx = -cellRange; dx <= cellRange; dx++) {
      for (let dy = -cellRange; dy <= cellRange; dy++) {
        const col = ((cx + dx) % this.cols + this.cols) % this.cols;
        const row = ((cy + dy) % this.rows + this.rows) % this.rows;

        const cell = this.cells[col][row];
        for (let i = 0; i < cell.length; i++) {
          neighbors.push(cell[i]);
        }
      }
    }
    return neighbors;
  }
}

// Export for ES modules or global usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpatialHashGrid;
} else {
  window.SpatialHashGrid = SpatialHashGrid;
}
