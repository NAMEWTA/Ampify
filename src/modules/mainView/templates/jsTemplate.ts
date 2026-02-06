/**
 * JS 模板
 * Webview 客户端逻辑
 */
export function getJs(): string {
    return `
(function() {
    const vscode = acquireVsCodeApi();
    
    // ==================== State ====================
    let currentSection = 'dashboard';
    let navExpanded = false;
    let selectedNodeId = null;
    let expandedNodes = new Set();
    let currentTreeData = [];
    let contextMenuTarget = null;

    // Restore persisted state
    const persistedState = vscode.getState();
    if (persistedState) {
        navExpanded = persistedState.navExpanded || false;
        currentSection = persistedState.currentSection || 'dashboard';
        expandedNodes = new Set(persistedState.expandedNodes || []);
    }

    // ==================== Init ====================
    function init() {
        setupNav();
        setupNavToggle();
        setupContextMenuDismiss();
        setupDragDrop();
        setupProxyActions();
        
        // Apply persisted nav state
        const navRail = document.querySelector('.nav-rail');
        if (navExpanded) navRail.classList.add('expanded');
        
        // Highlight current section
        setActiveNavItem(currentSection);
        
        // Notify extension we're ready
        vscode.postMessage({ type: 'ready' });
    }

    // ==================== Navigation ====================
    function setupNav() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                if (section !== currentSection) {
                    currentSection = section;
                    setActiveNavItem(section);
                    saveState();
                    vscode.postMessage({ type: 'switchSection', section });
                }
            });
        });
    }

    function setActiveNavItem(section) {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });
    }

    function setupNavToggle() {
        const toggleBtn = document.querySelector('.nav-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                navExpanded = !navExpanded;
                document.querySelector('.nav-rail').classList.toggle('expanded', navExpanded);
                saveState();
            });
        }
    }

    function setupProxyActions() {
        document.body.addEventListener('click', (e) => {
            if (currentSection !== 'modelProxy') { return; }
            if (!(e.target instanceof Element)) { return; }

            const actionBtn = e.target.closest('[data-proxy-action]');
            if (actionBtn) {
                e.stopPropagation();
                vscode.postMessage({ type: 'proxyAction', actionId: actionBtn.dataset.proxyAction });
                return;
            }

            const viewAllBtn = e.target.closest('.proxy-view-all-logs-btn');
            if (viewAllBtn) {
                e.stopPropagation();
                vscode.postMessage({ type: 'requestLogFiles' });
            }
        });
    }

    // ==================== Message Handling ====================
    window.addEventListener('message', event => {
        const msg = event.data;
        switch (msg.type) {
            case 'updateSection':
                renderSection(msg.section, msg.tree, msg.toolbar, msg.tags, msg.activeTags);
                break;
            case 'updateDashboard':
                renderDashboard(msg.data);
                break;
            case 'updateSettings':
                renderSettings(msg.data);
                break;
            case 'updateModelProxy':
                renderModelProxy(msg.data);
                break;
            case 'updateLogFiles':
                renderLogViewer(msg.files);
                break;
            case 'updateLogQuery':
                renderLogQueryResult(msg.result, msg.date, msg.statusFilter, msg.keyword);
                break;
            case 'setActiveSection':
                currentSection = msg.section;
                setActiveNavItem(msg.section);
                saveState();
                break;
            case 'showOverlay':
                showOverlayPanel(msg.data);
                break;
            case 'hideOverlay':
                hideOverlayPanel();
                break;
            case 'showConfirm':
                showConfirmDialog(msg.data);
                break;
        }
    });

    // ==================== Dashboard Rendering ====================
    function renderDashboard(data) {
        const body = document.querySelector('.content-body');
        const toolbar = document.querySelector('.toolbar');
        
        // Update toolbar
        toolbar.innerHTML = '<span class="toolbar-title">DASHBOARD</span>';
        
        let html = '<div class="dashboard">';
        
        // Stats
        html += '<div class="stats-grid">';
        for (const stat of data.stats) {
            const color = stat.color || 'var(--vscode-foreground)';
            html += \`
                <div class="stat-card">
                    <div class="stat-icon" style="color: \${color}; background: \${color}22;">
                        <i class="codicon codicon-\${stat.iconId}"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">\${stat.value}</div>
                        <div class="stat-label">\${stat.label}</div>
                    </div>
                </div>
            \`;
        }
        html += '</div>';
        
        // Quick Actions
        if (data.quickActions && data.quickActions.length > 0) {
            html += '<div class="quick-actions-title">QUICK ACTIONS</div>';
            html += '<div class="quick-actions">';
            for (const action of data.quickActions) {
                const actionType = action.action || 'command';
                const section = action.section || '';
                const actionId = action.actionId || action.id;
                html += \`
                    <button class="quick-action-btn" data-command="\${action.command}" data-action-type="\${actionType}" data-action-id="\${actionId}" data-section="\${section}">
                        <i class="codicon codicon-\${action.iconId}"></i>
                        <span>\${action.label}</span>
                    </button>
                \`;
            }
            html += '</div>';
        }
        
        html += '</div>';
        body.innerHTML = html;
        
        // Bind quick actions
        body.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const actionType = btn.dataset.actionType || 'command';
                if (actionType === 'toolbar') {
                    vscode.postMessage({
                        type: 'quickAction',
                        actionId: btn.dataset.actionId,
                        section: btn.dataset.section
                    });
                } else {
                    vscode.postMessage({ type: 'executeCommand', command: btn.dataset.command });
                }
            });
        });
    }

    // ==================== Settings Rendering ====================
    function renderSettings(data) {
        const body = document.querySelector('.content-body');
        const toolbar = document.querySelector('.toolbar');

        toolbar.innerHTML = '<span class="toolbar-title">SETTINGS</span>';

        let html = '<div class="settings">';
        for (const section of data.sections || []) {
            html += '<div class="settings-section">';
            html += '<div class="settings-section-title">' + section.title + '</div>';
            for (const field of section.fields || []) {
                html += '<div class="settings-field">';
                html += '<label class="settings-label">' + field.label + '</label>';
                if (field.kind === 'select') {
                    html += '<select class="settings-input" data-key="' + field.key + '" data-scope="' + field.scope + '">';
                    for (const option of field.options || []) {
                        const selected = option.value === field.value ? ' selected' : '';
                        html += '<option value="' + option.value + '"' + selected + '>' + option.label + '</option>';
                    }
                    html += '</select>';
                } else if (field.kind === 'textarea') {
                    html += '<textarea class="settings-input" data-key="' + field.key + '" data-scope="' + field.scope + '" placeholder="' + (field.placeholder || '') + '">' + (field.value || '') + '</textarea>';
                } else {
                    html += '<input class="settings-input" data-key="' + field.key + '" data-scope="' + field.scope + '" type="text" value="' + (field.value || '') + '" placeholder="' + (field.placeholder || '') + '" />';
                }
                if (field.action) {
                    html += '<button class="settings-action-btn" data-command="' + field.action.command + '" title="' + field.action.label + '">';
                    if (field.action.iconId) {
                        html += '<i class="codicon codicon-' + field.action.iconId + '"></i> ';
                    }
                    html += field.action.label + '</button>';
                }
                if (field.description) {
                    html += '<div class="settings-hint">' + field.description + '</div>';
                }
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div>';

        body.innerHTML = html;

        const inputs = body.querySelectorAll('.settings-input');
        inputs.forEach(input => {
            let timer = null;
            const sendChange = () => {
                const key = input.dataset.key;
                const scope = input.dataset.scope;
                if (!key || !scope) { return; }
                vscode.postMessage({
                    type: 'changeSetting',
                    key,
                    scope,
                    value: input.value
                });
            };
            const debounce = () => {
                if (timer) { clearTimeout(timer); }
                timer = setTimeout(sendChange, 400);
            };
            input.addEventListener('input', debounce);
            input.addEventListener('change', sendChange);
            input.addEventListener('blur', sendChange);
        });

        body.querySelectorAll('.settings-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                vscode.postMessage({ type: 'settingsAction', command: btn.dataset.command });
            });
        });
    }

    // ==================== Model Proxy Rendering ====================
    function renderModelProxy(data) {
        const body = document.querySelector('.content-body');
        if (!body) return;

        const running = data.running;
        const L = data.labels || {};
        const errorRate = data.todayRequests > 0
            ? ((data.todayErrors / data.todayRequests) * 100).toFixed(1) + '%'
            : '0%';
        const avgLatency = data.avgLatencyMs > 0
            ? (data.avgLatencyMs / 1000).toFixed(2) + 's'
            : '—';

        let html = '<div class="proxy-dashboard">';

        // ── Stats Grid ──
        html += '<div class="proxy-stats-grid">';
        html += makeProxyStatCard(
            running ? 'pass-filled' : 'circle-slash',
            running ? '#788c5d' : '#888',
            running ? (L.statusRunning || 'Running') : (L.statusStopped || 'Stopped'),
            running ? ':' + data.port : (L.offline || 'Offline')
        );
        html += makeProxyStatCard('pulse', '#6a9bcc', String(data.todayRequests), L.requests || 'Requests');
        html += makeProxyStatCard('symbol-numeric', '#d97757', String(data.todayTokens), L.tokens || 'Tokens');
        html += makeProxyStatCard('warning', data.todayErrors > 0 ? '#d97757' : '#788c5d', errorRate, L.errorRate || 'Error Rate');
        html += makeProxyStatCard('clock', '#6a9bcc', avgLatency, L.avgLatency || 'Avg Latency');
        html += '</div>';

        // ── Connection Info (only when running) ──
        if (running) {
            html += '<div class="proxy-section-title">' + escapeHtml(L.connection || 'CONNECTION') + '</div>';
            html += '<div class="proxy-connection">';
            html += \`
                <div class="proxy-conn-row">
                    <span class="proxy-conn-label"><i class="codicon codicon-link"></i> \${escapeHtml(L.baseUrl || 'Base URL')}</span>
                    <span class="proxy-conn-value">\${escapeHtml(data.baseUrl)}</span>
                    <button class="proxy-conn-btn" data-proxy-action="copyUrl" title="\${escapeHtml(L.copy || 'Copy')}"><i class="codicon codicon-copy"></i></button>
                </div>
                <div class="proxy-conn-row">
                    <span class="proxy-conn-label"><i class="codicon codicon-key"></i> \${escapeHtml(L.apiKey || 'API Key')}</span>
                    <span class="proxy-conn-value">\${escapeHtml(data.maskedApiKey)}</span>
                    <button class="proxy-conn-btn" data-proxy-action="copyKey" title="\${escapeHtml(L.copy || 'Copy')}"><i class="codicon codicon-copy"></i></button>
                    <button class="proxy-conn-btn" data-proxy-action="regenerateKey" title="\${escapeHtml(L.regenerate || 'Regenerate')}"><i class="codicon codicon-refresh"></i></button>
                </div>
            \`;
            html += '</div>';
        }

        // ── Available Models (collapsible compact list) ──
        const modelsTitle = escapeHtml(L.availableModels || 'Available Models');
        const modelsHint = escapeHtml(L.selectModelHint || 'Click to select default');
        html += '<div class="proxy-section-title proxy-models-toggle" data-toggle="proxy-models-list">';
        html += modelsTitle + ' <span class="proxy-section-hint">' + modelsHint + '</span>';
        html += ' <i class="codicon codicon-chevron-right proxy-models-chevron"></i>';
        html += '</div>';
        html += '<div class="proxy-models-list collapsed" id="proxy-models-list">';
        if (data.models && data.models.length > 0) {
            for (const model of data.models) {
                const isSelected = model.id === data.defaultModelId;
                html += \`
                    <div class="proxy-model-row\${isSelected ? ' selected' : ''}" data-model-id="\${escapeHtml(model.id)}">
                        <i class="codicon codicon-\${isSelected ? 'check' : 'circle-outline'} proxy-model-radio" style="color:\${isSelected ? '#d97757' : 'inherit'}"></i>
                        <span class="proxy-model-name">\${escapeHtml(model.name || model.id)}</span>
                        <span class="proxy-model-tag">\${escapeHtml(model.vendor)}</span>
                        <span class="proxy-model-tag">\${escapeHtml(model.family)}</span>
                        <span class="proxy-model-tokens">\${model.maxInputTokens.toLocaleString()} \${L.tokensMax || 'tokens max'}</span>
                    </div>
                \`;
            }
        } else {
            html += '<div class="proxy-empty-models"><i class="codicon codicon-warning"></i> ' + escapeHtml(L.noModels || 'No models available') + '</div>';
        }
        html += '</div>';

        // ── Recent Logs (compact) ──
        html += '<div class="proxy-section-title proxy-logs-title">';
        html += escapeHtml(L.recentLogs || 'Recent Logs');
        html += '<span class="proxy-logs-actions">';
        html += '<button class="proxy-logs-folder-btn" data-proxy-action="openLogs" title="' + escapeHtml(L.openLogsFolder || 'Open Logs Folder') + '"><i class="codicon codicon-folder-opened"></i></button>';
        html += '<button class="proxy-logs-folder-btn proxy-view-all-logs-btn" title="' + escapeHtml(L.viewAllLogs || 'View All Logs') + '"><i class="codicon codicon-list-flat"></i></button>';
        html += '</span>';
        html += '</div>';

        if (data.recentLogs && data.recentLogs.length > 0) {
            html += '<div class="proxy-logs-list" id="proxy-logs-list">';
            for (let idx = 0; idx < data.recentLogs.length; idx++) {
                const log = data.recentLogs[idx];
                const time = new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false });
                const duration = (log.durationMs / 1000).toFixed(1);
                const ok = log.status === 'success';
                html += \`
                    <div class="proxy-log-row" data-log-idx="\${idx}">
                        <i class="codicon codicon-\${ok ? 'check' : 'error'}" style="color:\${ok ? '#788c5d' : '#d97757'}"></i>
                        <span class="proxy-log-time">\${time}</span>
                        <span class="proxy-log-format">\${escapeHtml(log.format)}</span>
                        <span class="proxy-log-model">\${escapeHtml(log.model)}</span>
                        <span class="proxy-log-duration">\${duration}s</span>
                        <span class="proxy-log-tokens">\${log.inputTokens}\u2191 \${log.outputTokens}\u2193</span>
                    </div>
                \`;
            }
            html += '</div>';
        } else {
            html += '<div class="proxy-logs-empty"><i class="codicon codicon-inbox"></i> ' + escapeHtml(L.noLogs || 'No logs yet') + '</div>';
        }

        html += '</div>';
        body.innerHTML = html;

        // Store labels ref for log viewer
        window.__proxyLabels = L;

        // ── Bind events ──
        // Model row click → select + collapse
        body.querySelectorAll('.proxy-model-row').forEach(row => {
            row.addEventListener('click', () => {
                const modelId = row.dataset.modelId;
                if (modelId) {
                    vscode.postMessage({ type: 'selectProxyModel', modelId });
                    const list = document.getElementById('proxy-models-list');
                    const chevron = body.querySelector('.proxy-models-chevron');
                    if (list) list.classList.add('collapsed');
                    if (chevron) { chevron.classList.remove('rotated'); }
                }
            });
        });

        // Models toggle
        const modelsToggle = body.querySelector('.proxy-models-toggle');
        if (modelsToggle) {
            modelsToggle.addEventListener('click', () => {
                const list = document.getElementById('proxy-models-list');
                const chevron = modelsToggle.querySelector('.proxy-models-chevron');
                if (list) {
                    list.classList.toggle('collapsed');
                    if (chevron) chevron.classList.toggle('rotated', !list.classList.contains('collapsed'));
                }
            });
        }

        // Connection action buttons
        body.querySelectorAll('[data-proxy-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                vscode.postMessage({ type: 'proxyAction', actionId: btn.dataset.proxyAction });
            });
        });

        // "View All Logs" button → open log viewer panel
        const viewAllBtn = body.querySelector('.proxy-view-all-logs-btn');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                vscode.postMessage({ type: 'requestLogFiles' });
            });
        }

        // Log row click → show detail popup
        body.querySelectorAll('.proxy-log-row').forEach(row => {
            row.addEventListener('click', () => {
                const idx = parseInt(row.dataset.logIdx, 10);
                if (!isNaN(idx) && data.recentLogs[idx]) {
                    showLogDetail(data.recentLogs[idx], window.__proxyLabels || {});
                }
            });
        });
    }

    // ==================== Log Viewer Panel ====================

    let logViewerState = {
        files: [],
        selectedDate: '',
        page: 1,
        pageSize: 20,
        statusFilter: 'all',
        keyword: '',
        result: null
    };

    function renderLogViewer(files) {
        logViewerState.files = files;

        // Remove existing backdrop
        const existing = document.querySelector('.log-viewer-backdrop');
        if (existing) existing.remove();

        const L = window.__proxyLabels || {};

        const backdrop = document.createElement('div');
        backdrop.className = 'log-viewer-backdrop';

        let html = '<div class="log-viewer-panel">';

        // Header
        html += '<div class="log-viewer-header">';
        html += '<span class="log-viewer-title"><i class="codicon codicon-output"></i> ' + escapeHtml(L.logViewerTitle || 'Log Viewer') + '</span>';
        html += '<button class="log-viewer-close"><i class="codicon codicon-close"></i></button>';
        html += '</div>';

        // Date selector
        html += '<div class="log-viewer-toolbar">';

        // Group files by year > month
        const grouped = {};
        for (const f of files) {
            if (!grouped[f.year]) grouped[f.year] = {};
            if (!grouped[f.year][f.month]) grouped[f.year][f.month] = [];
            grouped[f.year][f.month].push(f);
        }

        // Year selector
        const years = Object.keys(grouped).sort().reverse();
        html += '<select class="log-viewer-select" id="lv-year"><option value="">' + escapeHtml(L.logYear || 'Year') + '</option>';
        for (const y of years) { html += '<option value="' + y + '">' + y + '</option>'; }
        html += '</select>';

        // Month selector (populated dynamically)
        html += '<select class="log-viewer-select" id="lv-month" disabled><option value="">' + escapeHtml(L.logMonth || 'Month') + '</option></select>';

        // Day selector (populated dynamically)
        html += '<select class="log-viewer-select" id="lv-day" disabled><option value="">' + escapeHtml(L.logDay || 'Day') + '</option></select>';

        // Status filter
        html += '<select class="log-viewer-select" id="lv-status">';
        html += '<option value="all">' + escapeHtml(L.logAll || 'All') + '</option>';
        html += '<option value="success">' + escapeHtml(L.logSuccess || 'Success') + '</option>';
        html += '<option value="error">' + escapeHtml(L.logErrors || 'Errors') + '</option>';
        html += '</select>';

        // Keyword search
        html += '<div class="log-viewer-search">';
        html += '<i class="codicon codicon-search"></i>';
        html += '<input type="text" id="lv-keyword" class="log-viewer-input" placeholder="' + escapeHtml(L.logSearchPlaceholder || 'Search...') + '" />';
        html += '</div>';

        html += '</div>'; // toolbar

        // Content area
        html += '<div class="log-viewer-content" id="lv-content">';
        html += '<div class="log-viewer-empty"><i class="codicon codicon-calendar"></i><br/>' + escapeHtml(L.logSelectDate || 'Select a date to view logs') + '</div>';
        html += '</div>';

        // Pagination bar
        html += '<div class="log-viewer-pagination" id="lv-pagination" style="display:none;"></div>';

        html += '</div>'; // panel

        backdrop.innerHTML = html;
        document.body.appendChild(backdrop);

        // Store grouped data for cascading selects
        const lvGrouped = grouped;

        // ── Bind events ──
        const closeViewer = () => backdrop.remove();
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeViewer(); });
        backdrop.querySelector('.log-viewer-close').addEventListener('click', closeViewer);
        const escHandler = (e) => { if (e.key === 'Escape') { closeViewer(); document.removeEventListener('keydown', escHandler); } };
        document.addEventListener('keydown', escHandler);

        const yearSel = backdrop.querySelector('#lv-year');
        const monthSel = backdrop.querySelector('#lv-month');
        const daySel = backdrop.querySelector('#lv-day');
        const statusSel = backdrop.querySelector('#lv-status');
        const keywordInput = backdrop.querySelector('#lv-keyword');

        yearSel.addEventListener('change', () => {
            const y = yearSel.value;
            monthSel.innerHTML = '<option value="">' + escapeHtml(L.logMonth || 'Month') + '</option>';
            daySel.innerHTML = '<option value="">' + escapeHtml(L.logDay || 'Day') + '</option>';
            daySel.disabled = true;
            if (y && lvGrouped[y]) {
                const months = Object.keys(lvGrouped[y]).sort().reverse();
                for (const m of months) {
                    monthSel.innerHTML += '<option value="' + m + '">' + m + '</option>';
                }
                monthSel.disabled = false;
            } else {
                monthSel.disabled = true;
            }
            logViewerState.selectedDate = '';
        });

        monthSel.addEventListener('change', () => {
            const y = yearSel.value;
            const m = monthSel.value;
            daySel.innerHTML = '<option value="">' + escapeHtml(L.logDay || 'Day') + '</option>';
            if (y && m && lvGrouped[y] && lvGrouped[y][m]) {
                const days = lvGrouped[y][m].sort((a, b) => b.day.localeCompare(a.day));
                for (const d of days) {
                    daySel.innerHTML += '<option value="' + d.day + '">' + d.day + ' (' + d.entryCount + ')</option>';
                }
                daySel.disabled = false;
            } else {
                daySel.disabled = true;
            }
            logViewerState.selectedDate = '';
        });

        daySel.addEventListener('change', () => {
            const y = yearSel.value;
            const m = monthSel.value;
            const d = daySel.value;
            if (y && m && d) {
                logViewerState.selectedDate = y + '-' + m + '-' + d;
                logViewerState.page = 1;
                fireLogQuery();
            }
        });

        statusSel.addEventListener('change', () => {
            logViewerState.statusFilter = statusSel.value;
            logViewerState.page = 1;
            if (logViewerState.selectedDate) fireLogQuery();
        });

        let searchTimeout;
        keywordInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                logViewerState.keyword = keywordInput.value.trim();
                logViewerState.page = 1;
                if (logViewerState.selectedDate) fireLogQuery();
            }, 300);
        });

        // Auto-select today if available
        const today = new Date().toISOString().slice(0, 10);
        const [ty, tm, td] = today.split('-');
        if (lvGrouped[ty] && lvGrouped[ty][tm]) {
            const hasToday = lvGrouped[ty][tm].some(f => f.day === td);
            if (hasToday) {
                yearSel.value = ty;
                yearSel.dispatchEvent(new Event('change'));
                setTimeout(() => {
                    monthSel.value = tm;
                    monthSel.dispatchEvent(new Event('change'));
                    setTimeout(() => {
                        daySel.value = td;
                        daySel.dispatchEvent(new Event('change'));
                    }, 10);
                }, 10);
            }
        }
    }

    function fireLogQuery() {
        vscode.postMessage({
            type: 'queryLogs',
            date: logViewerState.selectedDate,
            page: logViewerState.page,
            pageSize: logViewerState.pageSize,
            statusFilter: logViewerState.statusFilter,
            keyword: logViewerState.keyword || undefined
        });
    }

    function renderLogQueryResult(result, date, statusFilter, keyword) {
        logViewerState.result = result;
        const L = window.__proxyLabels || {};
        const content = document.querySelector('#lv-content');
        const pagination = document.querySelector('#lv-pagination');
        if (!content) return;

        if (!result || result.entries.length === 0) {
            content.innerHTML = '<div class="log-viewer-empty"><i class="codicon codicon-search"></i><br/>' + escapeHtml(L.logNoResults || 'No matching logs') + '</div>';
            if (pagination) { pagination.style.display = 'none'; }
            return;
        }

        // Summary
        let html = '<div class="log-viewer-summary">';
        html += '<span>' + escapeHtml(date) + '</span>';
        html += '<span class="log-viewer-summary-count">' + result.total + ' ' + escapeHtml(L.logTotalEntries || 'entries') + '</span>';
        html += '</div>';

        // Log table
        html += '<div class="log-viewer-table">';

        // Header
        html += '<div class="log-viewer-thead">';
        html += '<span class="lv-col-status"></span>';
        html += '<span class="lv-col-time">' + escapeHtml(L.logTime || 'Time') + '</span>';
        html += '<span class="lv-col-format">Format</span>';
        html += '<span class="lv-col-model">Model</span>';
        html += '<span class="lv-col-duration">' + escapeHtml(L.logDuration || 'Duration') + '</span>';
        html += '<span class="lv-col-tokens">Tokens</span>';
        html += '</div>';

        for (let i = 0; i < result.entries.length; i++) {
            const log = result.entries[i];
            const time = new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false });
            const duration = (log.durationMs / 1000).toFixed(2);
            const ok = log.status === 'success';
            html += \`
                <div class="log-viewer-row" data-lv-idx="\${i}">
                    <span class="lv-col-status"><i class="codicon codicon-\${ok ? 'pass-filled' : 'error'}" style="color:\${ok ? '#788c5d' : '#d97757'}"></i></span>
                    <span class="lv-col-time">\${time}</span>
                    <span class="lv-col-format"><span class="proxy-log-format">\${escapeHtml(log.format)}</span></span>
                    <span class="lv-col-model" title="\${escapeHtml(log.model)}">\${escapeHtml(log.model)}</span>
                    <span class="lv-col-duration">\${duration}s</span>
                    <span class="lv-col-tokens">\${log.inputTokens}\u2191 \${log.outputTokens}\u2193</span>
                </div>
            \`;
        }

        html += '</div>';
        content.innerHTML = html;

        // Bind row click
        content.querySelectorAll('.log-viewer-row').forEach(row => {
            row.addEventListener('click', () => {
                const idx = parseInt(row.dataset.lvIdx, 10);
                if (!isNaN(idx) && result.entries[idx]) {
                    showLogDetail(result.entries[idx], L);
                }
            });
        });

        // Pagination
        if (pagination && result.totalPages > 1) {
            pagination.style.display = 'flex';
            let pHtml = '';
            pHtml += '<button class="lv-page-btn" data-page="prev" ' + (result.page <= 1 ? 'disabled' : '') + '><i class="codicon codicon-chevron-left"></i></button>';
            
            // Smart page numbers
            const pages = getPageNumbers(result.page, result.totalPages);
            for (const p of pages) {
                if (p === '...') {
                    pHtml += '<span class="lv-page-ellipsis">\u2026</span>';
                } else {
                    pHtml += '<button class="lv-page-btn' + (p === result.page ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
                }
            }
            
            pHtml += '<button class="lv-page-btn" data-page="next" ' + (result.page >= result.totalPages ? 'disabled' : '') + '><i class="codicon codicon-chevron-right"></i></button>';
            pHtml += '<span class="lv-page-info">' + result.page + ' / ' + result.totalPages + '</span>';
            pagination.innerHTML = pHtml;

            pagination.querySelectorAll('.lv-page-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const p = btn.dataset.page;
                    if (p === 'prev') {
                        logViewerState.page = Math.max(1, logViewerState.page - 1);
                    } else if (p === 'next') {
                        logViewerState.page = Math.min(result.totalPages, logViewerState.page + 1);
                    } else {
                        logViewerState.page = parseInt(p, 10);
                    }
                    fireLogQuery();
                });
            });
        } else if (pagination) {
            pagination.style.display = 'none';
        }
    }

    function getPageNumbers(current, total) {
        if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
        const pages = [];
        pages.push(1);
        if (current > 3) pages.push('...');
        for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
            pages.push(i);
        }
        if (current < total - 2) pages.push('...');
        pages.push(total);
        return pages;
    }

    function showLogDetail(log, L) {
        // Remove any existing detail popup
        const existingPopup = document.querySelector('.proxy-log-detail-backdrop');
        if (existingPopup) existingPopup.remove();

        const ok = log.status === 'success';
        const time = new Date(log.timestamp).toLocaleString();
        const duration = (log.durationMs / 1000).toFixed(2);

        const backdrop = document.createElement('div');
        backdrop.className = 'proxy-log-detail-backdrop';

        let detailHtml = '<div class="proxy-log-detail-panel">';
        detailHtml += '<div class="proxy-log-detail-header">';
        detailHtml += '<span class="proxy-log-detail-title">' + escapeHtml(L.logDetailTitle || 'Log Detail') + '</span>';
        detailHtml += '<button class="proxy-log-detail-close"><i class="codicon codicon-close"></i></button>';
        detailHtml += '</div>';

        detailHtml += '<div class="proxy-log-detail-body">';

        // Meta info
        detailHtml += '<div class="proxy-log-detail-meta">';
        detailHtml += '<div class="proxy-log-detail-row"><span class="proxy-log-detail-label">' + escapeHtml(L.logRequestId || 'Request ID') + '</span><span class="proxy-log-detail-value mono">' + escapeHtml(log.requestId || '—') + '</span></div>';
        detailHtml += '<div class="proxy-log-detail-row"><span class="proxy-log-detail-label">Time</span><span class="proxy-log-detail-value">' + escapeHtml(time) + '</span></div>';
        detailHtml += '<div class="proxy-log-detail-row"><span class="proxy-log-detail-label">Model</span><span class="proxy-log-detail-value">' + escapeHtml(log.model) + '</span></div>';
        detailHtml += '<div class="proxy-log-detail-row"><span class="proxy-log-detail-label">Format</span><span class="proxy-log-detail-value">' + escapeHtml(log.format) + '</span></div>';
        detailHtml += '<div class="proxy-log-detail-row"><span class="proxy-log-detail-label">' + escapeHtml(L.logDuration || 'Duration') + '</span><span class="proxy-log-detail-value">' + duration + 's</span></div>';
        detailHtml += '<div class="proxy-log-detail-row"><span class="proxy-log-detail-label">Tokens</span><span class="proxy-log-detail-value">' + log.inputTokens + ' \u2191 / ' + log.outputTokens + ' \u2193</span></div>';
        detailHtml += '<div class="proxy-log-detail-row"><span class="proxy-log-detail-label">Status</span><span class="proxy-log-detail-value" style="color:' + (ok ? '#788c5d' : '#d97757') + '">' + (ok ? '\u2713 success' : '\u2717 error') + '</span></div>';
        detailHtml += '</div>';

        // Error
        if (log.error) {
            detailHtml += '<div class="proxy-log-detail-section">';
            detailHtml += '<div class="proxy-log-detail-section-title">' + escapeHtml(L.logError || 'Error') + '</div>';
            detailHtml += '<pre class="proxy-log-detail-pre error">' + escapeHtml(log.error) + '</pre>';
            detailHtml += '</div>';
        }

        // Input
        if (log.inputContent) {
            detailHtml += '<div class="proxy-log-detail-section">';
            detailHtml += '<div class="proxy-log-detail-section-title">' + escapeHtml(L.logInput || 'Input') + '</div>';
            let inputDisplay = log.inputContent;
            try { inputDisplay = JSON.stringify(JSON.parse(log.inputContent), null, 2); } catch {}
            detailHtml += '<pre class="proxy-log-detail-pre">' + escapeHtml(inputDisplay) + '</pre>';
            detailHtml += '</div>';
        }

        // Output
        if (log.outputContent) {
            detailHtml += '<div class="proxy-log-detail-section">';
            detailHtml += '<div class="proxy-log-detail-section-title">' + escapeHtml(L.logOutput || 'Output') + '</div>';
            detailHtml += '<pre class="proxy-log-detail-pre">' + escapeHtml(log.outputContent) + '</pre>';
            detailHtml += '</div>';
        }

        detailHtml += '</div>'; // body
        detailHtml += '</div>'; // panel

        backdrop.innerHTML = detailHtml;
        document.body.appendChild(backdrop);

        // Close handlers
        const closePopup = () => backdrop.remove();
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closePopup(); });
        backdrop.querySelector('.proxy-log-detail-close').addEventListener('click', closePopup);
        const escHandler = (e) => { if (e.key === 'Escape') { closePopup(); document.removeEventListener('keydown', escHandler); } };
        document.addEventListener('keydown', escHandler);
    }

    function makeProxyStatCard(iconId, color, value, label) {
        return \`
            <div class="proxy-stat-card">
                <div class="proxy-stat-icon" style="color:\${color};background:\${color}22;">
                    <i class="codicon codicon-\${iconId}"></i>
                </div>
                <div class="proxy-stat-info">
                    <div class="proxy-stat-value">\${value}</div>
                    <div class="proxy-stat-label">\${label}</div>
                </div>
            </div>
        \`;
    }

    // ==================== Section Rendering ====================
    function renderSection(section, tree, toolbarActions, tags, activeTags) {
        currentTreeData = tree;
        renderToolbar(section, toolbarActions);
        renderTree(tree, tags, activeTags);
    }

    function renderToolbar(section, actions) {
        const toolbar = document.querySelector('.toolbar');
        const titles = {
            dashboard: 'DASHBOARD',
            launcher: 'LAUNCHER',
            skills: 'SKILLS',
            commands: 'COMMANDS',
            gitshare: 'GIT SYNC',
            modelProxy: 'MODEL PROXY',
            settings: 'SETTINGS'
        };
        
        let html = \`<span class="toolbar-title">\${titles[section] || section.toUpperCase()}</span>\`;
        
        if (actions) {
            for (const action of actions) {
                html += \`
                    <button class="toolbar-btn" title="\${action.label}" data-command="\${action.command}" data-action-type="\${action.action || 'command'}" data-action-id="\${action.id}">
                        <i class="codicon codicon-\${action.iconId}"></i>
                    </button>
                \`;
            }
        }
        
        toolbar.innerHTML = html;
        
        toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const actionType = btn.dataset.actionType;
                if (actionType === 'overlay') {
                    vscode.postMessage({
                        type: 'toolbarAction',
                        actionId: btn.dataset.actionId,
                        section: currentSection
                    });
                } else {
                    vscode.postMessage({ type: 'executeCommand', command: btn.dataset.command });
                }
            });
        });
    }

    // ==================== Tree Rendering ====================
    function renderTree(nodes, tags, activeTags) {
        const body = document.querySelector('.content-body');
        
        if (!nodes || nodes.length === 0) {
            body.innerHTML = '';
            if (tags && tags.length > 0) {
                body.appendChild(renderTagChips(tags, activeTags || []));
            }
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<i class="codicon codicon-info"></i><p>No data</p>';
            body.appendChild(empty);
            return;
        }
        
        body.innerHTML = '';

        // Tag chips bar (inline filter)
        if (tags && tags.length > 0) {
            body.appendChild(renderTagChips(tags, activeTags || []));
        }

        const container = document.createElement('div');
        container.className = 'tree-container';
        
        for (const node of nodes) {
            container.appendChild(createTreeNode(node, 0));
        }
        
        body.appendChild(container);
    }

    function renderTagChips(tags, activeTags) {
        const bar = document.createElement('div');
        bar.className = 'tag-chips-bar';

        const label = document.createElement('span');
        label.className = 'tag-chips-label';
        label.innerHTML = '<i class="codicon codicon-tag"></i>';
        bar.appendChild(label);

        for (const tag of tags) {
            const chip = document.createElement('button');
            chip.className = 'tag-chip' + (activeTags.includes(tag) ? ' active' : '');
            chip.textContent = tag;
            chip.addEventListener('click', () => {
                vscode.postMessage({ type: 'toggleTag', section: currentSection, tag });
            });
            bar.appendChild(chip);
        }

        if (activeTags.length > 0) {
            const clearBtn = document.createElement('button');
            clearBtn.className = 'tag-chip-clear';
            clearBtn.innerHTML = '<i class="codicon codicon-close"></i> Clear';
            clearBtn.addEventListener('click', () => {
                vscode.postMessage({ type: 'clearFilter', section: currentSection });
            });
            bar.appendChild(clearBtn);
        }

        return bar;
    }

    function createTreeNode(node, depth) {
        const el = document.createElement('div');
        el.className = 'tree-node';
        el.dataset.nodeId = node.id;
        
        // Row
        const row = document.createElement('div');
        row.className = 'tree-row';
        if (node.id === selectedNodeId) row.classList.add('selected');
        
        // Indent
        const indent = document.createElement('span');
        indent.className = 'tree-indent';
        indent.style.width = (depth * 12 + 4) + 'px';
        row.appendChild(indent);
        
        // Chevron
        const chevron = document.createElement('span');
        const hasChildren = node.collapsible || (node.children && node.children.length > 0);
        const isExpanded = node.expanded || expandedNodes.has(node.id);
        chevron.className = 'tree-chevron' + (hasChildren ? (isExpanded ? ' expanded' : '') : ' hidden');
        chevron.innerHTML = '<i class="codicon codicon-chevron-right"></i>';
        row.appendChild(chevron);
        
        // Icon
        if (node.iconId) {
            const icon = document.createElement('span');
            icon.className = 'tree-icon';
            if (node.iconColor) icon.style.color = node.iconColor;
            icon.innerHTML = \`<i class="codicon codicon-\${node.iconId}"></i>\`;
            row.appendChild(icon);
        }
        
        // Label
        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = node.label;
        if (node.tooltip) label.title = node.tooltip;
        row.appendChild(label);
        
        // Description
        if (node.description) {
            const desc = document.createElement('span');
            desc.className = 'tree-description';
            desc.textContent = node.description;
            row.appendChild(desc);
        }
        
        // Inline Actions
        if (node.inlineActions && node.inlineActions.length > 0) {
            const actions = document.createElement('span');
            actions.className = 'tree-actions';
            for (const action of node.inlineActions) {
                const btn = document.createElement('button');
                btn.className = 'tree-action-btn' + (action.danger ? ' danger' : '');
                btn.title = action.label;
                btn.innerHTML = \`<i class="codicon codicon-\${action.iconId}"></i>\`;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    vscode.postMessage({
                        type: 'treeItemAction',
                        nodeId: node.id,
                        actionId: action.id,
                        section: currentSection
                    });
                });
                actions.appendChild(btn);
            }
            row.appendChild(actions);
        }
        
        // Row click
        row.addEventListener('click', (e) => {
            if (e.target.closest('.tree-action-btn')) return;
            
            // Toggle expand
            if (hasChildren) {
                const isNowExpanded = expandedNodes.has(node.id);
                if (isNowExpanded) {
                    expandedNodes.delete(node.id);
                } else {
                    expandedNodes.add(node.id);
                }
                chevron.className = 'tree-chevron' + (expandedNodes.has(node.id) ? ' expanded' : '');
                const childrenEl = el.querySelector(':scope > .tree-children');
                if (childrenEl) {
                    childrenEl.classList.toggle('collapsed', !expandedNodes.has(node.id));
                }
                saveState();
            }
            
            // Select
            document.querySelectorAll('.tree-row.selected').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
            selectedNodeId = node.id;
            
            // Command
            if (node.command) {
                vscode.postMessage({
                    type: 'treeItemClick',
                    nodeId: node.id,
                    section: currentSection
                });
            }
        });
        
        // Right-click context menu
        if (node.contextActions && node.contextActions.length > 0) {
            row.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showContextMenu(e.clientX, e.clientY, node);
            });
        }
        
        el.appendChild(row);
        
        // Children
        if (node.children && node.children.length > 0) {
            const childrenEl = document.createElement('div');
            childrenEl.className = 'tree-children' + (isExpanded ? '' : ' collapsed');
            for (const child of node.children) {
                childrenEl.appendChild(createTreeNode(child, depth + 1));
            }
            el.appendChild(childrenEl);
        }
        
        return el;
    }

    // ==================== Context Menu ====================
    function showContextMenu(x, y, node) {
        hideContextMenu();
        
        const overlay = document.createElement('div');
        overlay.className = 'context-menu-overlay';
        overlay.addEventListener('click', hideContextMenu);
        overlay.addEventListener('contextmenu', (e) => { e.preventDefault(); hideContextMenu(); });
        document.body.appendChild(overlay);
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        for (const action of node.contextActions) {
            const item = document.createElement('div');
            item.className = 'context-menu-item' + (action.danger ? ' danger' : '');
            item.innerHTML = \`
                <i class="codicon codicon-\${action.iconId || 'circle-outline'}"></i>
                <span>\${action.label}</span>
            \`;
            item.addEventListener('click', () => {
                hideContextMenu();
                vscode.postMessage({
                    type: 'treeItemAction',
                    nodeId: node.id,
                    actionId: action.id,
                    section: currentSection
                });
            });
            menu.appendChild(item);
        }
        
        document.body.appendChild(menu);
        
        // Ensure menu stays within viewport
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + 'px';
        if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 4) + 'px';
        
        contextMenuTarget = { overlay, menu };
    }

    function hideContextMenu() {
        if (contextMenuTarget) {
            contextMenuTarget.overlay.remove();
            contextMenuTarget.menu.remove();
            contextMenuTarget = null;
        }
    }

    function setupContextMenuDismiss() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hideContextMenu();
        });
    }

    // ==================== Drag & Drop ====================
    function setupDragDrop() {
        const body = document.querySelector('.content-body');
        
        body.addEventListener('dragover', (e) => {
            if (currentSection === 'skills' || currentSection === 'commands') {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                body.classList.add('drop-zone-active');
            }
        });
        
        body.addEventListener('dragleave', () => {
            body.classList.remove('drop-zone-active');
        });
        
        body.addEventListener('drop', (e) => {
            e.preventDefault();
            body.classList.remove('drop-zone-active');
            
            if (currentSection !== 'skills' && currentSection !== 'commands') return;
            
            const files = e.dataTransfer.files;
            const uris = [];
            
            if (files && files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    if (files[i].path) uris.push(files[i].path);
                }
            }
            
            // Also try URI list
            const uriList = e.dataTransfer.getData('text/uri-list');
            if (uriList) {
                uriList.split('\\n').filter(l => l.trim()).forEach(l => uris.push(l.trim()));
            }
            
            if (uris.length > 0) {
                vscode.postMessage({ type: 'dropFiles', uris, section: currentSection });
            }
        });
    }

    // ==================== Overlay Panel ====================
    let activeOverlay = null;

    function showOverlayPanel(data) {
        hideOverlayPanel();

        const backdrop = document.createElement('div');
        backdrop.className = 'overlay-backdrop';

        const panel = document.createElement('div');
        panel.className = 'overlay-panel';

        // Header
        const header = document.createElement('div');
        header.className = 'overlay-header';
        header.innerHTML = \`
            <div class="overlay-title">\${escapeHtml(data.title)}</div>
            <button class="overlay-close" title="Close"><i class="codicon codicon-close"></i></button>
        \`;
        panel.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'overlay-body';

        const fieldElements = {};

        for (const field of data.fields) {
            const fieldEl = document.createElement('div');
            fieldEl.className = 'overlay-field';

            // Label
            const labelEl = document.createElement('label');
            labelEl.className = 'overlay-field-label';
            labelEl.textContent = field.label;
            if (field.required) {
                const req = document.createElement('span');
                req.className = 'required';
                req.textContent = '*';
                labelEl.appendChild(req);
            }
            fieldEl.appendChild(labelEl);

            if (field.kind === 'select') {
                const select = document.createElement('select');
                select.className = 'overlay-field-input';
                select.dataset.key = field.key;
                for (const opt of (field.options || [])) {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    if (opt.value === field.value) option.selected = true;
                    select.appendChild(option);
                }
                fieldEl.appendChild(select);
                fieldElements[field.key] = { el: select, kind: 'select' };
            } else if (field.kind === 'textarea') {
                const ta = document.createElement('textarea');
                ta.className = 'overlay-field-input textarea';
                ta.dataset.key = field.key;
                ta.placeholder = field.placeholder || '';
                ta.value = field.value || '';
                fieldEl.appendChild(ta);
                fieldElements[field.key] = { el: ta, kind: 'textarea' };
            } else if (field.kind === 'multi-select') {
                const container = document.createElement('div');
                container.className = 'overlay-multi-select';
                container.dataset.key = field.key;
                const selectedValues = (field.value || '').split(',').filter(Boolean);
                for (const opt of (field.options || [])) {
                    const tag = document.createElement('label');
                    tag.className = 'overlay-check-tag' + (selectedValues.includes(opt.value) ? ' checked' : '');
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.value = opt.value;
                    cb.checked = selectedValues.includes(opt.value);
                    cb.addEventListener('change', () => {
                        tag.classList.toggle('checked', cb.checked);
                    });
                    tag.appendChild(cb);
                    tag.appendChild(document.createTextNode(opt.label));
                    container.appendChild(tag);
                }
                fieldEl.appendChild(container);
                fieldElements[field.key] = { el: container, kind: 'multi-select' };
            } else if (field.kind === 'tags') {
                const container = document.createElement('div');
                container.className = 'overlay-tags-container';
                container.dataset.key = field.key;
                const initialTags = (field.value || '').split(',').filter(Boolean);
                for (const t of initialTags) {
                    container.appendChild(createTagItem(t, container));
                }
                const input = document.createElement('input');
                input.className = 'overlay-tags-input';
                input.placeholder = field.placeholder || 'Type and press Enter...';
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const val = input.value.trim().toLowerCase().replace(/\\s+/g, '-');
                        if (val && !getTagsFromContainer(container).includes(val)) {
                            container.insertBefore(createTagItem(val, container), input);
                        }
                        input.value = '';
                    } else if (e.key === 'Backspace' && !input.value) {
                        const tags = container.querySelectorAll('.overlay-tag-item');
                        if (tags.length > 0) tags[tags.length - 1].remove();
                    }
                });
                container.appendChild(input);
                container.addEventListener('click', () => input.focus());
                // If options are provided, show them as suggestion chips
                if (field.options && field.options.length > 0) {
                    const suggestions = document.createElement('div');
                    suggestions.className = 'overlay-multi-select';
                    suggestions.style.marginTop = '4px';
                    for (const opt of field.options) {
                        const chip = document.createElement('label');
                        chip.className = 'overlay-check-tag';
                        chip.textContent = opt.label;
                        chip.style.cursor = 'pointer';
                        chip.addEventListener('click', () => {
                            const val = opt.value;
                            if (!getTagsFromContainer(container).includes(val)) {
                                container.insertBefore(createTagItem(val, container), input);
                            }
                        });
                        suggestions.appendChild(chip);
                    }
                    fieldEl.appendChild(container);
                    fieldEl.appendChild(suggestions);
                } else {
                    fieldEl.appendChild(container);
                }
                fieldElements[field.key] = { el: container, kind: 'tags' };
            } else {
                const inp = document.createElement('input');
                inp.className = 'overlay-field-input';
                inp.type = 'text';
                inp.dataset.key = field.key;
                inp.placeholder = field.placeholder || '';
                inp.value = field.value || '';
                fieldEl.appendChild(inp);
                fieldElements[field.key] = { el: inp, kind: 'text' };
            }

            // Hint
            if (field.description) {
                const hint = document.createElement('div');
                hint.className = 'overlay-field-hint';
                hint.textContent = field.description;
                fieldEl.appendChild(hint);
            }

            // Error
            const errEl = document.createElement('div');
            errEl.className = 'overlay-field-error';
            errEl.dataset.key = field.key;
            fieldEl.appendChild(errEl);

            body.appendChild(fieldEl);
        }

        panel.appendChild(body);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'overlay-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'overlay-btn overlay-btn-secondary';
        cancelBtn.textContent = data.cancelLabel || 'Cancel';

        const submitBtn = document.createElement('button');
        submitBtn.className = 'overlay-btn overlay-btn-primary';
        submitBtn.textContent = data.submitLabel || 'OK';

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);
        panel.appendChild(footer);

        backdrop.appendChild(panel);
        document.body.appendChild(backdrop);

        // Focus first input
        setTimeout(() => {
            const firstInput = panel.querySelector('input:not([type="checkbox"]), textarea, select');
            if (firstInput) firstInput.focus();
        }, 50);

        // Actions
        const close = () => {
            hideOverlayPanel();
            vscode.postMessage({ type: 'overlayCancel', overlayId: data.overlayId });
        };

        header.querySelector('.overlay-close').addEventListener('click', close);
        cancelBtn.addEventListener('click', close);
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

        submitBtn.addEventListener('click', () => {
            // Validate required
            let valid = true;
            for (const field of data.fields) {
                const fe = fieldElements[field.key];
                const errEl = panel.querySelector('.overlay-field-error[data-key="' + field.key + '"]');
                const val = getFieldValue(fe);
                if (field.required && !val) {
                    if (errEl) { errEl.textContent = field.label + ' is required'; errEl.classList.add('visible'); }
                    valid = false;
                } else {
                    if (errEl) { errEl.classList.remove('visible'); }
                }
            }
            if (!valid) return;

            const values = {};
            for (const field of data.fields) {
                values[field.key] = getFieldValue(fieldElements[field.key]);
            }
            hideOverlayPanel();
            vscode.postMessage({ type: 'overlaySubmit', overlayId: data.overlayId, values });
        });

        // Escape
        const escHandler = (e) => {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
        };
        document.addEventListener('keydown', escHandler);

        // Enter key submits (unless in textarea)
        panel.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !e.target.classList.contains('overlay-tags-input')) {
                e.preventDefault();
                submitBtn.click();
            }
        });

        activeOverlay = { backdrop, escHandler };
    }

    function hideOverlayPanel() {
        if (activeOverlay) {
            activeOverlay.backdrop.remove();
            document.removeEventListener('keydown', activeOverlay.escHandler);
            activeOverlay = null;
        }
    }

    function getFieldValue(fe) {
        if (!fe) return '';
        if (fe.kind === 'multi-select') {
            const checked = fe.el.querySelectorAll('input[type="checkbox"]:checked');
            return Array.from(checked).map(cb => cb.value).join(',');
        }
        if (fe.kind === 'tags') {
            return getTagsFromContainer(fe.el).join(',');
        }
        return fe.el.value || '';
    }

    function createTagItem(text, container) {
        const tag = document.createElement('span');
        tag.className = 'overlay-tag-item';
        tag.textContent = text;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'overlay-tag-remove';
        removeBtn.innerHTML = '<i class="codicon codicon-close"></i>';
        removeBtn.addEventListener('click', (e) => { e.stopPropagation(); tag.remove(); });
        tag.appendChild(removeBtn);
        return tag;
    }

    function getTagsFromContainer(container) {
        return Array.from(container.querySelectorAll('.overlay-tag-item')).map(el => el.textContent.replace(/\\s*×?\\s*$/, '').trim());
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==================== Confirm Dialog ====================
    let activeConfirm = null;

    function showConfirmDialog(data) {
        hideConfirmDialog();

        const backdrop = document.createElement('div');
        backdrop.className = 'overlay-backdrop';

        const panel = document.createElement('div');
        panel.className = 'confirm-panel';

        panel.innerHTML = \`
            <div class="confirm-header">\${escapeHtml(data.title)}</div>
            <div class="confirm-body">\${escapeHtml(data.message)}</div>
            <div class="confirm-footer">
                <button class="overlay-btn overlay-btn-secondary" data-role="cancel">\${escapeHtml(data.cancelLabel || 'Cancel')}</button>
                <button class="overlay-btn \${data.danger ? 'overlay-btn-danger' : 'overlay-btn-primary'}" data-role="confirm">\${escapeHtml(data.confirmLabel || 'OK')}</button>
            </div>
        \`;

        backdrop.appendChild(panel);
        document.body.appendChild(backdrop);

        const send = (confirmed) => {
            hideConfirmDialog();
            vscode.postMessage({ type: 'confirmResult', confirmId: data.confirmId, confirmed });
        };

        panel.querySelector('[data-role="cancel"]').addEventListener('click', () => send(false));
        panel.querySelector('[data-role="confirm"]').addEventListener('click', () => send(true));
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) send(false); });

        const escHandler = (e) => {
            if (e.key === 'Escape') { send(false); document.removeEventListener('keydown', escHandler); }
        };
        document.addEventListener('keydown', escHandler);

        // Focus confirm button
        setTimeout(() => {
            panel.querySelector('[data-role="confirm"]').focus();
        }, 50);

        activeConfirm = { backdrop, escHandler };
    }

    function hideConfirmDialog() {
        if (activeConfirm) {
            activeConfirm.backdrop.remove();
            document.removeEventListener('keydown', activeConfirm.escHandler);
            activeConfirm = null;
        }
    }

    // ==================== State Persistence ====================
    function saveState() {
        vscode.setState({
            navExpanded,
            currentSection,
            expandedNodes: Array.from(expandedNodes)
        });
    }

    // ==================== Bootstrap ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
`;
}
