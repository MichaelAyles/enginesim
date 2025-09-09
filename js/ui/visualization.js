/**
 * Visualization Module
 * Handles P-V diagrams, data tables, and configurable charts
 */

export class EngineVisualization {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.cycleData = [];
        this.selectedParameters = ['pressure', 'volume', 'temperature'];
        this.chartType = 'line'; // line, scatter, pv-diagram
        this.dataTable = null;
        
        this.setupCanvas();
        this.setupDataTable();
        this.setupChartControls();
    }

    /**
     * Initialize canvas for P-V diagrams and charts
     */
    setupCanvas() {
        const canvasArea = document.querySelector('.canvas-area');
        if (!canvasArea) return;

        // Clear existing content
        canvasArea.innerHTML = '';

        // Create main canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = canvasArea.clientWidth - 20;
        this.canvas.height = canvasArea.clientHeight - 20;
        this.canvas.style.border = '1px solid #4a5568';
        this.canvas.style.backgroundColor = '#0f1419';
        
        this.ctx = this.canvas.getContext('2d');
        canvasArea.appendChild(this.canvas);

        // Create chart controls overlay
        this.createChartControls();
    }

    /**
     * Create chart configuration controls
     */
    createChartControls() {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'chart-controls';
        controlsDiv.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(26, 32, 44, 0.9);
            border: 1px solid #4a5568;
            border-radius: 4px;
            padding: 8px;
            font-size: 11px;
            z-index: 10;
        `;

        // Chart type selector
        const chartTypeLabel = document.createElement('label');
        chartTypeLabel.style.cssText = 'color: #a0aec0; display: block; margin-bottom: 4px;';
        chartTypeLabel.textContent = 'Chart Type:';
        
        const chartTypeSelect = document.createElement('select');
        chartTypeSelect.style.cssText = `
            background: #1a202c; color: #e2e8f0; border: 1px solid #4a5568;
            padding: 2px; font-size: 11px; font-family: inherit; margin-bottom: 8px;
        `;
        chartTypeSelect.innerHTML = `
            <option value="pv-diagram">P-V Diagram</option>
            <option value="angle-plot">Angle Plot</option>
            <option value="data-table">Data Table</option>
        `;
        
        chartTypeSelect.addEventListener('change', (e) => {
            this.setChartType(e.target.value);
        });

        // Parameter selector for angle plots
        const paramLabel = document.createElement('label');
        paramLabel.style.cssText = 'color: #a0aec0; display: block; margin-bottom: 4px;';
        paramLabel.textContent = 'Y-Axis Parameter:';
        
        const paramSelect = document.createElement('select');
        paramSelect.style.cssText = `
            background: #1a202c; color: #e2e8f0; border: 1px solid #4a5568;
            padding: 2px; font-size: 11px; font-family: inherit; margin-bottom: 8px;
        `;
        paramSelect.innerHTML = this.getParameterOptions();
        
        paramSelect.addEventListener('change', (e) => {
            this.selectedYParameter = e.target.value;
            this.updateVisualization();
        });

        controlsDiv.appendChild(chartTypeLabel);
        controlsDiv.appendChild(chartTypeSelect);
        controlsDiv.appendChild(paramLabel);
        controlsDiv.appendChild(paramSelect);

        document.querySelector('.canvas-area').appendChild(controlsDiv);
        
        this.chartTypeSelect = chartTypeSelect;
        this.paramSelect = paramSelect;
        this.selectedYParameter = 'pressure';
    }

    /**
     * Get available parameter options for charting
     */
    getParameterOptions() {
        const parameters = [
            { value: 'pressure', label: 'Pressure (bar)' },
            { value: 'temperature', label: 'Temperature (K)' },
            { value: 'volume', label: 'Volume (cm³)' },
            { value: 'pistonPosition', label: 'Piston Position (mm)' },
            { value: 'pistonVelocity', label: 'Piston Velocity (m/s)' },
            { value: 'pistonAcceleration', label: 'Piston Acceleration (m/s²)' },
            { value: 'massInCylinder', label: 'Mass in Cylinder (kg)' },
            { value: 'density', label: 'Gas Density (kg/m³)' },
            { value: 'heatRelease', label: 'Heat Release Rate (J/°)' },
            { value: 'heatReleaseTotal', label: 'Cumulative Heat Release (J)' },
            { value: 'heatTransfer', label: 'Heat Transfer Rate (J/°)' },
            { value: 'heatTransferCoeff', label: 'Heat Transfer Coeff (W/m²K)' },
            { value: 'surfaceArea', label: 'Surface Area (cm²)' },
            { value: 'meanPistonSpeed', label: 'Mean Piston Speed (m/s)' },
            { value: 'gasVelocity', label: 'Gas Velocity (m/s)' },
            { value: 'compressionRatio', label: 'Instantaneous Compression Ratio' }
        ];
        
        return parameters.map(p => `<option value="${p.value}">${p.label}</option>`).join('');
    }

    /**
     * Setup data table container
     */
    setupDataTable() {
        const canvasArea = document.querySelector('.canvas-area');
        if (!canvasArea) return;

        this.dataTableContainer = document.createElement('div');
        this.dataTableContainer.className = 'data-table-container';
        this.dataTableContainer.style.cssText = `
            display: none;
            width: 100%;
            height: 100%;
            overflow: auto;
            background: #0f1419;
            font-family: 'Consolas', monospace;
            font-size: 10px;
        `;

        canvasArea.appendChild(this.dataTableContainer);
    }

    /**
     * Set chart type and update visualization
     */
    setChartType(type) {
        this.chartType = type;
        
        if (type === 'data-table') {
            this.canvas.style.display = 'none';
            this.dataTableContainer.style.display = 'block';
            this.updateDataTable();
        } else {
            this.canvas.style.display = 'block';
            this.dataTableContainer.style.display = 'none';
            this.updateVisualization();
        }
    }

    /**
     * Update visualization with new cycle data
     */
    updateCycleData(cycleData) {
        this.cycleData = cycleData;
        
        if (this.chartType === 'data-table') {
            this.updateDataTable();
        } else {
            this.updateVisualization();
        }
    }

    /**
     * Update the main visualization
     */
    updateVisualization() {
        if (!this.ctx || !this.cycleData.length) return;

        this.clearCanvas();

        switch (this.chartType) {
            case 'pv-diagram':
                this.drawPVDiagram();
                break;
            case 'angle-plot':
                this.drawAnglePlot();
                break;
        }
    }

    /**
     * Clear the canvas
     */
    clearCanvas() {
        this.ctx.fillStyle = '#0f1419';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw P-V diagram
     */
    drawPVDiagram() {
        const margin = 50;
        const plotWidth = this.canvas.width - 2 * margin;
        const plotHeight = this.canvas.height - 2 * margin;

        // Get data ranges
        const volumes = this.cycleData.map(d => d.volume);
        const pressures = this.cycleData.map(d => d.pressure);
        
        const vMin = Math.min(...volumes);
        const vMax = Math.max(...volumes);
        const pMin = Math.min(...pressures);
        const pMax = Math.max(...pressures);

        // Add 10% padding to ranges
        const vRange = vMax - vMin;
        const pRange = pMax - pMin;
        const vMinPlot = vMin - vRange * 0.1;
        const vMaxPlot = vMax + vRange * 0.1;
        const pMinPlot = pMin - pRange * 0.1;
        const pMaxPlot = pMax + pRange * 0.1;

        // Draw axes
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(margin, margin);
        this.ctx.lineTo(margin, this.canvas.height - margin);
        this.ctx.lineTo(this.canvas.width - margin, this.canvas.height - margin);
        this.ctx.stroke();

        // Draw grid lines
        this.ctx.strokeStyle = '#2d3748';
        this.ctx.lineWidth = 0.5;
        
        // Vertical grid lines
        for (let i = 1; i < 10; i++) {
            const x = margin + (plotWidth * i) / 10;
            this.ctx.beginPath();
            this.ctx.moveTo(x, margin);
            this.ctx.lineTo(x, this.canvas.height - margin);
            this.ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let i = 1; i < 10; i++) {
            const y = margin + (plotHeight * i) / 10;
            this.ctx.beginPath();
            this.ctx.moveTo(margin, y);
            this.ctx.lineTo(this.canvas.width - margin, y);
            this.ctx.stroke();
        }

        // Draw P-V curve
        this.ctx.strokeStyle = '#68d391';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        for (let i = 0; i < this.cycleData.length; i++) {
            const data = this.cycleData[i];
            const x = margin + ((data.volume - vMinPlot) / (vMaxPlot - vMinPlot)) * plotWidth;
            const y = this.canvas.height - margin - ((data.pressure - pMinPlot) / (pMaxPlot - pMinPlot)) * plotHeight;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Draw stroke phase indicators
        this.drawStrokePhaseIndicators(vMinPlot, vMaxPlot, pMinPlot, pMaxPlot, margin, plotWidth, plotHeight);

        // Draw labels
        this.drawAxisLabels('Volume (cm³)', 'Pressure (bar)', vMinPlot, vMaxPlot, pMinPlot, pMaxPlot, margin, plotWidth, plotHeight);
    }

    /**
     * Draw angle plot for selected parameter
     */
    drawAnglePlot() {
        const margin = 50;
        const plotWidth = this.canvas.width - 2 * margin;
        const plotHeight = this.canvas.height - 2 * margin;

        // Get data ranges
        const angles = this.cycleData.map(d => d.angle);
        const values = this.cycleData.map(d => d[this.selectedYParameter]);
        
        const angleMin = Math.min(...angles);
        const angleMax = Math.max(...angles);
        const valueMin = Math.min(...values);
        const valueMax = Math.max(...values);

        // Add padding to value range
        const valueRange = valueMax - valueMin;
        const valueMinPlot = valueMin - valueRange * 0.1;
        const valueMaxPlot = valueMax + valueRange * 0.1;

        // Draw axes and grid
        this.drawAxesAndGrid(margin, plotWidth, plotHeight);

        // Draw data line
        this.ctx.strokeStyle = '#63b3ed';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();

        for (let i = 0; i < this.cycleData.length; i++) {
            const data = this.cycleData[i];
            const x = margin + ((data.angle - angleMin) / (angleMax - angleMin)) * plotWidth;
            const y = this.canvas.height - margin - ((data[this.selectedYParameter] - valueMinPlot) / (valueMaxPlot - valueMinPlot)) * plotHeight;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Draw stroke phase separators
        this.drawStrokePhaseSeparators(margin, plotWidth, plotHeight);

        // Get parameter label
        const paramLabel = this.getParameterLabel(this.selectedYParameter);
        this.drawAxisLabels('Crank Angle (degrees)', paramLabel, angleMin, angleMax, valueMinPlot, valueMaxPlot, margin, plotWidth, plotHeight);
    }

    /**
     * Draw axes and grid
     */
    drawAxesAndGrid(margin, plotWidth, plotHeight) {
        // Draw axes
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(margin, margin);
        this.ctx.lineTo(margin, this.canvas.height - margin);
        this.ctx.lineTo(this.canvas.width - margin, this.canvas.height - margin);
        this.ctx.stroke();

        // Draw grid
        this.ctx.strokeStyle = '#2d3748';
        this.ctx.lineWidth = 0.5;
        
        for (let i = 1; i < 10; i++) {
            // Vertical lines
            const x = margin + (plotWidth * i) / 10;
            this.ctx.beginPath();
            this.ctx.moveTo(x, margin);
            this.ctx.lineTo(x, this.canvas.height - margin);
            this.ctx.stroke();
            
            // Horizontal lines
            const y = margin + (plotHeight * i) / 10;
            this.ctx.beginPath();
            this.ctx.moveTo(margin, y);
            this.ctx.lineTo(this.canvas.width - margin, y);
            this.ctx.stroke();
        }
    }

    /**
     * Draw stroke phase separators for angle plots
     */
    drawStrokePhaseSeparators(margin, plotWidth, plotHeight) {
        const phases = [180, 360, 540]; // Stroke boundaries
        
        this.ctx.strokeStyle = '#f56565';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        
        phases.forEach(angle => {
            const x = margin + (angle / 720) * plotWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, margin);
            this.ctx.lineTo(x, this.canvas.height - margin);
            this.ctx.stroke();
        });
        
        this.ctx.setLineDash([]);
    }

    /**
     * Draw stroke phase indicators for P-V diagram
     */
    drawStrokePhaseIndicators(vMin, vMax, pMin, pMax, margin, plotWidth, plotHeight) {
        // Color code different phases
        const phaseColors = {
            'Intake': '#4299e1',
            'Compression': '#ed8936',
            'Power': '#48bb78',
            'Exhaust': '#ed64a6'
        };

        let currentPhase = '';
        let phaseStart = 0;
        
        for (let i = 0; i < this.cycleData.length; i++) {
            const data = this.cycleData[i];
            
            if (data.strokePhase !== currentPhase) {
                if (currentPhase && i > phaseStart) {
                    // Draw phase segment
                    this.ctx.strokeStyle = phaseColors[currentPhase];
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    
                    for (let j = phaseStart; j < i; j++) {
                        const segData = this.cycleData[j];
                        const x = margin + ((segData.volume - vMin) / (vMax - vMin)) * plotWidth;
                        const y = this.canvas.height - margin - ((segData.pressure - pMin) / (pMax - pMin)) * plotHeight;
                        
                        if (j === phaseStart) {
                            this.ctx.moveTo(x, y);
                        } else {
                            this.ctx.lineTo(x, y);
                        }
                    }
                    this.ctx.stroke();
                }
                
                currentPhase = data.strokePhase;
                phaseStart = i;
            }
        }
        
        // Draw final phase
        if (currentPhase && phaseStart < this.cycleData.length - 1) {
            this.ctx.strokeStyle = phaseColors[currentPhase];
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            
            for (let j = phaseStart; j < this.cycleData.length; j++) {
                const segData = this.cycleData[j];
                const x = margin + ((segData.volume - vMin) / (vMax - vMin)) * plotWidth;
                const y = this.canvas.height - margin - ((segData.pressure - pMin) / (pMax - pMin)) * plotHeight;
                
                if (j === phaseStart) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }
    }

    /**
     * Draw axis labels and tick marks
     */
    drawAxisLabels(xLabel, yLabel, xMin, xMax, yMin, yMax, margin, plotWidth, plotHeight) {
        this.ctx.fillStyle = '#a0aec0';
        this.ctx.font = '12px Consolas';
        this.ctx.textAlign = 'center';

        // X-axis label
        this.ctx.fillText(xLabel, this.canvas.width / 2, this.canvas.height - 10);

        // Y-axis label (rotated)
        this.ctx.save();
        this.ctx.translate(15, this.canvas.height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText(yLabel, 0, 0);
        this.ctx.restore();

        // Tick labels
        this.ctx.font = '10px Consolas';
        this.ctx.textAlign = 'center';

        // X-axis ticks
        for (let i = 0; i <= 10; i++) {
            const x = margin + (plotWidth * i) / 10;
            const value = xMin + ((xMax - xMin) * i) / 10;
            this.ctx.fillText(Math.round(value * 10) / 10, x, this.canvas.height - margin + 15);
        }

        // Y-axis ticks
        this.ctx.textAlign = 'right';
        for (let i = 0; i <= 10; i++) {
            const y = this.canvas.height - margin - (plotHeight * i) / 10;
            const value = yMin + ((yMax - yMin) * i) / 10;
            this.ctx.fillText(Math.round(value * 10) / 10, margin - 5, y + 3);
        }
    }

    /**
     * Get parameter label for display
     */
    getParameterLabel(parameter) {
        const labels = {
            pressure: 'Pressure (bar)',
            temperature: 'Temperature (K)',
            volume: 'Volume (cm³)',
            pistonPosition: 'Piston Position (mm)',
            pistonVelocity: 'Piston Velocity (m/s)',
            pistonAcceleration: 'Piston Acceleration (m/s²)',
            massInCylinder: 'Mass in Cylinder (kg)',
            density: 'Gas Density (kg/m³)',
            heatRelease: 'Heat Release Rate (J/°)',
            heatReleaseTotal: 'Cumulative Heat Release (J)',
            heatTransfer: 'Heat Transfer Rate (J/°)',
            heatTransferCoeff: 'Heat Transfer Coeff (W/m²K)',
            surfaceArea: 'Surface Area (cm²)',
            meanPistonSpeed: 'Mean Piston Speed (m/s)',
            gasVelocity: 'Gas Velocity (m/s)',
            compressionRatio: 'Compression Ratio'
        };
        
        return labels[parameter] || parameter;
    }

    /**
     * Update data table
     */
    updateDataTable() {
        if (!this.cycleData.length) return;

        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            color: #e2e8f0;
        `;

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const headers = [
            'Angle°', 'Volume cm³', 'Pressure bar', 'Temperature K', 'Piston Pos mm',
            'Piston Vel m/s', 'Piston Acc m/s²', 'Mass kg', 'Density kg/m³', 'Heat Release J/°',
            'Heat Total J', 'Heat Transfer J/°', 'HT Coeff W/m²K', 'Surface cm²', 'Gas Vel m/s',
            'Comp Ratio', 'Phase', 'Intake', 'Exhaust', 'Combustion', 'Progress %'
        ];

        headers.forEach(header => {
            const th = document.createElement('th');
            th.style.cssText = `
                border: 1px solid #4a5568;
                padding: 4px;
                background: #2d3748;
                color: #cbd5e0;
                font-weight: bold;
                text-align: center;
                position: sticky;
                top: 0;
            `;
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        
        // Sample every 10th data point for performance (every 1 degree)
        const sampleRate = 10;
        
        for (let i = 0; i < this.cycleData.length; i += sampleRate) {
            const data = this.cycleData[i];
            const row = document.createElement('tr');
            
            const values = [
                data.angle,
                data.volume,
                data.pressure,
                data.temperature,
                data.pistonPosition,
                data.pistonVelocity,
                data.pistonAcceleration,
                data.massInCylinder,
                Math.round(data.density * 100) / 100,
                data.heatRelease,
                data.heatReleaseTotal,
                data.heatTransfer,
                data.heatTransferCoeff,
                data.surfaceArea,
                data.gasVelocity,
                data.compressionRatio,
                data.strokePhase,
                data.intakeValveOpen ? '●' : '○',
                data.exhaustValveOpen ? '●' : '○',
                data.combustionActive ? '●' : '○',
                data.cycleProgress
            ];

            values.forEach((value, index) => {
                const td = document.createElement('td');
                td.style.cssText = `
                    border: 1px solid #4a5568;
                    padding: 2px 4px;
                    text-align: ${index === 16 ? 'left' : 'right'};
                    background: ${data.strokePhase === 'Intake' ? '#1a365d' : 
                                data.strokePhase === 'Compression' ? '#744210' :
                                data.strokePhase === 'Power' ? '#22543d' : '#702459'};
                `;
                td.textContent = typeof value === 'number' ? Math.round(value * 1000) / 1000 : value;
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
        }
        
        table.appendChild(tbody);

        this.dataTableContainer.innerHTML = '';
        this.dataTableContainer.appendChild(table);
    }

    /**
     * Handle canvas resize
     */
    onResize() {
        const canvasArea = document.querySelector('.canvas-area');
        if (!canvasArea || !this.canvas) return;

        this.canvas.width = canvasArea.clientWidth - 20;
        this.canvas.height = canvasArea.clientHeight - 20;
        
        this.updateVisualization();
    }

    /**
     * Export current visualization as image
     */
    exportVisualization() {
        if (!this.canvas) return;

        const link = document.createElement('a');
        link.download = `engine_${this.chartType}_${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }

    /**
     * Setup chart controls (called from outside if needed)
     */
    setupChartControls() {
        // This method can be expanded for additional chart configuration
    }
}