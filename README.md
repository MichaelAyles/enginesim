# Engine Simulator

A comprehensive web-based **13L diesel engine simulation tool** with real thermodynamic modeling and 0.1° crank angle resolution analysis. Features an engineering-focused interface inspired by MATLAB Simulink and LabVIEW.

🚀 **Live Demo**: https://michaelayles.github.io/enginesim/

## Overview

This engine simulator provides:

- **Real thermodynamic cycle simulation** with Otto cycle modeling
- **0.1° crank angle resolution** (7,200 data points per cycle)
- **Comprehensive P-V diagrams** and cycle visualization
- **Detailed data tables** with all computed parameters
- **Realistic 13L diesel engine parameters** (450HP, 6-cylinder)
- **Performance analysis** (Power, Torque, BMEP, Efficiency)
- **Emissions modeling** (NOx, CO, HC, PM)
- **Interactive parameter adjustment** with real-time validation

## Current Features ✅

### Thermodynamic Simulation
- **Otto cycle modeling** with isentropic compression/expansion
- **Detailed combustion modeling** with heat release calculations
- **Heat transfer analysis** using Woschni correlation
- **Slider-crank kinematics** for piston motion
- **Real gas properties** and temperature-dependent calculations

### Engine Parameters (13L Diesel)
- **Bore**: 137mm | **Stroke**: 150mm | **Displacement**: ~13.0L
- **Compression Ratio**: 16.5 (diesel appropriate)
- **6-cylinder configuration**
- **Operating Speed**: 1800 RPM (typical diesel)
- **Realistic power output**: ~335kW (450HP)

### Visualization & Analysis
- **P-V Diagrams** with real thermodynamic cycle plotting
- **Angle plots** for any parameter vs crank angle
- **Comprehensive data table** with 22+ parameters per 0.1° increment
- **Stroke phase color coding** (Intake, Compression, Power, Exhaust)
- **Real-time parameter validation** with engineering limits

### Data Export
- **JSON export** with full simulation results
- **CSV export** for cycle data analysis
- **PNG export** for visualization images
- **High-resolution data** suitable for research/analysis

## Architecture

**Static Web Application**
- **Pure JavaScript** (no frameworks) for maximum compatibility
- **Web Workers** for intensive 0.1° resolution calculations
- **Canvas API** for high-performance P-V diagram rendering
- **GitHub Pages deployment** with automatic CI/CD

## How to Use

1. **Visit**: https://michaelayles.github.io/enginesim/
2. **Adjust Parameters**: Modify bore, stroke, compression ratio, cylinders, engine speed, load, intake temperature
3. **Run Simulation**: Click "Run Simulation" to execute thermodynamic calculations
4. **View Results**: Check Performance Output, Emissions, and Cycle Analysis panels
5. **Visualize Data**: 
   - Select **"P-V Diagram"** for pressure-volume cycle plots
   - Select **"Angle Plot"** for any parameter vs crank angle
   - Select **"Data Table"** to see all 7,200+ data points
6. **Export Data**: Use Export button for JSON, CSV, or PNG downloads

## Technical Details

### Simulation Resolution
- **0.1° crank angle steps** = 7,200 data points per 720° cycle
- **Real-time calculation** using web workers (non-blocking UI)
- **Sub-millisecond precision** for accurate thermodynamic analysis

### Computed Parameters (22+ per data point)
- Angle, Volume, Pressure, Temperature
- Piston Position, Velocity, Acceleration  
- Mass in Cylinder, Gas Density, Compression Ratio
- Heat Release Rate & Total, Heat Transfer Rate & Coefficient
- Surface Area, Mean Piston Speed, Gas Velocity
- Stroke Phase, Valve Status, Combustion Status, Progress

### Validation Ranges
- **Bore**: 50-200mm | **Stroke**: 50-200mm  
- **Compression Ratio**: 12-22 (diesel engines)
- **Cylinders**: 1-12 | **Engine Speed**: 500-8000 RPM
- **Load**: 0-100% | **Intake Temp**: -20 to 60°C

## Technology Stack

- **Frontend**: Vanilla HTML5/CSS3/JavaScript (inline for GitHub Pages compatibility)
- **Computation**: Web Workers with 0.1° resolution Otto cycle simulation
- **Graphics**: Canvas API for P-V diagrams and angle plots
- **Deployment**: GitHub Pages with automatic deployment

## Development

```bash
# Local development server
python -m http.server 8000
# Then visit http://localhost:8000

# Or using Node.js
npx serve .
```

## License

MIT License - see LICENSE file for details.