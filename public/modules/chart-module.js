import { expenses, categoryNames } from './expense-module.js';

// Chart configuration constants
const BAR_WIDTH = 40;          // Width of each bar in pixels
const BAR_GAP = 10;            // Space between bars in pixels
const MAX_BAR_HEIGHT = 200;    // Maximum height of bars in pixels
const CHART_PADDING = 50;      // Padding around the chart
const LABEL_OFFSET = 20;       // Vertical offset for category labels

/**
 * Draws a bar chart visualization of expenses by category
 * Creates a canvas-based chart showing total amounts per category
 */
export function drawChart() {
    // Get canvas element and verify it exists
    const canvas = document.getElementById('expense-chart');
    if (!canvas) return;

     // Initialize canvas context and clear previous content
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate total amount for each category
    const categoryTotals = expenses.map(category => 
        Array.isArray(category) ? 
        category.reduce((sum, expense) => sum + parseFloat(expense.amount), 0) : 
        0
    );

    // Find the highest category total for scaling
    const maxAmount = Math.max(...categoryTotals);
    if (maxAmount <= 0) return;

    // Calculate chart dimensions based on data
    const chartWidth = (BAR_WIDTH + BAR_GAP) * categoryNames.length + CHART_PADDING * 2;
    const chartHeight = MAX_BAR_HEIGHT + CHART_PADDING * 2 + 30;
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    ctx.fillStyle = '#4CAF50';

    // Draw bars and labels for each category
    categoryTotals.forEach((total, index) => {
        if (total > 0) {
            // Calculate bar dimensions
            const barHeight = (total / maxAmount) * MAX_BAR_HEIGHT;
            const x = CHART_PADDING + index * (BAR_WIDTH + BAR_GAP);
            const y = chartHeight - CHART_PADDING - barHeight;

            // Draw the bar
            ctx.fillRect(x, y, BAR_WIDTH, barHeight);
            ctx.save();

            // Draw rotated category name
            ctx.font = '12px Arial';
            ctx.translate(x + BAR_WIDTH / 2, chartHeight - CHART_PADDING + LABEL_OFFSET);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(categoryNames[index].name || "Unknown", 0, 0);
            ctx.restore();
            
            // Draw amount above bar
            ctx.fillStyle = '#000';
            ctx.fillText(`$${total.toFixed(2)}`, x, y - 5);
            ctx.fillStyle = '#4CAF50';
        }
    });
}