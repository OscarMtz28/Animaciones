/**
 * Individual Boid agent class implementing Reynolds Flocking behaviors.
 */
class Boid {
  constructor(x, y) {
    this.position = new Vector2D(x, y);
    // Random direction and velocity
    this.velocity = Vector2D.random2D().mult(Math.random() * 2 + 1.5);
    this.acceleration = new Vector2D(0, 0);
    this.color = this.getRandomColor();
  }

  /**
   * Generates a sleek, vibrant neon color for the boid.
   */
  getRandomColor() {
    const colors = [
      '#00f0ff', // Cyan
      '#7000ff', // Purple
      '#ff007f', // Pink
      '#39ff14', // Neon Green
      '#ffaa00'  // Yellow-orange
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Applies a force to the boid.
   */
  applyForce(force) {
    this.acceleration.add(force);
  }

  /**
   * Updates position, velocity, and limits velocity. Resets acceleration.
   */
  update(maxSpeed, width, height) {
    this.velocity.add(this.acceleration);
    this.velocity.limit(maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);

    // Toroidal wrap-around boundaries
    this.position.x = (this.position.x + width) % width;
    this.position.y = (this.position.y + height) % height;
  }

  /**
   * Renders the boid as a sleek pointer representing its heading.
   */
  draw(ctx, settings, isHovered = false) {
    const angle = Math.atan2(this.velocity.y, this.velocity.x);
    const size = 6;

    // Draw perception radius if boid is hovered
    if (isHovered && settings) {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, settings.perceptionRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 240, 255, 0.02)';
      ctx.fill();

      // Separation radius
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, settings.separationRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 0, 127, 0.2)';
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(angle);

    // Glowing shadow for premium aesthetics
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(size * 2.2, 0);
    ctx.lineTo(-size, -size * 0.8);
    ctx.lineTo(-size * 0.4, 0);
    ctx.lineTo(-size, size * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Utility to compute the shortest displacement vector in a toroidal (wrap-around) space.
   */
  getToroidalDifference(targetPos, width, height) {
    let dx = targetPos.x - this.position.x;
    let dy = targetPos.y - this.position.y;

    if (dx > width / 2) dx -= width;
    else if (dx < -width / 2) dx += width;

    if (dy > height / 2) dy -= height;
    else if (dy < -height / 2) dy += height;

    return new Vector2D(dx, dy);
  }

  /**
   * Computes and applies flocking behaviors (Reynolds rules).
   */
  flock(boids, settings, grid, useGrid, width, height, stats) {
    let listToCheck;
    let perceptionRadius = settings.perceptionRadius;

    if (useGrid && grid) {
      // O(N) optimized lookup - get neighbors only from local grid cells
      listToCheck = grid.getNeighbors(this.position, perceptionRadius);
    } else {
      // O(N^2) brute force - check all boids
      listToCheck = boids;
    }

    let sepSum = new Vector2D();
    let aliSum = new Vector2D();
    let cohSum = new Vector2D();

    let sepCount = 0;
    let aliCount = 0;
    let cohCount = 0;

    const sepRadiusSq = settings.separationRadius * settings.separationRadius;
    const percRadiusSq = perceptionRadius * perceptionRadius;

    for (let i = 0; i < listToCheck.length; i++) {
      const other = listToCheck[i];
      if (other === this) continue;

      if (stats) stats.comparisons++;

      // Toroidal difference
      const diff = this.getToroidalDifference(other.position, width, height);
      const dSq = diff.magSq();

      // Rule 1: Separation (using separate radius)
      if (dSq < sepRadiusSq && dSq > 0) {
        const d = Math.sqrt(dSq);
        // Repulsion proportional to proximity
        const force = diff.copy().normalize().div(d);
        sepSum.sub(force); // subtract because we want to move away
        sepCount++;
      }

      // Rule 2 & 3: Alignment and Cohesion (using perception radius)
      if (dSq < percRadiusSq && dSq > 0) {
        aliSum.add(other.velocity);
        aliCount++;

        // Cohesion target is absolute position, which in toroidal difference
        // coordinates is just our position plus the wrapped offset.
        cohSum.add(Vector2D.add(this.position, diff));
        cohCount++;
      }
    }

    let sepSteer = new Vector2D();
    let aliSteer = new Vector2D();
    let cohSteer = new Vector2D();

    // 1. Separation force
    if (sepCount > 0) {
      sepSum.div(sepCount);
      if (sepSum.magSq() > 0) {
        sepSum.setMag(settings.maxSpeed);
        sepSteer = Vector2D.sub(sepSum, this.velocity);
        sepSteer.limit(settings.maxForce);
      }
    }

    // 2. Alignment force
    if (aliCount > 0) {
      aliSum.div(aliCount);
      aliSum.setMag(settings.maxSpeed);
      aliSteer = Vector2D.sub(aliSum, this.velocity);
      aliSteer.limit(settings.maxForce);
    }

    // 3. Cohesion force
    if (cohCount > 0) {
      cohSum.div(cohCount);
      const desired = this.getToroidalDifference(cohSum, width, height);
      desired.setMag(settings.maxSpeed);
      cohSteer = Vector2D.sub(desired, this.velocity);
      cohSteer.limit(settings.maxForce);
    }

    // Apply weighted steering forces
    sepSteer.mult(settings.w_sep);
    aliSteer.mult(settings.w_ali);
    cohSteer.mult(settings.w_coh);

    this.applyForce(sepSteer);
    this.applyForce(aliSteer);
    this.applyForce(cohSteer);
  }
}

// Export for ES modules or global usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Boid;
} else {
  window.Boid = Boid;
}
