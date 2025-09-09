/**
 * UI Controls Module
 * Handles user interface interactions and parameter management
 */

import { EngineVisualization } from './visualization.js';

export class EngineControlsUI {
    constructor() {
        this.parameters = {
            bore: 86,
            stroke: 86,
            compressionRatio: 10.5,
            cylinders: 4,
            engineSpeed: 2000,
            load: 75,
            intakeTemp: 25
        };
        
        this.worker = null;
        this.isSimulating = false;
        this.visualization = null;
        this.lastResults = null;
        
        this.setupWorker();
        this.setupVisualization();
        this.bindEventListeners();
        this.updateDisplays();
    }

    /**
     * Initialize visualization module
     */
    setupVisualization() {
        try {
            this.visualization = new EngineVisualization();
            
            // Handle window resize for visualization
            window.addEventListener('resize', () => {
                if (this.visualization) {
                    setTimeout(() => this.visualization.onResize(), 100);
                }
            });
        } catch (error) {
            console.error('Failed to initialize visualization:', error);
        }
    }

    /**
     * Initialize and setup Web Worker
     */
    setupWorker() {
        try {
            this.worker = new Worker('js/workers/simulation.worker.js');
            this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));
            this.worker.addEventListener('error', this.handleWorkerError.bind(this));
        } catch (error) {
            console.error('Failed to initialize worker:', error);
            this.updateStatus('Worker initialization failed', 'error');
        }
    }

    /**
     * Handle messages from the Web Worker
     */
    handleWorkerMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'simulation_started':
                this.updateStatus('Simulation running...', 'running');
                break;
                
            case 'simulation_complete':
                this.isSimulating = false;
                this.updateStatus('Simulation complete', 'ready');
                this.updateResults(data);
                this.storeResults(data);
                
                // Update visualization with cycle data
                if (this.visualization && data.cycle) {
                    this.visualization.updateCycleData(data.cycle);
                }
                break;
                
            case 'simulation_progress':
                // Update progress if needed
                break;
                
            case 'simulation_error':
                this.isSimulating = false;
                this.updateStatus(`Error: ${data.error}`, 'error');
                break;
        }
    }

    /**
     * Handle Worker errors
     */
    handleWorkerError(error) {
        console.error('Worker error:', error);
        this.isSimulating = false;
        this.updateStatus('Simulation error occurred', 'error');
    }

    /**
     * Bind event listeners to UI controls
     */
    bindEventListeners() {
        // Get all parameter input elements by position (more reliable than value-based selectors)
        const inputElements = document.querySelectorAll('.control-input');
        const inputs = {
            bore: inputElements[0],                    // First input - Bore
            stroke: inputElements[1],                  // Second input - Stroke  
            compressionRatio: inputElements[2],        // Third input - Compression Ratio
            cylinders: inputElements[3],               // Fourth input - Cylinders
            engineSpeed: inputElements[4],             // Fifth input - Engine Speed
            load: inputElements[5],                    // Sixth input - Load
            intakeTemp: inputElements[6]               // Seventh input - Intake Temp
        };

        // Add event listeners for parameter changes
        Object.keys(inputs).forEach(param => {
            const input = inputs[param];
            if (input) {
                input.addEventListener('input', (e) => {
                    this.updateParameter(param, parseFloat(e.target.value));
                });
                
                input.addEventListener('change', (e) => {
                    this.validateParameter(param, parseFloat(e.target.value), e.target);
                });
            }
        });

        // Control buttons
        const runButton = document.querySelector('.btn-primary');
        const resetButton = document.querySelector('.btn:not(.btn-primary):first-of-type');
        const exportButton = document.querySelector('.btn:not(.btn-primary):last-of-type');

        if (runButton) {
            runButton.addEventListener('click', () => this.runSimulation());
        }

        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetParameters());
        }

        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportData());
        }

        // Add export visualization button (if needed)
        this.addVisualizationControls();
    }

    /**
     * Update a parameter value
     */
    updateParameter(parameter, value) {
        this.parameters[parameter] = value;
        // Could add real-time calculation updates here
    }

    /**
     * Validate parameter values
     */
    validateParameter(parameter, value, inputElement) {
        let isValid = true;
        let errorMessage = '';

        switch (parameter) {
            case 'bore':
                if (value < 50 || value > 150) {
                    isValid = false;
                    errorMessage = 'Bore must be between 50-150mm';
                }
                break;
            case 'stroke':
                if (value < 50 || value > 150) {
                    isValid = false;
                    errorMessage = 'Stroke must be between 50-150mm';
                }
                break;
            case 'compressionRatio':
                if (value < 8 || value > 15) {
                    isValid = false;
                    errorMessage = 'Compression ratio must be between 8-15';
                }
                break;
            case 'cylinders':
                if (value < 1 || value > 12) {
                    isValid = false;
                    errorMessage = 'Cylinders must be between 1-12';
                }
                break;
            case 'engineSpeed':
                if (value < 500 || value > 8000) {
                    isValid = false;
                    errorMessage = 'Engine speed must be between 500-8000 rpm';
                }
                break;
            case 'load':
                if (value < 0 || value > 100) {
                    isValid = false;
                    errorMessage = 'Load must be between 0-100%';
                }
                break;
            case 'intakeTemp':
                if (value < -20 || value > 60) {
                    isValid = false;
                    errorMessage = 'Intake temperature must be between -20-60°C';
                }
                break;
        }

        if (!isValid) {
            inputElement.style.borderColor = '#f56565';
            this.updateStatus(errorMessage, 'error');
        } else {
            inputElement.style.borderColor = '#4a5568';
            if (this.getStatus().includes('Error:')) {
                this.updateStatus('Ready', 'ready');
            }
        }

        return isValid;
    }

    /**
     * Run engine simulation
     */
    async runSimulation() {
        if (this.isSimulating) {
            return;
        }

        if (!this.worker) {
            this.updateStatus('Worker not available', 'error');
            return;
        }

        // Validate all parameters before running
        if (!this.validateAllParameters()) {
            this.updateStatus('Please fix parameter errors', 'error');
            return;
        }

        this.isSimulating = true;
        
        // Convert temperature to Kelvin for simulation
        const simulationParams = {
            ...this.parameters,
            intakeTemp: this.parameters.intakeTemp + 273.15
        };

        // Send simulation request to worker
        this.worker.postMessage({
            type: 'simulate',
            data: simulationParams
        });
    }

    /**
     * Validate all parameters
     */
    validateAllParameters() {
        const inputElements = document.querySelectorAll('.control-input');
        const parameters = ['bore', 'stroke', 'compressionRatio', 'cylinders', 'engineSpeed', 'load', 'intakeTemp'];
        let allValid = true;

        inputElements.forEach((input, index) => {
            if (index < parameters.length) {
                const value = parseFloat(input.value);
                const parameter = parameters[index];
                
                if (!this.validateParameter(parameter, value, input)) {
                    allValid = false;
                }
            }
        });

        return allValid;
    }

    /**
     * Get parameter name from input element
     */
    getParameterFromInput(inputElement) {
        const value = inputElement.value;
        const parent = inputElement.closest('.control-group');
        const label = parent?.querySelector('.control-label')?.textContent;
        
        if (label) {
            if (label.includes('Bore')) return 'bore';
            if (label.includes('Stroke')) return 'stroke';
            if (label.includes('Compression')) return 'compressionRatio';
            if (label.includes('Cylinders')) return 'cylinders';
            if (label.includes('Engine Speed')) return 'engineSpeed';
            if (label.includes('Load')) return 'load';
            if (label.includes('Intake Temperature')) return 'intakeTemp';
        }
        
        return null;
    }

    /**
     * Reset parameters to defaults
     */
    resetParameters() {
        const defaultParams = {
            bore: 86,
            stroke: 86,
            compressionRatio: 10.5,
            cylinders: 4,
            engineSpeed: 2000,
            load: 75,
            intakeTemp: 25
        };

        this.parameters = { ...defaultParams };
        
        // Update input fields
        const inputs = document.querySelectorAll('.control-input');
        const values = [
            defaultParams.bore,
            defaultParams.stroke, 
            defaultParams.compressionRatio,
            defaultParams.cylinders,
            defaultParams.engineSpeed,
            defaultParams.load,
            defaultParams.intakeTemp
        ];
        
        inputs.forEach((input, index) => {
            if (index < values.length) {
                input.value = values[index];
                input.style.borderColor = '#4a5568'; // Reset border color
            }
        });

        this.clearResults();
        this.updateStatus('Parameters reset', 'ready');
    }

    /**
     * Update simulation results in the UI
     */
    updateResults(data) {
        const { performance, emissions, cycle } = data;
        
        // Update performance values
        this.updateDataValue(0, performance.power);
        this.updateDataValue(1, performance.torque);
        this.updateDataValue(2, performance.bmep);
        this.updateDataValue(3, performance.efficiency);
        
        // Update emissions values
        this.updateDataValue(4, emissions.nox);
        this.updateDataValue(5, emissions.co);
        this.updateDataValue(6, emissions.hc);
        this.updateDataValue(7, emissions.pm);
        
        // Update cycle analysis
        this.updateDataValue(8, performance.maxPressure);
        this.updateDataValue(9, performance.maxTemperature);
        this.updateDataValue(10, '---'); // Pumping loss (placeholder)

        // Update status bar
        const now = new Date().toLocaleTimeString();
        const statusItems = document.querySelectorAll('.status-item');
        if (statusItems.length >= 2) {
            statusItems[1].innerHTML = `Last Run: ${now}`;
            if (statusItems.length >= 3) {
                statusItems[2].innerHTML = `Computation Time: ${data.timestamp - data.timestamp}ms`;
            }
        }
    }

    /**
     * Update a specific data value in the display
     */
    updateDataValue(index, value) {
        const dataValues = document.querySelectorAll('.data-value');
        if (dataValues[index]) {
            dataValues[index].textContent = typeof value === 'number' ? 
                Math.round(value * 10) / 10 : value;
        }
    }

    /**
     * Clear all result displays
     */
    clearResults() {
        const dataValues = document.querySelectorAll('.data-value');
        dataValues.forEach(element => {
            element.textContent = '---';
        });
    }

    /**
     * Update status display
     */
    updateStatus(message, type = 'ready') {
        const statusElement = document.querySelector('.header .status');
        const statusBarElement = document.querySelector('.status-ready');
        
        if (statusElement) {
            statusElement.textContent = message.toUpperCase();
        }
        
        if (statusBarElement) {
            statusBarElement.textContent = message;
            statusBarElement.className = `status-${type}`;
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        const statusElement = document.querySelector('.status-ready');
        return statusElement ? statusElement.textContent : '';
    }

    /**
     * Update parameter displays
     */
    updateDisplays() {
        // This could be used for real-time calculation displays
        // Currently handled by direct input binding
    }

    /**
     * Add visualization-specific controls
     */
    addVisualizationControls() {
        // This could add additional buttons for visualization export, etc.
        // For now, just ensure proper integration
    }

    /**
     * Export simulation data
     */
    exportData() {
        if (!this.lastResults) {
            this.updateStatus('No data to export', 'error');
            return;
        }

        // Create export menu
        const exportOptions = [
            { label: 'Export JSON Data', action: () => this.exportJSONData() },
            { label: 'Export CSV Data', action: () => this.exportCSVData() },
            { label: 'Export Visualization', action: () => this.exportVisualization() }
        ];

        this.showExportMenu(exportOptions);
    }

    /**
     * Show export menu
     */
    showExportMenu(options) {
        // Simple implementation - could be enhanced with a proper dropdown
        const choice = prompt('Export options:\n1. JSON Data\n2. CSV Data\n3. Visualization Image\n\nEnter choice (1-3):');
        
        switch (choice) {
            case '1':
                this.exportJSONData();
                break;
            case '2':
                this.exportCSVData();
                break;
            case '3':
                this.exportVisualization();
                break;
            default:
                this.updateStatus('Export cancelled', 'ready');
        }
    }

    /**
     * Export JSON data
     */
    exportJSONData() {
        const exportData = {
            parameters: this.parameters,
            results: this.lastResults,
            timestamp: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `engine_simulation_${Date.now()}.json`;
        link.click();
        
        this.updateStatus('JSON data exported', 'ready');
    }

    /**
     * Export CSV data
     */
    exportCSVData() {
        if (!this.lastResults || !this.lastResults.cycle) {
            this.updateStatus('No cycle data to export', 'error');
            return;
        }

        const cycleData = this.lastResults.cycle;
        const headers = Object.keys(cycleData[0]);
        
        let csvContent = headers.join(',') + '\n';
        
        cycleData.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value}"` : value;
            });
            csvContent += values.join(',') + '\n';
        });

        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(csvBlob);
        link.download = `engine_cycle_data_${Date.now()}.csv`;
        link.click();
        
        this.updateStatus('CSV data exported', 'ready');
    }

    /**
     * Export visualization
     */
    exportVisualization() {
        if (this.visualization) {
            this.visualization.exportVisualization();
            this.updateStatus('Visualization exported', 'ready');
        } else {
            this.updateStatus('No visualization to export', 'error');
        }
    }

    /**
     * Store results for export
     */
    storeResults(results) {
        this.lastResults = results;
    }

    /**
     * Get current parameter values
     */
    getParameters() {
        return { ...this.parameters };
    }

    /**
     * Get visualization instance (for external access)
     */
    getVisualization() {
        return this.visualization;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        if (this.visualization) {
            // Cleanup visualization resources if needed
            this.visualization = null;
        }
    }
}