# CLAUDE.md

This file provides guidance for AI assistants working on this engine simulator project.

## Project Overview

This is a static web-based engine simulation tool designed with an engineering aesthetic inspired by MATLAB Simulink and LabVIEW. The project emphasizes:

- **Scientific accuracy** in all thermodynamic and engine modeling
- **Engineering tool interface** with functional, grid-based layouts
- **Static deployment** suitable for GitHub Pages
- **Vanilla web technologies** (HTML, CSS, JavaScript) without build tools initially

## Design Philosophy

### Interface Aesthetic
- **Engineering tool appearance**: Gray color schemes, technical fonts, panel-based layouts
- **Functional over flashy**: No modern web trends, gradients, or animations
- **Professional instrument feel**: Like scientific/engineering desktop software
- **Grid-based layouts**: Organized, predictable structure

### Technical Standards
- **Vanilla HTML/CSS/JavaScript** initially (no frameworks/build tools)
- **Web Workers** for intensive calculations to keep UI responsive
- **Canvas API** or WebGL for visualizations
- **Scientific accuracy** in all calculations and models

## Code Organization

### File Structure (Planned)
```
/
├── index.html              # Main application
├── /js
│   ├── engine/
│   │   ├── geometry.js     # Engine geometry calculations
│   │   ├── thermodynamics.js # Thermodynamic cycle modeling
│   │   ├── combustion.js   # Combustion modeling
│   │   └── emissions.js    # Emissions calculations
│   ├── ui/
│   │   ├── controls.js     # UI interaction handling
│   │   ├── visualization.js # Charts and visualizations
│   │   └── data-display.js # Results display
│   ├── workers/
│   │   └── simulation.worker.js # Heavy computation worker
│   └── utils/
│       ├── math.js         # Mathematical utilities
│       └── validation.js   # Input validation
├── /css
│   ├── main.css           # Core engineering UI styles
│   └── components.css     # Reusable component styles
└── /data
    └── engine-configs.json # Default engine configurations
```

### Development Guidelines

#### Engineering Accuracy
- All thermodynamic calculations must be based on established correlations
- Use proper SI units internally, convert for display as needed
- Validate all inputs for physical reasonableness
- Document the scientific basis for all models

#### Code Style
- **Clear, descriptive variable names** (e.g., `cylinderBoreDiameter` not `bore`)
- **Extensive comments** explaining physics and equations
- **Modular functions** for each calculation step
- **Error handling** for invalid inputs and edge cases

#### UI Principles
- **Immediate feedback** on parameter changes
- **Clear units** displayed for all values
- **Reasonable default values** for all parameters
- **Input validation** with user-friendly error messages

## Engine Modeling Priorities

### Phase 1: Basic Otto Cycle
- Four-stroke cycle modeling
- Basic thermodynamic calculations
- P-V diagram visualization
- Performance metrics (power, torque, efficiency)

### Phase 2: Advanced Modeling
- Real gas properties
- Heat transfer modeling
- Friction losses
- Variable valve timing effects

### Phase 3: Emissions & Advanced Features
- NOx, CO, HC, PM modeling
- Turbocharging effects
- Multi-cylinder modeling
- Advanced combustion models

## Technical Notes

### Performance Considerations
- Use Web Workers for calculations taking >16ms
- Implement progressive rendering for complex visualizations
- Cache calculated results when parameters haven't changed
- Optimize for 60fps when running real-time simulations

### Browser Compatibility
- Target modern browsers (Chrome 80+, Firefox 75+, Safari 13+)
- Use feature detection for advanced APIs
- Graceful degradation for older browsers
- Mobile-friendly responsive design not required initially

### Deployment
- Static files only - no server-side components
- GitHub Pages compatible
- All assets self-contained (no external CDN dependencies initially)

## Implementation Notes

When adding engine simulation features:

1. **Start with the physics**: Implement the mathematical model first
2. **Add validation**: Ensure inputs are physically reasonable
3. **Create visualizations**: Make the results clear and interpretable
4. **Test edge cases**: Verify behavior at extreme parameters
5. **Document everything**: Explain the science behind each calculation

## Commit Message Guidelines

- Use conventional commit prefixes: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`
- Focus on what changed and why, not how
- Reference scientific sources when implementing new models
- Example: `feat: implement Woschni heat transfer correlation for cylinder head`

## Resources for Engine Modeling

- Heywood, J.B. "Internal Combustion Engine Fundamentals"
- Ferguson, C.R. "Internal Combustion Engines: Applied Thermosciences"  
- Stone, R. "Introduction to Internal Combustion Engines"
- SAE technical papers for specific correlations and models