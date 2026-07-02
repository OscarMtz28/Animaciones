/**
 * Main application logic. Connects UI controls to the simulations and handles tab switching.
 */
document.addEventListener('DOMContentLoaded', () => {
  // --- Initialize Simulations ---
  const stdSim = new Simulation('sim-std-canvas', false);
  const optSim = new Simulation('sim-opt-canvas', true);

  // For the side-by-side comparison tab, we run both simulations concurrently
  const compStdSim = new Simulation('sim-comp-std-canvas', false);
  const compOptSim = new Simulation('sim-comp-opt-canvas', true);

  // Default comparison settings (start with 150 boids to show clear divergence)
  compStdSim.settings.numBoids = 150;
  compOptSim.settings.numBoids = 150;

  // Active simulation pointer for the current tab
  let activeTab = 'standard';
  stdSim.start(); // Start standard by default

  // --- Tab Switching Logic ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      if (targetTab === activeTab) return;

      // Update active button state
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Update visible panel state
      tabPanels.forEach(panel => panel.classList.remove('active'));
      document.getElementById(`panel-${targetTab}`).classList.add('active');

      // Stop previous active simulations to conserve resources
      stopAllSimulations();

      activeTab = targetTab;

      // Start current active simulation(s)
      if (activeTab === 'standard') {
        stdSim.start();
        syncUIWithSettings(stdSim, 'std');
      } else if (activeTab === 'optimized') {
        optSim.start();
        syncUIWithSettings(optSim, 'opt');
      } else if (activeTab === 'comparison') {
        compStdSim.start();
        compOptSim.start();
        syncUIWithSettings(compOptSim, 'comp'); // sync comp sliders with values
      }
    });
  });

  function stopAllSimulations() {
    stdSim.stop();
    optSim.stop();
    compStdSim.stop();
    compOptSim.stop();
  }

  // --- UI Controls Binding ---

  // Helper to setup controls for a given simulation prefix ('std', 'opt', 'comp')
  function setupSimulationControls(simInstance, prefix) {
    const isComp = (prefix === 'comp');

    // Number of Boids
    bindSlider(`${prefix}-boids-slider`, (val) => {
      if (isComp) {
        compStdSim.settings.numBoids = val;
        compOptSim.settings.numBoids = val;
        compStdSim.syncBoidsCount();
        compOptSim.syncBoidsCount();
      } else {
        simInstance.settings.numBoids = val;
        simInstance.syncBoidsCount();
      }
    });

    // Separation Weight (w_sep)
    bindSlider(`${prefix}-wsep-slider`, (val) => {
      if (isComp) {
        compStdSim.settings.w_sep = val;
        compOptSim.settings.w_sep = val;
      } else {
        simInstance.settings.w_sep = val;
      }
    });

    // Alignment Weight (w_ali)
    bindSlider(`${prefix}-wali-slider`, (val) => {
      if (isComp) {
        compStdSim.settings.w_ali = val;
        compOptSim.settings.w_ali = val;
      } else {
        simInstance.settings.w_ali = val;
      }
    });

    // Cohesion Weight (w_coh)
    bindSlider(`${prefix}-wcoh-slider`, (val) => {
      if (isComp) {
        compStdSim.settings.w_coh = val;
        compOptSim.settings.w_coh = val;
      } else {
        simInstance.settings.w_coh = val;
      }
    });

    // Perception Radius
    bindSlider(`${prefix}-rperc-slider`, (val) => {
      if (isComp) {
        compStdSim.settings.perceptionRadius = val;
        compOptSim.settings.perceptionRadius = val;
      } else {
        simInstance.settings.perceptionRadius = val;
      }
    });

    // Separation Radius
    bindSlider(`${prefix}-rsep-slider`, (val) => {
      if (isComp) {
        compStdSim.settings.separationRadius = val;
        compOptSim.settings.separationRadius = val;
      } else {
        simInstance.settings.separationRadius = val;
      }
    });

    // Max Speed
    bindSlider(`${prefix}-maxspeed-slider`, (val) => {
      if (isComp) {
        compStdSim.settings.maxSpeed = val;
        compOptSim.settings.maxSpeed = val;
      } else {
        simInstance.settings.maxSpeed = val;
      }
    });

    // Max Force
    bindSlider(`${prefix}-maxforce-slider`, (val) => {
      if (isComp) {
        compStdSim.settings.maxForce = val;
        compOptSim.settings.maxForce = val;
      } else {
        simInstance.settings.maxForce = val;
      }
    });

    // Toggle Switches (Perception Radius drawing)
    const percSwitch = document.getElementById(`${prefix}-showperc-switch`);
    if (percSwitch) {
      percSwitch.addEventListener('change', (e) => {
        if (isComp) {
          compStdSim.settings.showPerception = e.target.checked;
          compOptSim.settings.showPerception = e.target.checked;
        } else {
          simInstance.settings.showPerception = e.target.checked;
        }
      });
    }

    // Toggle Grid switch (Only available for optimized sim)
    const gridSwitch = document.getElementById(`${prefix}-showgrid-switch`);
    if (gridSwitch) {
      gridSwitch.addEventListener('change', (e) => {
        simInstance.settings.showGrid = e.target.checked;
      });
    }
  }

  // General helper to bind range inputs and update display label
  function bindSlider(id, callback) {
    const slider = document.getElementById(id);
    if (!slider) return;

    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      const displayLabel = slider.parentElement.querySelector('.control-value');
      if (displayLabel) {
        displayLabel.textContent = val;
      }
      callback(val);
    });
  }

  // Updates the HTML sliders and text indicators to match current settings
  function syncUIWithSettings(sim, prefix) {
    const s = sim.settings;
    const elementsMap = {
      'boids': s.numBoids,
      'wsep': s.w_sep,
      'wali': s.w_ali,
      'wcoh': s.w_coh,
      'rperc': s.perceptionRadius,
      'rsep': s.separationRadius,
      'maxspeed': s.maxSpeed,
      'maxforce': s.maxForce
    };

    for (const [key, val] of Object.entries(elementsMap)) {
      const slider = document.getElementById(`${prefix}-${key}-slider`);
      if (slider) {
        slider.value = val;
        const displayLabel = slider.parentElement.querySelector('.control-value');
        if (displayLabel) displayLabel.textContent = val;
      }
    }

    const percSwitch = document.getElementById(`${prefix}-showperc-switch`);
    if (percSwitch) percSwitch.checked = s.showPerception;

    const gridSwitch = document.getElementById(`${prefix}-showgrid-switch`);
    if (gridSwitch) gridSwitch.checked = s.showGrid;
  }

  // Wire up controls for all instances
  setupSimulationControls(stdSim, 'std');
  setupSimulationControls(optSim, 'opt');
  setupSimulationControls(compOptSim, 'comp'); // Hook up comparison controls using compOptSim wrapper

  // --- Real-time Statistics UI Sync ---
  function updateStats() {
    if (activeTab === 'standard') {
      document.getElementById('std-fps-val').textContent = stdSim.stats.fps;
      document.getElementById('std-time-val').textContent = stdSim.stats.frameTime.toFixed(2) + ' ms';
      document.getElementById('std-calc-val').textContent = stdSim.stats.comparisons.toLocaleString();
      document.getElementById('std-agents-val').textContent = stdSim.stats.activeBoids;
    } else if (activeTab === 'optimized') {
      document.getElementById('opt-fps-val').textContent = optSim.stats.fps;
      document.getElementById('opt-time-val').textContent = optSim.stats.frameTime.toFixed(2) + ' ms';
      document.getElementById('opt-calc-val').textContent = optSim.stats.comparisons.toLocaleString();
      document.getElementById('opt-agents-val').textContent = optSim.stats.activeBoids;
    } else if (activeTab === 'comparison') {
      // Standard panel in comparison
      document.getElementById('comp-std-fps').textContent = compStdSim.stats.fps;
      document.getElementById('comp-std-calc').textContent = compStdSim.stats.comparisons.toLocaleString();
      document.getElementById('comp-std-time').textContent = compStdSim.stats.frameTime.toFixed(2) + ' ms';

      // Optimized panel in comparison
      document.getElementById('comp-opt-fps').textContent = compOptSim.stats.fps;
      document.getElementById('comp-opt-calc').textContent = compOptSim.stats.comparisons.toLocaleString();
      document.getElementById('comp-opt-time').textContent = compOptSim.stats.frameTime.toFixed(2) + ' ms';

      // Write-ups inside comparison report card
      document.getElementById('comp-agent-count').textContent = compStdSim.stats.activeBoids;
      
      const ratio = compOptSim.stats.comparisons > 0 
        ? (compStdSim.stats.comparisons / compOptSim.stats.comparisons).toFixed(1) 
        : '0.0';
      
      const optRedLabel = document.getElementById('comp-opt-reduction');
      if (optRedLabel) {
        optRedLabel.textContent = ratio + 'x menos';
        if (parseFloat(ratio) > 1) {
          optRedLabel.style.color = 'var(--accent-green)';
        } else {
          optRedLabel.style.color = 'var(--text-muted)';
        }
      }
    }

    requestAnimationFrame(updateStats);
  }

  // Start the UI updates cycle
  requestAnimationFrame(updateStats);
});
