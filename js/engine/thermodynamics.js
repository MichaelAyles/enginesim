/**
 * Engine Thermodynamics Module
 * Implements Otto cycle thermodynamic calculations
 * Based on classical thermodynamic principles and engine textbooks
 */

export class OttoCycleThermodynamics {
    constructor(parameters = {}) {
        // Thermodynamic properties
        this.gamma = parameters.gamma || 1.35;          // Heat capacity ratio for combustion products
        this.gammaAir = parameters.gammaAir || 1.4;     // Heat capacity ratio for air
        this.R = parameters.R || 287;                   // Specific gas constant for air (J/kg·K)
        this.cp = parameters.cp || 1005;                // Specific heat at constant pressure (J/kg·K)
        this.cv = this.cp / this.gamma;                 // Specific heat at constant volume (J/kg·K)
        
        // Standard conditions
        this.standardTemp = 288.15;                     // K (15°C)
        this.standardPressure = 101325;                 // Pa (1 atm)
        this.airDensityStd = 1.225;                     // kg/m³ at standard conditions
    }

    /**
     * Calculate cylinder mass from ideal gas law
     * @param {number} pressure - Pressure in Pa
     * @param {number} volume - Volume in m³
     * @param {number} temperature - Temperature in K
     * @returns {number} Mass in kg
     */
    calculateMass(pressure, volume, temperature) {
        if (temperature <= 0) return 0;
        return (pressure * volume) / (this.R * temperature);
    }

    /**
     * Calculate temperature from ideal gas law
     * @param {number} pressure - Pressure in Pa
     * @param {number} volume - Volume in m³
     * @param {number} mass - Mass in kg
     * @returns {number} Temperature in K
     */
    calculateTemperature(pressure, volume, mass) {
        if (mass <= 0) return this.standardTemp;
        return (pressure * volume) / (mass * this.R);
    }

    /**
     * Calculate pressure from ideal gas law
     * @param {number} temperature - Temperature in K
     * @param {number} volume - Volume in m³
     * @param {number} mass - Mass in kg
     * @returns {number} Pressure in Pa
     */
    calculatePressure(temperature, volume, mass) {
        if (volume <= 0) return this.standardPressure;
        return (mass * this.R * temperature) / volume;
    }

    /**
     * Simulate complete Otto cycle
     * @param {object} geometry - Engine geometry object
     * @param {object} conditions - Operating conditions
     * @returns {Array} Array of cycle state points
     */
    simulateOttoCycle(geometry, conditions = {}) {
        const {
            intakeTemp = 298,           // K
            intakePressure = 101325,    // Pa
            engineSpeed = 2000,         // RPM
            load = 0.75                 // Fraction of full load
        } = conditions;

        const cycleStates = [];
        const angleStep = 2; // degrees
        
        // Initial conditions
        let currentMass = 0;
        
        for (let angle = 0; angle <= 720; angle += angleStep) {
            const volume = geometry.calculateCylinderVolume(angle) / 1000000; // Convert cm³ to m³
            let pressure, temperature;
            
            if (angle >= 0 && angle <= 180) {
                // Process 1-2: Intake (isobaric at intake pressure)
                pressure = intakePressure;
                temperature = intakeTemp;
                currentMass = this.calculateMass(pressure, volume, temperature);
                
            } else if (angle > 180 && angle <= 360) {
                // Process 2-3: Compression (isentropic)
                const compressionRatio = (geometry.displacement / 1000000 + geometry.clearanceVolume / 1000000) / volume;
                pressure = intakePressure * Math.pow(compressionRatio, this.gammaAir);
                temperature = intakeTemp * Math.pow(compressionRatio, this.gammaAir - 1);
                
            } else if (angle > 360 && angle <= 380) {
                // Process 3-4: Combustion (constant volume heat addition)
                const compressionRatio = geometry.compressionRatio;
                const preIgnitionPressure = intakePressure * Math.pow(compressionRatio, this.gammaAir);
                const preIgnitionTemp = intakeTemp * Math.pow(compressionRatio, this.gammaAir - 1);
                
                // Heat addition based on load
                const heatAdditionRatio = 1.5 + (load * 2); // Heat addition multiplier
                pressure = preIgnitionPressure * heatAdditionRatio;
                temperature = preIgnitionTemp * heatAdditionRatio;
                
            } else if (angle > 380 && angle <= 540) {
                // Process 4-5: Expansion (isentropic)
                const clearanceVolume = geometry.clearanceVolume / 1000000; // m³
                const expansionRatio = volume / clearanceVolume;
                
                // Peak conditions (end of combustion)
                const compressionRatio = geometry.compressionRatio;
                const peakPressure = intakePressure * Math.pow(compressionRatio, this.gammaAir) * (1.5 + load * 2);
                const peakTemp = intakeTemp * Math.pow(compressionRatio, this.gammaAir - 1) * (1.5 + load * 2);
                
                pressure = peakPressure / Math.pow(expansionRatio, this.gamma);
                temperature = peakTemp / Math.pow(expansionRatio, this.gamma - 1);
                
            } else {
                // Process 5-1: Exhaust (isobaric)
                pressure = intakePressure * 1.05; // Slight back pressure
                temperature = Math.max(intakeTemp * 1.8, temperature * 0.9); // Hot exhaust gases
            }
            
            // Store state point
            cycleStates.push({
                angle: angle,
                volume: volume * 1000000, // Convert back to cm³ for display
                pressure: pressure / 100000, // Convert to bar
                temperature: temperature,
                mass: currentMass
            });
        }
        
        return cycleStates;
    }

    /**
     * Calculate work output from P-V data using numerical integration
     * @param {Array} cycleStates - Array of cycle state points
     * @returns {number} Net work per cycle in J
     */
    calculateWorkPerCycle(cycleStates) {
        let work = 0;
        
        for (let i = 1; i < cycleStates.length; i++) {
            const dV = (cycleStates[i].volume - cycleStates[i-1].volume) / 1000000; // Convert to m³
            const avgP = ((cycleStates[i].pressure + cycleStates[i-1].pressure) / 2) * 100000; // Convert to Pa
            work += avgP * dV;
        }
        
        return work;
    }

    /**
     * Calculate indicated mean effective pressure (IMEP)
     * @param {number} workPerCycle - Net work per cycle in J
     * @param {number} displacement - Engine displacement in cm³
     * @returns {number} IMEP in bar
     */
    calculateIMEP(workPerCycle, displacement) {
        const displacementM3 = displacement / 1000000; // Convert to m³
        return (workPerCycle / displacementM3) / 100000; // Convert to bar
    }

    /**
     * Calculate thermal efficiency
     * @param {object} geometry - Engine geometry
     * @param {number} heatAdditionRatio - Heat addition multiplier
     * @returns {number} Theoretical thermal efficiency (%)
     */
    calculateTheoreticalEfficiency(geometry, heatAdditionRatio = 2.5) {
        // Otto cycle theoretical efficiency
        const efficiency = 1 - (1 / Math.pow(geometry.compressionRatio, this.gammaAir - 1));
        return efficiency * 100;
    }

    /**
     * Calculate volumetric efficiency
     * @param {number} actualMassFlow - Actual mass flow rate (kg/s)
     * @param {number} theoreticalMassFlow - Theoretical mass flow rate (kg/s)
     * @returns {number} Volumetric efficiency (%)
     */
    calculateVolumetricEfficiency(actualMassFlow, theoreticalMassFlow) {
        if (theoreticalMassFlow === 0) return 0;
        return (actualMassFlow / theoreticalMassFlow) * 100;
    }

    /**
     * Calculate air-fuel ratio for stoichiometric combustion
     * @param {number} fuelMassFlow - Fuel mass flow rate (kg/s)
     * @param {number} airMassFlow - Air mass flow rate (kg/s)
     * @returns {number} Air-fuel ratio
     */
    calculateAirFuelRatio(airMassFlow, fuelMassFlow) {
        if (fuelMassFlow === 0) return 0;
        return airMassFlow / fuelMassFlow;
    }

    /**
     * Get thermodynamic properties summary
     * @returns {object} Properties object
     */
    getProperties() {
        return {
            gamma: this.gamma,
            gammaAir: this.gammaAir,
            R: this.R,
            cp: this.cp,
            cv: this.cv,
            standardTemp: this.standardTemp,
            standardPressure: this.standardPressure / 1000, // Convert to kPa for display
            airDensity: this.airDensityStd
        };
    }

    /**
     * Update thermodynamic properties
     * @param {object} newProperties - New property values
     */
    updateProperties(newProperties) {
        Object.assign(this, newProperties);
        this.cv = this.cp / this.gamma; // Recalculate cv
    }
}

// Utility functions for thermodynamic calculations
export const ThermodynamicsUtils = {
    /**
     * Convert temperature units
     */
    kelvinToCelsius(kelvin) {
        return kelvin - 273.15;
    },

    celsiusToKelvin(celsius) {
        return celsius + 273.15;
    },

    /**
     * Convert pressure units
     */
    barToPa(bar) {
        return bar * 100000;
    },

    paToBar(pa) {
        return pa / 100000;
    },

    /**
     * Calculate gas density
     * @param {number} pressure - Pressure in Pa
     * @param {number} temperature - Temperature in K
     * @param {number} R - Specific gas constant (J/kg·K)
     * @returns {number} Density in kg/m³
     */
    calculateDensity(pressure, temperature, R = 287) {
        return pressure / (R * temperature);
    },

    /**
     * Calculate isentropic process relations
     * @param {number} initialValue - Initial state value
     * @param {number} volumeRatio - Volume ratio (V2/V1)
     * @param {number} gamma - Heat capacity ratio
     * @param {string} property - Property type ('pressure' or 'temperature')
     * @returns {number} Final state value
     */
    isentropicRelation(initialValue, volumeRatio, gamma, property) {
        if (property === 'pressure') {
            return initialValue * Math.pow(volumeRatio, -gamma);
        } else if (property === 'temperature') {
            return initialValue * Math.pow(volumeRatio, -(gamma - 1));
        }
        return initialValue;
    }
};