// Engine Simulation Web Worker
// Handles intensive thermodynamic calculations without blocking UI

class EngineSimulationWorker {
    constructor() {
        this.isRunning = false;
    }

    // Main simulation entry point
    async simulateEngine(parameters) {
        this.isRunning = true;
        
        try {
            // Notify start
            self.postMessage({
                type: 'simulation_started',
                data: { timestamp: Date.now() }
            });

            // Validate parameters
            const validatedParams = this.validateParameters(parameters);
            
            // Run Otto cycle simulation
            const results = await this.calculateOttoCycle(validatedParams);
            
            // Calculate performance metrics
            const performance = this.calculatePerformance(results, validatedParams);
            
            // Calculate emissions (placeholder for now)
            const emissions = this.calculateEmissions(results, validatedParams);

            // Send final results
            self.postMessage({
                type: 'simulation_complete',
                data: {
                    cycle: results,
                    performance: performance,
                    emissions: emissions,
                    timestamp: Date.now()
                }
            });

        } catch (error) {
            self.postMessage({
                type: 'simulation_error',
                data: { error: error.message }
            });
        } finally {
            this.isRunning = false;
        }
    }

    validateParameters(params) {
        const defaults = {
            bore: 86,           // mm
            stroke: 86,         // mm
            compressionRatio: 10.5,
            cylinders: 4,
            engineSpeed: 2000,  // rpm
            load: 75,          // %
            intakeTemp: 298    // K (25°C)
        };

        // Merge with defaults and validate ranges
        const validated = { ...defaults, ...params };
        
        // Basic validation
        if (validated.bore < 50 || validated.bore > 150) throw new Error('Bore must be between 50-150mm');
        if (validated.stroke < 50 || validated.stroke > 150) throw new Error('Stroke must be between 50-150mm');
        if (validated.compressionRatio < 8 || validated.compressionRatio > 15) throw new Error('Compression ratio must be between 8-15');
        if (validated.cylinders < 1 || validated.cylinders > 12) throw new Error('Cylinders must be between 1-12');
        if (validated.engineSpeed < 500 || validated.engineSpeed > 8000) throw new Error('Engine speed must be between 500-8000 rpm');
        
        return validated;
    }

    async calculateOttoCycle(params) {
        const { bore, stroke, compressionRatio, engineSpeed } = params;
        
        // Basic engine geometry
        const displacement = Math.PI * Math.pow(bore/2, 2) * stroke; // mm³
        const clearanceVolume = displacement / (compressionRatio - 1);
        const maxVolume = displacement + clearanceVolume;
        
        // Cycle data points (720° = full cycle)
        const cycleData = [];
        const stepSize = 2; // degrees
        
        // Thermodynamic constants
        const gamma = 1.35; // Heat capacity ratio for air
        const R = 287; // J/kg·K
        
        // Initial conditions
        const intakeTemp = params.intakeTemp || 298; // K
        const intakePressure = 101325; // Pa (1 atm)
        
        for (let angle = 0; angle <= 720; angle += stepSize) {
            const crankAngleRad = (angle * Math.PI) / 180;
            
            // Calculate instantaneous volume using slider-crank mechanism
            const volume = this.calculateCylinderVolume(angle, bore, stroke, clearanceVolume);
            
            let pressure, temperature;
            
            // Otto cycle phases
            if (angle >= 0 && angle <= 180) {
                // Intake stroke (0-180°)
                pressure = intakePressure / 100000; // Convert to bar
                temperature = intakeTemp;
            } else if (angle > 180 && angle <= 360) {
                // Compression stroke (180-360°)
                const compressionRatio = maxVolume / volume;
                pressure = (intakePressure / 100000) * Math.pow(compressionRatio, gamma);
                temperature = intakeTemp * Math.pow(compressionRatio, gamma - 1);
            } else if (angle > 360 && angle <= 540) {
                // Power stroke (360-540°)
                // Simplified: assume constant volume combustion at TDC, then expansion
                if (angle <= 370) {
                    // Combustion phase - pressure rise
                    const combustionPressure = (intakePressure / 100000) * Math.pow(compressionRatio, gamma) * 3;
                    pressure = combustionPressure;
                    temperature = intakeTemp * Math.pow(compressionRatio, gamma - 1) * 3;
                } else {
                    // Expansion phase
                    const expansionRatio = volume / clearanceVolume;
                    const peakPressure = (intakePressure / 100000) * Math.pow(compressionRatio, gamma) * 3;
                    pressure = peakPressure / Math.pow(expansionRatio, gamma);
                    temperature = (intakeTemp * Math.pow(compressionRatio, gamma - 1) * 3) / Math.pow(expansionRatio, gamma - 1);
                }
            } else {
                // Exhaust stroke (540-720°)
                pressure = intakePressure / 100000;
                temperature = intakeTemp * 1.5; // Higher exhaust temperature
            }
            
            cycleData.push({
                angle: angle,
                volume: volume / 1000, // Convert to cm³
                pressure: pressure,
                temperature: temperature
            });
            
            // Yield control periodically for UI responsiveness
            if (angle % 90 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        return cycleData;
    }

    calculateCylinderVolume(crankAngle, bore, stroke, clearanceVolume) {
        const crankAngleRad = (crankAngle * Math.PI) / 180;
        const crankRadius = stroke / 2;
        const connectingRodLength = stroke * 1.5; // Typical ratio
        
        // Slider-crank mechanism
        const x = crankRadius * Math.cos(crankAngleRad) + 
                 Math.sqrt(Math.pow(connectingRodLength, 2) - Math.pow(crankRadius * Math.sin(crankAngleRad), 2));
        
        const pistonPosition = connectingRodLength + crankRadius - x;
        const cylinderVolume = clearanceVolume + (Math.PI * Math.pow(bore/2, 2) * pistonPosition);
        
        return cylinderVolume;
    }

    calculatePerformance(cycleData, params) {
        // Calculate work per cycle using P-V integration
        let workPerCycle = 0;
        for (let i = 1; i < cycleData.length; i++) {
            const dV = cycleData[i].volume - cycleData[i-1].volume;
            const avgP = (cycleData[i].pressure + cycleData[i-1].pressure) / 2;
            workPerCycle += avgP * dV * 100; // Convert bar·cm³ to J
        }

        const displacement = Math.PI * Math.pow(params.bore/2, 2) * params.stroke / 1000; // cm³
        const imep = workPerCycle / displacement; // bar
        
        // Power calculations
        const cyclesPerSecond = params.engineSpeed / 120; // 4-stroke engine
        const indicatedPower = (workPerCycle * cyclesPerSecond * params.cylinders) / 1000; // kW
        const mechanicalEfficiency = 0.85;
        const brakePower = indicatedPower * mechanicalEfficiency;
        
        // Torque calculations
        const indicatedTorque = (indicatedPower * 1000 * 60) / (2 * Math.PI * params.engineSpeed);
        const brakeTorque = indicatedTorque * mechanicalEfficiency;
        
        // Efficiency calculations
        const fuelFlowRate = 0.3 * brakePower; // Simplified BSFC assumption
        const thermalEfficiency = (indicatedPower / (fuelFlowRate * 43.5)) * 100; // %
        
        return {
            power: Math.round(brakePower * 10) / 10,
            torque: Math.round(brakeTorque * 10) / 10,
            bmep: Math.round(imep * mechanicalEfficiency * 10) / 10,
            imep: Math.round(imep * 10) / 10,
            efficiency: Math.round(thermalEfficiency * 10) / 10,
            maxPressure: Math.round(Math.max(...cycleData.map(d => d.pressure)) * 10) / 10,
            maxTemperature: Math.round(Math.max(...cycleData.map(d => d.temperature)))
        };
    }

    calculateEmissions(cycleData, params) {
        // Simplified emissions calculations (placeholder)
        const maxTemp = Math.max(...cycleData.map(d => d.temperature));
        
        // NOx formation increases exponentially with temperature
        const nox = maxTemp > 2000 ? (maxTemp - 2000) * 0.005 : 0.1;
        
        return {
            nox: Math.round(nox * 100) / 100,
            co: Math.round((2.5 - params.load/50) * 100) / 100,
            hc: Math.round((1.0 - params.load/100) * 100) / 100,
            pm: 0.05
        };
    }

    stop() {
        this.isRunning = false;
    }
}

// Worker message handler
const worker = new EngineSimulationWorker();

self.addEventListener('message', async (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'simulate':
            await worker.simulateEngine(data);
            break;
        case 'stop':
            worker.stop();
            break;
        default:
            console.warn('Unknown worker message type:', type);
    }
});