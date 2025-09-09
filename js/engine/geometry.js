/**
 * Engine Geometry Module
 * Handles all geometric calculations for engine components
 * Based on established engine design principles
 */

export class EngineGeometry {
    constructor(parameters = {}) {
        // Engine geometric parameters
        this.bore = parameters.bore || 86;                    // mm
        this.stroke = parameters.stroke || 86;                // mm
        this.connectingRodLength = parameters.connectingRodLength || (this.stroke * 1.5); // mm
        this.compressionRatio = parameters.compressionRatio || 10.5;
        this.numberOfCylinders = parameters.numberOfCylinders || 4;
        
        // Validate parameters
        this.validateGeometry();
        
        // Calculate derived values
        this.displacement = this.calculateDisplacement();
        this.clearanceVolume = this.calculateClearanceVolume();
        this.maxCylinderVolume = this.displacement + this.clearanceVolume;
    }

    /**
     * Validate geometric parameters for physical feasibility
     */
    validateGeometry() {
        const errors = [];
        
        if (this.bore < 30 || this.bore > 200) {
            errors.push('Bore diameter must be between 30-200mm');
        }
        
        if (this.stroke < 30 || this.stroke > 200) {
            errors.push('Stroke length must be between 30-200mm');
        }
        
        if (this.connectingRodLength < this.stroke) {
            errors.push('Connecting rod length must be greater than stroke');
        }
        
        if (this.compressionRatio < 6 || this.compressionRatio > 20) {
            errors.push('Compression ratio must be between 6-20');
        }
        
        if (this.numberOfCylinders < 1 || this.numberOfCylinders > 16) {
            errors.push('Number of cylinders must be between 1-16');
        }
        
        if (errors.length > 0) {
            throw new Error('Geometry validation failed: ' + errors.join(', '));
        }
    }

    /**
     * Calculate total engine displacement
     * @returns {number} Displacement in cm³
     */
    calculateDisplacement() {
        const singleCylinderDisplacement = Math.PI * Math.pow(this.bore / 2, 2) * this.stroke; // mm³
        const totalDisplacement = singleCylinderDisplacement * this.numberOfCylinders;
        return totalDisplacement / 1000; // Convert to cm³
    }

    /**
     * Calculate clearance volume from compression ratio
     * @returns {number} Clearance volume in cm³
     */
    calculateClearanceVolume() {
        const singleCylinderDisplacement = Math.PI * Math.pow(this.bore / 2, 2) * this.stroke / 1000; // cm³
        return singleCylinderDisplacement / (this.compressionRatio - 1);
    }

    /**
     * Calculate instantaneous cylinder volume for given crank angle
     * Uses slider-crank mechanism equations
     * @param {number} crankAngle - Crank angle in degrees (0° = TDC firing)
     * @returns {number} Cylinder volume in cm³
     */
    calculateCylinderVolume(crankAngle) {
        const crankAngleRad = (crankAngle * Math.PI) / 180;
        const crankRadius = this.stroke / 2;
        const rodRatio = this.connectingRodLength / crankRadius;
        
        // Piston position from TDC using slider-crank kinematics
        const pistonPosition = crankRadius * (
            (1 - Math.cos(crankAngleRad)) + 
            (1 / rodRatio) * (1 - Math.sqrt(1 - Math.pow(rodRatio * Math.sin(crankAngleRad), 2)))
        );
        
        // Total cylinder volume
        const instantaneousVolume = this.clearanceVolume + 
            (Math.PI * Math.pow(this.bore / 2, 2) * pistonPosition) / 1000; // Convert mm³ to cm³
        
        return Math.max(instantaneousVolume, this.clearanceVolume); // Ensure volume never goes below clearance
    }

    /**
     * Calculate instantaneous piston velocity
     * @param {number} crankAngle - Crank angle in degrees
     * @param {number} engineSpeed - Engine speed in RPM
     * @returns {number} Piston velocity in m/s
     */
    calculatePistonVelocity(crankAngle, engineSpeed) {
        const crankAngleRad = (crankAngle * Math.PI) / 180;
        const angularVelocity = (engineSpeed * 2 * Math.PI) / 60; // rad/s
        const crankRadius = this.stroke / 2;
        const rodRatio = this.connectingRodLength / crankRadius;
        
        // Piston velocity from slider-crank mechanism
        const velocity = crankRadius * angularVelocity * (
            Math.sin(crankAngleRad) + 
            (Math.sin(crankAngleRad) * Math.cos(crankAngleRad)) / 
            Math.sqrt(1 - Math.pow(rodRatio * Math.sin(crankAngleRad), 2))
        );
        
        return velocity / 1000; // Convert mm/s to m/s
    }

    /**
     * Calculate cylinder surface area for heat transfer calculations
     * @param {number} crankAngle - Crank angle in degrees
     * @returns {number} Surface area in cm²
     */
    calculateSurfaceArea(crankAngle) {
        const volume = this.calculateCylinderVolume(crankAngle);
        const cylinderHeight = ((volume * 1000) / (Math.PI * Math.pow(this.bore / 2, 2))); // mm
        
        // Surface area components
        const headArea = Math.PI * Math.pow(this.bore / 2, 2); // mm²
        const pistonArea = Math.PI * Math.pow(this.bore / 2, 2); // mm²
        const cylinderWallArea = Math.PI * this.bore * cylinderHeight; // mm²
        
        const totalArea = headArea + pistonArea + cylinderWallArea;
        return totalArea / 100; // Convert mm² to cm²
    }

    /**
     * Calculate mean piston speed
     * @param {number} engineSpeed - Engine speed in RPM
     * @returns {number} Mean piston speed in m/s
     */
    calculateMeanPistonSpeed(engineSpeed) {
        return (2 * this.stroke * engineSpeed) / (60 * 1000); // Convert to m/s
    }

    /**
     * Calculate bore to stroke ratio
     * @returns {number} Bore to stroke ratio
     */
    getBoreStrokeRatio() {
        return this.bore / this.stroke;
    }

    /**
     * Get engine specifications summary
     * @returns {object} Engine specification object
     */
    getSpecifications() {
        return {
            bore: this.bore,
            stroke: this.stroke,
            displacement: Math.round(this.displacement),
            compressionRatio: this.compressionRatio,
            numberOfCylinders: this.numberOfCylinders,
            clearanceVolume: Math.round(this.clearanceVolume * 10) / 10,
            boreStrokeRatio: Math.round(this.getBoreStrokeRatio() * 100) / 100,
            connectingRodLength: this.connectingRodLength
        };
    }

    /**
     * Update geometry parameters
     * @param {object} newParameters - New parameter values
     */
    updateGeometry(newParameters) {
        Object.assign(this, newParameters);
        
        // Recalculate connecting rod length if not provided
        if (!newParameters.connectingRodLength && (newParameters.stroke || newParameters.bore)) {
            this.connectingRodLength = this.stroke * 1.5;
        }
        
        this.validateGeometry();
        this.displacement = this.calculateDisplacement();
        this.clearanceVolume = this.calculateClearanceVolume();
        this.maxCylinderVolume = this.displacement + this.clearanceVolume;
    }
}

// Utility functions for common engine calculations
export const EngineGeometryUtils = {
    /**
     * Convert displacement from cm³ to liters
     * @param {number} displacement - Displacement in cm³
     * @returns {number} Displacement in liters
     */
    displacementToLiters(displacement) {
        return displacement / 1000;
    },

    /**
     * Calculate compression ratio from volumes
     * @param {number} maxVolume - Maximum cylinder volume
     * @param {number} minVolume - Minimum cylinder volume (clearance)
     * @returns {number} Compression ratio
     */
    compressionRatioFromVolumes(maxVolume, minVolume) {
        return maxVolume / minVolume;
    },

    /**
     * Estimate connecting rod length from stroke
     * @param {number} stroke - Stroke length in mm
     * @param {number} ratio - Rod to stroke ratio (default 1.5)
     * @returns {number} Connecting rod length in mm
     */
    estimateRodLength(stroke, ratio = 1.5) {
        return stroke * ratio;
    }
};