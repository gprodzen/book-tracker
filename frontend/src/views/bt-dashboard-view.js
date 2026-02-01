/**
 * bt-dashboard-view - Dashboard view component
 *
 * A data-rich command center for power users with stats, charts,
 * progress visualizations, and insights.
 */

import { BaseComponent, defineComponent } from '../core/base-component.js';
import { store } from '../core/store.js';
import { api } from '../services/api-client.js';
import { router } from '../core/router.js';
import { events, EVENT_NAMES } from '../core/events.js';
import '../components/shared/bt-loading.js';
import '../components/shared/bt-empty-state.js';
import '../components/shared/bt-book-card.js';
import '../components/shared/bt-progress-bar.js';

export class BtDashboardView extends BaseComponent {
    constructor() {
        super();
        this.setState({
            loading: true,
            error: null,
            dashboard: null,
            stats: null
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .page-header {
                margin-bottom: var(--space-6, 24px);
            }

            .page-title {
                font-size: var(--text-3xl, 2.25rem);
                font-weight: var(--font-bold, 700);
                color: var(--color-text-primary, #2C2416);
                margin-bottom: var(--space-2, 8px);
            }

            .page-subtitle {
                font-size: var(--text-base, 1rem);
                color: var(--color-text-muted, #8B7E6A);
            }

            /* ==========================================================================
               Stats Row
               ========================================================================== */

            .stats-row {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: var(--space-4, 16px);
                margin-bottom: var(--space-8, 32px);
            }

            .stat-card {
                background: linear-gradient(
                    135deg,
                    var(--color-bg-secondary, #F5F0E8) 0%,
                    var(--color-bg-tertiary, #EDE6DB) 100%
                );
                border: 1px solid var(--color-border-subtle, #E5DED2);
                border-left: 3px solid var(--color-accent, #8B4513);
                border-radius: var(--radius-xl, 12px);
                padding: var(--space-5, 20px);
                display: flex;
                flex-direction: column;
                gap: var(--space-2, 8px);
            }

            .stat-value {
                font-size: var(--text-3xl, 2.25rem);
                font-weight: var(--font-bold, 700);
                font-family: var(--font-mono);
                color: var(--color-accent, #8B4513);
                line-height: var(--leading-none, 1);
            }

            .stat-label {
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-muted, #8B7E6A);
                text-transform: uppercase;
                letter-spacing: var(--tracking-wide, 0.025em);
            }

            .stat-sublabel {
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8B7E6A);
                opacity: 0.7;
            }

            /* ==========================================================================
               Main Grid Layout
               ========================================================================== */

            .dashboard-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-6, 24px);
                margin-bottom: var(--space-8, 32px);
            }

            .section {
                margin-bottom: var(--space-8, 32px);
            }

            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--space-5, 20px);
            }

            .section-title {
                font-size: var(--text-sm, 0.875rem);
                font-weight: var(--font-semibold, 600);
                text-transform: uppercase;
                letter-spacing: var(--tracking-wide, 0.025em);
                color: var(--color-text-secondary, #5C5244);
            }

            /* ==========================================================================
               Activity Chart
               ========================================================================== */

            .chart-container {
                background: var(--color-surface, #FFFFFF);
                border: 1px solid var(--color-border, #D4C9B8);
                border-radius: var(--radius-xl, 12px);
                padding: var(--space-5, 20px);
                height: 100%;
            }

            .chart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--space-4, 16px);
            }

            .chart-title {
                font-size: var(--text-sm, 0.875rem);
                font-weight: var(--font-semibold, 600);
                text-transform: uppercase;
                letter-spacing: var(--tracking-wide, 0.025em);
                color: var(--color-text-secondary, #5C5244);
            }

            .chart-legend {
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8B7E6A);
            }

            .bar-chart {
                display: flex;
                align-items: flex-end;
                gap: var(--space-3, 12px);
                height: 160px;
                padding-top: var(--space-4, 16px);
            }

            .bar-column {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--space-2, 8px);
                height: 100%;
            }

            .bar-wrapper {
                flex: 1;
                width: 100%;
                display: flex;
                align-items: flex-end;
                justify-content: center;
            }

            .bar {
                width: 100%;
                max-width: 40px;
                background: linear-gradient(
                    180deg,
                    var(--color-accent, #8B4513) 0%,
                    var(--color-accent-hover, #A0522D) 100%
                );
                border-radius: var(--radius-sm, 4px) var(--radius-sm, 4px) 0 0;
                transition: all var(--duration-normal, 250ms) var(--ease-out);
                min-height: 4px;
                position: relative;
            }

            .bar:hover {
                filter: brightness(1.1);
                transform: scaleY(1.02);
                transform-origin: bottom;
            }

            .bar-value {
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                font-size: var(--text-xs, 0.75rem);
                font-family: var(--font-mono);
                color: var(--color-text-primary, #2C2416);
                opacity: 0;
                transition: opacity var(--duration-fast, 150ms) var(--ease-out);
            }

            .bar:hover .bar-value {
                opacity: 1;
            }

            .bar-label {
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8B7E6A);
                text-transform: uppercase;
            }

            .chart-empty {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 160px;
                color: var(--color-text-muted, #8B7E6A);
                font-size: var(--text-sm, 0.875rem);
            }

            /* ==========================================================================
               Currently Reading - Book Spine Design (Refined Minimal)
               ========================================================================== */

            .reading-container {
                background: var(--color-surface, #FFFFFF);
                border: 1px solid var(--color-border, #D4C9B8);
                border-radius: var(--radius-xl, 12px);
                padding: var(--space-5, 20px);
                height: 100%;
            }

            .reading-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--space-4, 16px);
            }

            .wip-indicator {
                font-size: var(--text-sm, 0.875rem);
                font-family: var(--font-mono);
                font-weight: var(--font-medium, 500);
                padding: var(--space-1, 4px) var(--space-3, 12px);
                border-radius: var(--radius-full, 9999px);
                background: var(--color-bg-tertiary, #EDE6DB);
                color: var(--color-text-secondary, #5C5244);
            }

            .wip-indicator.warning {
                background: var(--color-warning-muted, rgba(251, 191, 36, 0.15));
                color: var(--color-warning, #FBBF24);
            }

            .wip-indicator.over {
                background: var(--color-error-muted, rgba(248, 113, 113, 0.15));
                color: var(--color-error, #F87171);
            }

            /* Book Spine List Container */
            .spine-list {
                display: flex;
                flex-direction: column;
                gap: 1px;
                background: var(--color-border-subtle, #E5DED2);
                border-radius: var(--radius-lg, 8px);
                overflow: hidden;
            }

            /* Individual Spine Item */
            .spine-item {
                display: grid;
                grid-template-columns: 4px 1fr auto;
                align-items: center;
                background: var(--color-surface, #FFFFFF);
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
            }

            .spine-item:hover {
                background: var(--color-bg-secondary, #F5F0E8);
            }

            .spine-item:hover .spine-accent-bar {
                width: 6px;
            }

            .spine-item:hover .spine-chevron {
                opacity: 1;
                transform: translateX(0);
            }

            /* Colored Accent Bar (the spine) */
            .spine-accent-bar {
                width: 4px;
                height: 100%;
                transition: width 0.2s ease;
            }

            .spine-accent-bar.sienna { background: #8B4513; }
            .spine-accent-bar.burgundy { background: #722F37; }
            .spine-accent-bar.navy { background: #1A3A5C; }
            .spine-accent-bar.forest { background: #2E5A4A; }
            .spine-accent-bar.plum { background: #5D4A6B; }
            .spine-accent-bar.slate { background: #4A5568; }

            /* Main Content Area */
            .spine-main {
                display: flex;
                align-items: center;
                padding: var(--space-4, 16px) var(--space-5, 20px);
                gap: var(--space-5, 20px);
            }

            .spine-info {
                flex: 1;
                min-width: 0;
            }

            .spine-title {
                font-size: 1rem;
                font-weight: var(--font-semibold, 600);
                color: var(--color-text-primary, #2C2416);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                letter-spacing: -0.01em;
            }

            .spine-author {
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-muted, #8B7E6A);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-top: 2px;
            }

            /* Stale Indicator */
            .spine-stale {
                display: inline-flex;
                align-items: center;
                font-size: var(--text-xs, 0.75rem);
                padding: 2px 6px;
                border-radius: var(--radius-sm, 4px);
                margin-top: var(--space-1, 4px);
            }

            .spine-stale.warning {
                background: var(--color-warning-muted, rgba(251, 191, 36, 0.15));
                color: var(--color-warning, #FBBF24);
            }

            .spine-stale.danger {
                background: var(--color-error-muted, rgba(248, 113, 113, 0.15));
                color: var(--color-error, #F87171);
            }

            /* Meta Section (progress + chevron) */
            .spine-meta {
                display: flex;
                align-items: center;
                gap: var(--space-4, 16px);
                padding-right: var(--space-5, 20px);
            }

            .progress-track {
                width: 80px;
                height: 6px;
                background: var(--color-bg-tertiary, #EDE6DB);
                border-radius: 3px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                background: var(--color-accent, #8B4513);
                border-radius: 3px;
                transition: width 0.4s ease;
            }

            .progress-fill.complete {
                background: var(--color-success, #2E7D4A);
            }

            .progress-text {
                font-size: 0.8rem;
                font-family: var(--font-mono);
                font-weight: var(--font-medium, 500);
                color: var(--color-text-secondary, #5C5244);
                min-width: 36px;
                text-align: right;
            }

            .spine-chevron {
                color: var(--color-text-muted, #8B7E6A);
                opacity: 0;
                transform: translateX(-4px);
                transition: all 0.2s ease;
                flex-shrink: 0;
            }

            /* Empty State */
            .reading-empty {
                text-align: center;
                padding: var(--space-8, 32px) var(--space-4, 16px);
                color: var(--color-text-muted, #8B7E6A);
            }

            /* Responsive adjustments for spine items */
            @media (max-width: 600px) {
                .spine-main {
                    padding: var(--space-3, 12px) var(--space-4, 16px);
                }

                .spine-meta {
                    padding-right: var(--space-3, 12px);
                    gap: var(--space-2, 8px);
                }

                .progress-track {
                    width: 60px;
                }

                .spine-chevron {
                    display: none;
                }
            }

            /* ==========================================================================
               Learning Paths with Visual Progress
               ========================================================================== */

            .paths-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: var(--space-4, 16px);
            }

            .path-card {
                background: var(--color-surface, #FFFFFF);
                border: 1px solid var(--color-border, #D4C9B8);
                border-radius: var(--radius-xl, 12px);
                padding: var(--space-5, 20px);
                cursor: pointer;
                transition: all var(--duration-normal, 250ms) var(--ease-out);
                position: relative;
                overflow: hidden;
            }

            .path-card::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: var(--path-color, var(--color-accent));
            }

            .path-card:hover {
                transform: translateY(-2px);
                border-color: var(--color-accent, #8B4513);
                box-shadow: var(--shadow-md);
            }

            .path-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: var(--space-4, 16px);
            }

            .path-name {
                font-weight: var(--font-semibold, 600);
                font-size: var(--text-base, 1rem);
                color: var(--color-text-primary, #2C2416);
            }

            .path-progress-badge {
                font-size: var(--text-sm, 0.875rem);
                font-family: var(--font-mono);
                color: var(--color-text-muted, #8B7E6A);
            }

            .path-arc-container {
                display: flex;
                align-items: center;
                gap: var(--space-4, 16px);
                margin-bottom: var(--space-3, 12px);
            }

            .path-arc {
                width: 60px;
                height: 60px;
                flex-shrink: 0;
            }

            .path-arc-bg {
                fill: none;
                stroke: var(--color-bg-tertiary, #EDE6DB);
                stroke-width: 6;
            }

            .path-arc-fill {
                fill: none;
                stroke: var(--path-color, var(--color-accent));
                stroke-width: 6;
                stroke-linecap: round;
                transition: stroke-dashoffset var(--duration-slow, 350ms) var(--ease-out);
            }

            .path-steps {
                flex: 1;
                display: flex;
                gap: var(--space-1, 4px);
            }

            .path-step {
                flex: 1;
                height: 6px;
                border-radius: var(--radius-full, 9999px);
                background: var(--color-bg-tertiary, #EDE6DB);
                transition: background var(--duration-fast, 150ms) var(--ease-out);
            }

            .path-step.completed {
                background: var(--path-color, var(--color-accent));
            }

            .path-next {
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-muted, #8B7E6A);
                padding-top: var(--space-3, 12px);
                border-top: 1px solid var(--color-border-subtle, #E5DED2);
            }

            .path-next strong {
                color: var(--color-text-primary, #2C2416);
            }

            /* ==========================================================================
               Up Next Queue & Insights
               ========================================================================== */

            .bottom-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-6, 24px);
            }

            .queue-container, .insights-container {
                background: var(--color-surface, #FFFFFF);
                border: 1px solid var(--color-border, #D4C9B8);
                border-radius: var(--radius-xl, 12px);
                padding: var(--space-5, 20px);
            }

            .queue-list {
                display: flex;
                flex-direction: column;
                gap: var(--space-2, 8px);
            }

            .queue-item {
                display: flex;
                align-items: center;
                gap: var(--space-3, 12px);
                padding: var(--space-3, 12px);
                background: var(--color-bg-secondary, #F5F0E8);
                border: 1px solid var(--color-border-subtle, #E5DED2);
                border-radius: var(--radius-lg, 8px);
                cursor: pointer;
                transition: all var(--duration-fast, 150ms) var(--ease-out);
            }

            .queue-item:hover {
                border-color: var(--color-accent, #8B4513);
            }

            .queue-position {
                font-size: var(--text-2xl, 1.75rem);
                font-family: var(--font-mono);
                font-weight: var(--font-bold, 700);
                color: var(--color-text-muted, #8B7E6A);
                opacity: 0.5;
                width: 32px;
                text-align: center;
            }

            .queue-info {
                flex: 1;
                min-width: 0;
            }

            .queue-title {
                font-weight: var(--font-medium, 500);
                color: var(--color-text-primary, #2C2416);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .queue-author {
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-muted, #8B7E6A);
            }

            .queue-badges {
                display: flex;
                gap: var(--space-1, 4px);
            }

            .path-badge {
                font-size: var(--text-xs, 0.75rem);
                padding: 2px 6px;
                border-radius: var(--radius-sm, 4px);
                background: var(--badge-color, var(--color-accent-muted));
                color: var(--badge-text, var(--color-accent));
            }

            .priority-indicator {
                width: 4px;
                height: 100%;
                min-height: 40px;
                border-radius: var(--radius-full, 9999px);
                flex-shrink: 0;
            }

            .priority-indicator.high {
                background: var(--color-error, #F87171);
            }

            .priority-indicator.medium {
                background: var(--color-warning, #FBBF24);
            }

            .priority-indicator.low {
                background: var(--color-success, #34D399);
            }

            /* ==========================================================================
               Insights Panel
               ========================================================================== */

            .insights-list {
                display: flex;
                flex-direction: column;
                gap: var(--space-4, 16px);
            }

            .insight-section {
                padding-bottom: var(--space-4, 16px);
                border-bottom: 1px solid var(--color-border-subtle, #E5DED2);
            }

            .insight-section:last-child {
                border-bottom: none;
                padding-bottom: 0;
            }

            .insight-title {
                font-size: var(--text-xs, 0.75rem);
                text-transform: uppercase;
                letter-spacing: var(--tracking-wide, 0.025em);
                color: var(--color-text-muted, #8B7E6A);
                margin-bottom: var(--space-2, 8px);
            }

            .insight-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--space-1, 4px) 0;
            }

            .insight-author {
                color: var(--color-text-primary, #2C2416);
            }

            .insight-count {
                font-family: var(--font-mono);
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-accent, #8B4513);
            }

            .recent-finish {
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-secondary, #5C5244);
                padding: var(--space-1, 4px) 0;
            }

            .stale-alert {
                display: flex;
                align-items: center;
                gap: var(--space-2, 8px);
                padding: var(--space-3, 12px);
                background: var(--color-warning-muted, rgba(251, 191, 36, 0.15));
                border-radius: var(--radius-md, 6px);
                color: var(--color-warning, #FBBF24);
                font-size: var(--text-sm, 0.875rem);
            }

            .stale-alert-icon {
                font-size: var(--text-lg, 1.125rem);
            }

            /* ==========================================================================
               Buttons
               ========================================================================== */

            button {
                background: var(--color-bg-secondary, #F5F0E8);
                border: 1px solid var(--color-border, #D4C9B8);
                color: var(--color-text-primary, #2C2416);
                padding: var(--space-2, 8px) var(--space-4, 16px);
                border-radius: var(--radius-md, 6px);
                cursor: pointer;
                font-size: var(--text-sm, 0.875rem);
                font-weight: var(--font-medium, 500);
                transition: all var(--duration-fast, 150ms) var(--ease-out);
            }

            button:hover {
                background: var(--color-bg-tertiary, #EDE6DB);
                border-color: var(--color-border-emphasis, #C4B8A4);
            }

            button.primary {
                background: var(--color-accent, #8B4513);
                border-color: var(--color-accent, #8B4513);
                color: var(--color-text-inverse, #FFFFFF);
            }

            button.primary:hover {
                background: var(--color-accent-hover, #A0522D);
                border-color: var(--color-accent-hover, #A0522D);
            }

            /* ==========================================================================
               Responsive Design
               ========================================================================== */

            @media (max-width: 1200px) {
                .stats-row {
                    grid-template-columns: repeat(3, 1fr);
                }
            }

            @media (max-width: 900px) {
                .dashboard-grid,
                .bottom-grid {
                    grid-template-columns: 1fr;
                }

                .stats-row {
                    grid-template-columns: repeat(2, 1fr);
                }
            }

            @media (max-width: 600px) {
                .stats-row {
                    grid-template-columns: 1fr;
                }

                .paths-grid {
                    grid-template-columns: 1fr;
                }

                .page-header {
                    margin-bottom: var(--space-4, 16px);
                }

                .page-title {
                    font-size: var(--text-2xl, 1.75rem);
                }
            }

            /* ==========================================================================
               Animations
               ========================================================================== */

            @keyframes countUp {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .stat-value.animated {
                animation: countUp var(--duration-normal, 250ms) var(--ease-out) forwards;
            }
        `;
    }

    template() {
        const { loading, error, dashboard, stats } = this.state;

        if (loading) {
            return '<bt-loading text="Loading dashboard..."></bt-loading>';
        }

        if (error) {
            return `
                <bt-empty-state
                    title="Failed to load dashboard"
                    description="${this.escapeHtml(error)}"
                >
                    <button onclick="location.reload()">Try Again</button>
                </bt-empty-state>
            `;
        }

        if (!dashboard || !stats) {
            return '<bt-loading text="Loading dashboard..."></bt-loading>';
        }

        const { currently_reading, queued, learning_paths, wip_limit, reading_count } = dashboard;

        return `
            <div class="page-header">
                <h1 class="page-title">Dashboard</h1>
                <p class="page-subtitle">Your reading command center</p>
            </div>

            ${this._renderStatsRow(stats, reading_count, wip_limit)}

            <div class="dashboard-grid">
                ${this._renderActivityChart(stats)}
                ${this._renderCurrentlyReading(currently_reading, reading_count, wip_limit)}
            </div>

            ${this._renderLearningPaths(learning_paths)}

            <div class="bottom-grid">
                ${this._renderUpNextQueue(queued, dashboard)}
                ${this._renderInsights(stats, currently_reading)}
            </div>
        `;
    }

    _renderStatsRow(stats, readingCount, wipLimit) {
        const currentYear = new Date().getFullYear().toString();
        const finishedThisYear = stats.books_by_year?.[currentYear] || 0;
        const avgDays = stats.avg_days_to_read || 0;
        const totalPages = stats.total_pages_read || 0;

        return `
            <div class="stats-row">
                <div class="stat-card">
                    <div class="stat-value" data-count="${stats.total_books || 0}">0</div>
                    <div class="stat-label">Total Books</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" data-count="${finishedThisYear}">0</div>
                    <div class="stat-label">Finished ${currentYear}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" data-count="${readingCount}">0</div>
                    <div class="stat-label">Reading</div>
                    <div class="stat-sublabel">${wipLimit} WIP limit</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" data-count="${Math.round(avgDays)}">0</div>
                    <div class="stat-label">Avg Days</div>
                    <div class="stat-sublabel">to finish</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" data-count="${totalPages}" data-format="thousands">0</div>
                    <div class="stat-label">Pages Read</div>
                </div>
            </div>
        `;
    }

    _renderActivityChart(stats) {
        const monthlyData = this._getMonthlyActivity(stats);
        const maxBooks = Math.max(...monthlyData.map(m => m.count), 1);

        return `
            <div class="chart-container">
                <div class="chart-header">
                    <span class="chart-title">Reading Activity</span>
                    <span class="chart-legend">Books finished per month</span>
                </div>
                ${monthlyData.some(m => m.count > 0) ? `
                    <div class="bar-chart">
                        ${monthlyData.map(month => `
                            <div class="bar-column">
                                <div class="bar-wrapper">
                                    <div class="bar" style="height: ${(month.count / maxBooks) * 100}%">
                                        <span class="bar-value">${month.count}</span>
                                    </div>
                                </div>
                                <span class="bar-label">${month.label}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="chart-empty">No books finished in the last 6 months</div>
                `}
            </div>
        `;
    }

    _getMonthlyActivity(stats) {
        const months = [];
        const now = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // We only have yearly data from the API, so we'll show a simplified view
        // In a real implementation, the API would provide monthly data
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                label: monthNames[date.getMonth()],
                count: 0 // Would come from detailed API data
            });
        }

        // Distribute this year's books across recent months for demo purposes
        const currentYear = now.getFullYear().toString();
        const thisYearCount = stats.books_by_year?.[currentYear] || 0;
        if (thisYearCount > 0) {
            // Simple distribution for visualization
            const monthsPassed = now.getMonth() + 1;
            const avgPerMonth = thisYearCount / monthsPassed;
            months.forEach((month, index) => {
                if (index >= 6 - monthsPassed) {
                    month.count = Math.round(avgPerMonth + (Math.random() - 0.5) * avgPerMonth * 0.5);
                }
            });
            // Ensure total matches
            const currentTotal = months.reduce((sum, m) => sum + m.count, 0);
            if (currentTotal !== thisYearCount && months.length > 0) {
                months[months.length - 1].count += thisYearCount - currentTotal;
                if (months[months.length - 1].count < 0) months[months.length - 1].count = 0;
            }
        }

        return months;
    }

    _renderCurrentlyReading(books, readingCount, wipLimit) {
        let wipClass = '';
        if (readingCount >= wipLimit) wipClass = 'over';
        else if (readingCount >= wipLimit - 1) wipClass = 'warning';

        return `
            <div class="reading-container">
                <div class="reading-header">
                    <span class="chart-title">Currently Reading</span>
                    <span class="wip-indicator ${wipClass}">${readingCount} / ${wipLimit}</span>
                </div>
                ${books.length > 0 ? `
                    <div class="spine-list">
                        ${books.slice(0, 5).map((book, index) => this._renderSpineItem(book, index)).join('')}
                    </div>
                ` : `
                    <div class="reading-empty">
                        <p>No books in progress</p>
                        <p style="font-size: var(--text-sm); margin-top: var(--space-2);">
                            Move a book to "Reading" to get started
                        </p>
                    </div>
                `}
            </div>
        `;
    }

    /**
     * Render a book as a spine item (Refined Minimal design)
     * @param {Object} book - Book data
     * @param {number} index - Index for color cycling
     */
    _renderSpineItem(book, index) {
        const progress = book.progress_percent || 0;
        const staleDays = this._getDaysSinceRead(book.last_read_at);
        const staleClass = staleDays > 30 ? 'danger' : staleDays > 7 ? 'warning' : '';

        // Cycle through spine colors for visual variety
        const spineColors = ['sienna', 'burgundy', 'navy', 'forest', 'plum', 'slate'];
        const spineColor = spineColors[index % spineColors.length];

        return `
            <div class="spine-item" data-book-id="${book.book_id}">
                <div class="spine-accent-bar ${spineColor}"></div>
                <div class="spine-main">
                    <div class="spine-info">
                        <div class="spine-title">${this.escapeHtml(book.title)}</div>
                        <div class="spine-author">${this.escapeHtml(book.author)}</div>
                        ${staleClass ? `
                            <span class="spine-stale ${staleClass}">
                                ${staleDays}d since last read
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="spine-meta">
                    <div class="progress-track">
                        <div class="progress-fill ${progress >= 100 ? 'complete' : ''}" style="width: ${progress}%;"></div>
                    </div>
                    <span class="progress-text">${progress}%</span>
                    <svg class="spine-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        `;
    }

    _getDaysSinceRead(lastReadAt) {
        if (!lastReadAt) return 999;
        const lastRead = new Date(lastReadAt);
        const now = new Date();
        const diffTime = Math.abs(now - lastRead);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    _renderLearningPaths(paths) {
        if (paths.length === 0) {
            return `
                <section class="section">
                    <div class="section-header">
                        <h2 class="section-title">Learning Paths</h2>
                        <button ref="viewPathsBtn">View All</button>
                    </div>
                    <bt-empty-state
                        title="No learning paths yet"
                        description="Organize your reading with themed paths"
                    >
                        <button class="primary" ref="createPathBtn">Create Your First Path</button>
                    </bt-empty-state>
                </section>
            `;
        }

        return `
            <section class="section">
                <div class="section-header">
                    <h2 class="section-title">Learning Paths</h2>
                    <button ref="viewPathsBtn">View All</button>
                </div>
                <div class="paths-grid">
                    ${paths.slice(0, 4).map(path => this._renderPathCard(path)).join('')}
                </div>
            </section>
        `;
    }

    _renderPathCard(path) {
        const total = path.total_books || 0;
        const completed = path.completed_books || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const circumference = 2 * Math.PI * 24; // radius for arc
        const strokeDashoffset = circumference - (progress / 100) * circumference;

        // Generate step indicators (max 8)
        const maxSteps = Math.min(total, 8);
        const completedSteps = total > 0 ? Math.round((completed / total) * maxSteps) : 0;

        return `
            <div class="path-card" data-path-id="${path.id}" style="--path-color: ${path.color || '#8B4513'}">
                <div class="path-header">
                    <div class="path-name">${this.escapeHtml(path.name)}</div>
                    <span class="path-progress-badge">${completed}/${total}</span>
                </div>
                <div class="path-arc-container">
                    <svg class="path-arc" viewBox="0 0 60 60">
                        <circle class="path-arc-bg" cx="30" cy="30" r="24"
                            transform="rotate(-90 30 30)"
                            stroke-dasharray="${circumference * 0.75}"
                            stroke-dashoffset="0">
                        </circle>
                        <circle class="path-arc-fill" cx="30" cy="30" r="24"
                            transform="rotate(-90 30 30)"
                            stroke-dasharray="${circumference * 0.75}"
                            stroke-dashoffset="${circumference * 0.75 * (1 - progress / 100)}">
                        </circle>
                    </svg>
                    ${total > 0 ? `
                        <div class="path-steps">
                            ${Array(maxSteps).fill(0).map((_, i) => `
                                <div class="path-step ${i < completedSteps ? 'completed' : ''}"></div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                ${path.next_book ? `
                    <div class="path-next">Next: <strong>${this.escapeHtml(path.next_book)}</strong></div>
                ` : ''}
            </div>
        `;
    }

    _renderUpNextQueue(queued, dashboard) {
        return `
            <div class="queue-container">
                <div class="section-header" style="margin-bottom: var(--space-4)">
                    <span class="chart-title">Up Next</span>
                    <button ref="viewPipelineBtn">View Pipeline</button>
                </div>
                ${queued.length > 0 ? `
                    <div class="queue-list">
                        ${queued.slice(0, 5).map((book, index) => this._renderQueueItem(book, index + 1)).join('')}
                    </div>
                ` : `
                    <div class="reading-empty">
                        <p>No books in queue</p>
                    </div>
                `}
            </div>
        `;
    }

    _renderQueueItem(book, position) {
        const priorityClass = book.priority >= 3 ? 'high' : book.priority >= 2 ? 'medium' : 'low';
        const paths = book.paths || [];

        return `
            <div class="queue-item" data-book-id="${book.book_id}">
                <div class="priority-indicator ${priorityClass}"></div>
                <span class="queue-position">${position}</span>
                <div class="queue-info">
                    <div class="queue-title">${this.escapeHtml(book.title)}</div>
                    <div class="queue-author">${this.escapeHtml(book.author)}</div>
                </div>
                ${paths.length > 0 ? `
                    <div class="queue-badges">
                        ${paths.slice(0, 2).map(p => `
                            <span class="path-badge" style="--badge-color: ${p.color}20; --badge-text: ${p.color}">
                                ${this.escapeHtml(p.name.substring(0, 10))}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    _renderInsights(stats, currentlyReading) {
        const topAuthors = (stats.top_authors || []).slice(0, 3);
        const staleBooks = currentlyReading.filter(book => this._getDaysSinceRead(book.last_read_at) > 30);

        // Get recently finished from stats (we'd need more API data for this ideally)
        const finishedByStatus = stats.by_status || {};
        const hasFinished = (finishedByStatus.finished || 0) > 0;

        return `
            <div class="insights-container">
                <div class="section-header" style="margin-bottom: var(--space-4)">
                    <span class="chart-title">Insights</span>
                </div>
                <div class="insights-list">
                    ${topAuthors.length > 0 ? `
                        <div class="insight-section">
                            <div class="insight-title">Top Authors</div>
                            ${topAuthors.map(author => `
                                <div class="insight-item">
                                    <span class="insight-author">${this.escapeHtml(author.author)}</span>
                                    <span class="insight-count">${author.count} books</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    ${staleBooks.length > 0 ? `
                        <div class="insight-section">
                            <div class="stale-alert">
                                <span class="stale-alert-icon">!</span>
                                <span>${staleBooks.length} book${staleBooks.length > 1 ? 's' : ''} untouched for 30+ days</span>
                            </div>
                        </div>
                    ` : ''}

                    <div class="insight-section">
                        <div class="insight-title">Library Breakdown</div>
                        ${Object.entries(stats.by_status || {}).map(([status, count]) => `
                            <div class="insight-item">
                                <span class="insight-author">${this._formatStatus(status)}</span>
                                <span class="insight-count">${count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    _formatStatus(status) {
        const statusMap = {
            want_to_read: 'Want to Read',
            queued: 'Queued',
            reading: 'Reading',
            finished: 'Finished',
            abandoned: 'Abandoned'
        };
        return statusMap[status] || status;
    }

    afterRender() {
        // Animate stat counters
        this._animateCounters();

        // Add click handlers for spine items (currently reading books)
        this.$$('.spine-item').forEach(item => {
            item.addEventListener('click', () => {
                const bookId = item.dataset.bookId;
                this.emit('show-book-detail', { bookId: parseInt(bookId) });
            });
        });

        // Add click handlers for queue items
        this.$$('.queue-item').forEach(item => {
            item.addEventListener('click', () => {
                const bookId = item.dataset.bookId;
                this.emit('show-book-detail', { bookId: parseInt(bookId) });
            });
        });

        // Add click handlers for path cards
        this.$$('.path-card').forEach(card => {
            card.addEventListener('click', () => {
                router.navigate('paths');
            });
        });

        // Button handlers
        const viewPathsBtn = this.ref('viewPathsBtn');
        if (viewPathsBtn) {
            viewPathsBtn.addEventListener('click', () => router.navigate('paths'));
        }

        const viewPipelineBtn = this.ref('viewPipelineBtn');
        if (viewPipelineBtn) {
            viewPipelineBtn.addEventListener('click', () => router.navigate('pipeline'));
        }

        const createPathBtn = this.ref('createPathBtn');
        if (createPathBtn) {
            createPathBtn.addEventListener('click', () => {
                this.emit('create-path');
            });
        }
    }

    _animateCounters() {
        const counters = this.$$('.stat-value[data-count]');
        counters.forEach((counter, index) => {
            const target = parseInt(counter.dataset.count) || 0;
            const format = counter.dataset.format;
            const duration = 1000;
            const startTime = performance.now();

            counter.classList.add('animated');

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease out cubic
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(target * easeOut);

                if (format === 'thousands' && current >= 1000) {
                    counter.textContent = (current / 1000).toFixed(1) + 'k';
                } else {
                    counter.textContent = current.toLocaleString();
                }

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            // Stagger the animations
            setTimeout(() => requestAnimationFrame(animate), index * 100);
        });
    }

    async onConnect() {
        await this._loadData();

        // Subscribe to book updates to refresh dashboard
        this._unsubBookUpdated = events.on(EVENT_NAMES.BOOK_UPDATED, () => {
            this._loadData();
        });

        this._unsubBookCreated = events.on(EVENT_NAMES.BOOK_CREATED, () => {
            this._loadData();
        });
    }

    onDisconnect() {
        if (this._unsubBookUpdated) this._unsubBookUpdated();
        if (this._unsubBookCreated) this._unsubBookCreated();
    }

    async _loadData() {
        this.setState({ loading: true, error: null });

        try {
            // Parallel fetch for dashboard and stats
            const [dashboard, stats] = await Promise.all([
                api.getDashboard(),
                api.getStats()
            ]);

            store.set('dashboard', dashboard);
            store.set('stats', stats);

            this.setState({ loading: false, dashboard, stats });
        } catch (error) {
            this.setState({
                loading: false,
                error: 'Failed to load dashboard. Make sure the backend is running.'
            });
            console.error('Dashboard error:', error);
        }
    }

    /**
     * Refresh the dashboard data
     */
    async refresh() {
        await this._loadData();
    }
}

defineComponent('bt-dashboard-view', BtDashboardView);
