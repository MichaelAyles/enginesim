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
        const connectingRodLength = stroke * 1.5; // Typical ratio
        
        // Cycle data points (720° = full cycle at 0.1° resolution)
        const cycleData = [];
        const stepSize = 0.1; // degrees - high resolution for detailed analysis
        
        // Thermodynamic constants
        const gamma = 1.35; // Heat capacity ratio for air
        const R = 287; // J/kg·K
        
        // Initial conditions
        const intakeTemp = params.intakeTemp || 298; // K
        const intakePressure = 101325; // Pa (1 atm)
        
        let currentMass = 0;
        let previousPressure = intakePressure / 100000;
        let previousTemperature = intakeTemp;
        let heatReleaseTotal = 0;
        
        for (let angle = 0; angle <= 720; angle += stepSize) {
            const crankAngleRad = (angle * Math.PI) / 180;
            
            // Calculate instantaneous volume using slider-crank mechanism
            const volume = this.calculateCylinderVolume(angle, bore, stroke, clearanceVolume);
            
            // Calculate piston position and kinematics
            const crankRadius = stroke / 2;
            const pistonPosition = crankRadius * (1 - Math.cos(crankAngleRad)) + 
                (Math.pow(crankRadius, 2) * Math.pow(Math.sin(crankAngleRad), 2)) / 
                (2 * connectingRodLength);
            
            // Calculate piston velocity and acceleration
            const angularVelocity = (engineSpeed * 2 * Math.PI) / 60; // rad/s
            const pistonVelocity = crankRadius * angularVelocity * (
                Math.sin(crankAngleRad) + 
                (crankRadius * Math.sin(crankAngleRad) * Math.cos(crankAngleRad)) / connectingRodLength
            ) / 1000; // m/s
            
            const pistonAcceleration = crankRadius * Math.pow(angularVelocity, 2) * (
                Math.cos(crankAngleRad) + 
                (crankRadius * Math.cos(2 * crankAngleRad)) / connectingRodLength
            ) / 1000; // m/s²
            
            let pressure, temperature, heatRelease, massInCylinder;
            let valveEvents = { intakeOpen: false, exhaustOpen: false };
            let combustionActive = false;
            
            // Otto cycle phases with detailed calculations
            if (angle >= 0 && angle <= 180) {
                // Intake stroke (0-180°)
                valveEvents.intakeOpen = true;
                pressure = intakePressure / 100000; // Convert to bar
                temperature = intakeTemp;
                massInCylinder = (pressure * 100000 * volume / 1000000) / (R * temperature);
                currentMass = massInCylinder;
                heatRelease = 0;
                
            } else if (angle > 180 && angle <= 360) {
                // Compression stroke (180-360°)
                const compressionRatio = maxVolume / volume;
                pressure = (intakePressure / 100000) * Math.pow(compressionRatio, gamma);
                temperature = intakeTemp * Math.pow(compressionRatio, gamma - 1);
                massInCylinder = currentMass;
                heatRelease = 0;
                
            } else if (angle > 360 && angle <= 540) {
                // Power stroke (360-540°) - includes combustion
                if (angle <= 370) {
                    // Combustion phase - rapid heat release
                    combustionActive = true;
                    const combustionProgress = (angle - 360) / 10; // 0 to 1 over 10 degrees
                    const heatAdditionMultiplier = 1.5 + (params.load/100 * 2.5);
                    
                    pressure = (intakePressure / 100000) * Math.pow(compressionRatio, gamma) * 
                              (1 + (heatAdditionMultiplier - 1) * combustionProgress);
                    temperature = intakeTemp * Math.pow(compressionRatio, gamma - 1) * 
                                 (1 + (heatAdditionMultiplier - 1) * combustionProgress);
                    
                    heatRelease = (heatAdditionMultiplier - 1) * 1000 * stepSize; // J per degree
                    heatReleaseTotal += heatRelease;
                } else {
                    // Expansion phase
                    const expansionRatio = volume / clearanceVolume;
                    const peakPressure = (intakePressure / 100000) * Math.pow(compressionRatio, gamma) * 
                                        (1.5 + params.load/100 * 2.5);
                    const peakTemp = intakeTemp * Math.pow(compressionRatio, gamma - 1) * 
                                    (1.5 + params.load/100 * 2.5);
                    
                    pressure = peakPressure / Math.pow(expansionRatio, gamma);
                    temperature = peakTemp / Math.pow(expansionRatio, gamma - 1);
                    heatRelease = 0;
                }
                massInCylinder = currentMass;
                
            } else {
                // Exhaust stroke (540-720°)
                valveEvents.exhaustOpen = true;
                pressure = intakePressure / 100000 * 1.05; // Slight back pressure
                temperature = Math.max(intakeTemp * 1.8, previousTemperature * 0.95);
                massInCylinder = currentMass * 0.95; // Some residual gas
                heatRelease = 0;
            }
            
            // Calculate additional parameters
            const surfaceArea = Math.PI * bore * (bore/2 + (volume * 1000) / (Math.PI * Math.pow(bore/2, 2))); // mm²
            const meanPistonSpeed = 2 * stroke * engineSpeed / (60 * 1000); // m/s
            const compressionRatioInstant = maxVolume / volume;
            const gasVelocity = Math.abs(pistonVelocity) * (Math.PI * Math.pow(bore/2, 2)) / 
                               (Math.PI * bore * Math.sqrt(volume/1000)); // Simplified
            
            // Heat transfer calculations (simplified Woschni correlation)
            const heatTransferCoeff = volume > 0 ? 
                3.26 * Math.pow(bore/1000, -0.2) * Math.pow(pressure * 100000, 0.8) * 
                Math.pow(temperature, -0.55) * Math.pow(meanPistonSpeed + gasVelocity, 0.8) : 0;
            
            const heatTransfer = heatTransferCoeff * (surfaceArea / 1000000) * (temperature - 400) * stepSize; // J
            
            cycleData.push({
                // Primary cycle parameters
                angle: Math.round(angle * 10) / 10,
                volume: Math.round(volume / 10) / 100, // Convert to cm³
                pressure: Math.round(pressure * 1000) / 1000,
                temperature: Math.round(temperature * 10) / 10,
                
                // Kinematics
                pistonPosition: Math.round(pistonPosition * 100) / 100,
                pistonVelocity: Math.round(pistonVelocity * 1000) / 1000,
                pistonAcceleration: Math.round(pistonAcceleration * 100) / 100,
                
                // Thermodynamic properties
                massInCylinder: Math.round(massInCylinder * 100000) / 100000,
                density: massInCylinder / (volume / 1000000000), // kg/m³
                compressionRatio: Math.round(compressionRatioInstant * 100) / 100,
                
                // Heat transfer and combustion
                heatRelease: Math.round(heatRelease * 100) / 100,
                heatReleaseTotal: Math.round(heatReleaseTotal * 100) / 100,
                heatTransfer: Math.round(heatTransfer * 100) / 100,
                heatTransferCoeff: Math.round(heatTransferCoeff * 100) / 100,
                
                // Engine specific
                surfaceArea: Math.round(surfaceArea / 100) / 100, // cm²
                meanPistonSpeed: Math.round(meanPistonSpeed * 1000) / 1000,
                gasVelocity: Math.round(gasVelocity * 1000) / 1000,
                
                // Valve events and combustion status
                intakeValveOpen: valveEvents.intakeOpen,
                exhaustValveOpen: valveEvents.exhaustOpen,
                combustionActive: combustionActive,
                
                // Phase identification
                strokePhase: angle <= 180 ? 'Intake' : 
                           angle <= 360 ? 'Compression' :
                           angle <= 540 ? 'Power' : 'Exhaust',
                
                // Cycle progress
                cycleProgress: Math.round((angle / 720) * 1000) / 10 // Percentage
            });
            
            previousPressure = pressure;
            previousTemperature = temperature;
            
            // Yield control periodically for UI responsiveness (every 10 degrees)
            if (Math.abs(angle % 10) < stepSize) {
                await new Promise(resolve => setTimeout(resolve, 0));
                
                // Send progress update
                self.postMessage({
                    type: 'simulation_progress',
                    data: { progress: Math.round((angle / 720) * 100) }
                });
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