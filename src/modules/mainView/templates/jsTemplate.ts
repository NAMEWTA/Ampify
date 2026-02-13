/**
 * JS 妯℃澘
 * Webview 瀹㈡埛绔€昏緫
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
    let currentCards = [];
    let currentTags = [];
    let currentActiveTags = [];
    let currentToolbarActions = [];
    let contextMenuTarget = null;
    let activeCardId = '';
    let fileTreeDialog = null;
    let dropOverlay = null;
    let dragDepth = 0;
    let viewModes = { skills: 'cards', commands: 'cards' };
    let compactListMode = false;
    let dashboardData = null;
    let accountCenterData = null;
    let aiTaggingProgressMap = { skills: null, commands: null };
    let aiTaggingDismissedMap = { skills: false, commands: false };
    let accountCenterPollTimer = null;
    const ACCOUNT_CENTER_POLL_INTERVAL_MS = 5000;
    const I18N = window.__ampifyI18n || {};

    function t(key, fallback) {
        const value = I18N[key];
        return typeof value === 'string' && value.trim() ? value : fallback;
    }

    function getSectionTitle(section) {
        const nav = document.querySelector('.nav-item[data-section="' + section + '"]');
        return (nav && nav.getAttribute('title')) || section;
    }

    // Restore persisted state
    const persistedState = vscode.getState();
    if (persistedState) {
        navExpanded = persistedState.navExpanded || false;
        currentSection = persistedState.currentSection || 'dashboard';
        expandedNodes = new Set(persistedState.expandedNodes || []);
        if (persistedState.viewModes) {
            viewModes = Object.assign(viewModes, persistedState.viewModes);
        }
    }

    // ==================== Init ====================
    function init() {
        setupNav();
        setupNavToggle();
        setupContextMenuDismiss();
        setupDragDrop();
        setupProxyActions();
        setupAccountCenterPolling();
        window.addEventListener('resize', () => {
            if (!compactListMode) { return; }
            const container = document.querySelector('.tree-container');
            if (container) {
                applyCompactLayout(container);
            }
        });

        // Apply persisted nav state
        const navRail = document.querySelector('.nav-rail');
        if (navExpanded) navRail.classList.add('expanded');

        if (!document.querySelector('.nav-item[data-section="' + currentSection + '"]')) {
            currentSection = 'dashboard';
        }

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

    function setupAccountCenterPolling() {
        if (accountCenterPollTimer) {
            clearInterval(accountCenterPollTimer);
        }
        accountCenterPollTimer = setInterval(() => {
            if (currentSection !== 'accountCenter') {
                return;
            }
            const tab = accountCenterData && accountCenterData.activeTab;
            if (tab !== 'sessions') {
                return;
            }
            vscode.postMessage({ type: 'accountCenterAction', tab: 'sessions', actionId: 'refreshSessions' });
        }, ACCOUNT_CENTER_POLL_INTERVAL_MS);
    }

    // ==================== Message Handling ====================
    window.addEventListener('message', event => {
        const msg = event.data;
        switch (msg.type) {
            case 'updateSection':
                renderSection(msg.section, msg.tree, msg.toolbar, msg.tags, msg.activeTags, msg.cards);
                break;
            case 'updateAccountCenter':
                accountCenterData = msg.data;
                if (currentSection === 'accountCenter') {
                    renderToolbar('accountCenter', [], msg.data && msg.data.title);
                    renderAccountCenter(msg.data);
                }
                break;
            case 'updateDashboard':
                dashboardData = msg.data;
                if (currentSection === 'dashboard') {
                    renderDashboard(msg.data);
                }
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
                if (currentSection === 'dashboard' && dashboardData) {
                    renderDashboard(dashboardData);
                } else if (currentSection === 'accountCenter' && accountCenterData) {
                    renderToolbar('accountCenter', [], accountCenterData.title);
                    renderAccountCenter(accountCenterData);
                }
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
            case 'updateAiTaggingProgress':
                if (msg.data && (msg.data.target === 'skills' || msg.data.target === 'commands')) {
                    aiTaggingProgressMap[msg.data.target] = msg.data;
                    if (msg.data.running) {
                        aiTaggingDismissedMap[msg.data.target] = false;
                    }
                    if (currentSection === msg.data.target) {
                        renderAiTaggingProgressPanel(msg.data.target);
                    }
                }
                break;
        }
    });

    // ==================== Dashboard Rendering ====================
    function renderDashboard(data) {
        const body = document.querySelector('.content-body');
        const toolbar = document.querySelector('.toolbar');
        const L = data.labels || {};

        hideDropOverlay();
        toolbar.innerHTML = '<span class="toolbar-title">' + escapeHtml(getSectionTitle('dashboard')) + '</span>';

        let html = '<div class="dashboard-view"><div class="dashboard-content">';

        // Module Health
        if (data.moduleHealth && data.moduleHealth.length > 0) {
            html += '<div class="section-block">';
            html += \`<h3 class="section-title">\${escapeHtml(L.moduleHealth || 'Module Status')}</h3>\`;
            html += '<div class="health-bar">';
            for (const mod of data.moduleHealth) {
                html += \`
                    <button class="health-pill" data-module-id="\${mod.moduleId}" title="\${escapeHtml(mod.detail || '')}">
                        <span class="health-dot health-\${mod.status}"></span>
                        <i class="codicon codicon-\${mod.iconId}" style="color:\${mod.color};"></i>
                        <span class="health-label">\${escapeHtml(mod.label)}</span>
                    </button>
                \`;
            }
            html += '</div></div>';
        }

        // Stats Grid
        if (data.stats && data.stats.length > 0) {
            html += '<div class="section-block">';
            html += '<div class="stats-grid">';
            for (const stat of data.stats) {
                const color = stat.color || '#d97757';
                const clickable = stat.targetSection ? ' clickable' : '';
                const targetAttr = stat.targetSection ? \` data-target-section="\${stat.targetSection}"\` : '';
                html += \`
                    <button class="stat-card\${clickable}"\${targetAttr}>
                        <div class="stat-icon" style="color:\${color}; background:\${color}22;">
                            <i class="codicon codicon-\${stat.iconId}"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value">\${escapeHtml(String(stat.value))}</span>
                            <span class="stat-label">\${escapeHtml(stat.label)}</span>
                        </div>
                    </button>
                \`;
            }
            html += '</div></div>';
        }

        // Next Up
        const hasNextUp = !!(data.launcher || data.opencode);
        if (hasNextUp) {
            html += '<div class="section-block">';
            html += \`<h3 class="section-title">\${escapeHtml(L.nextUp || 'Next Up')}</h3>\`;
            html += '<div class="next-up-grid">';
            if (data.launcher) {
                html += \`
                    <div class="next-up-card">
                        <div class="next-up-header">
                            <i class="codicon codicon-rocket"></i>
                            <span class="next-up-module">\${escapeHtml(L.launcher || 'Launcher')}</span>
                        </div>
                        <div class="next-up-body">
                            \${data.launcher.lastLabel ? \`
                                <div class="next-up-info">
                                    <span class="next-up-label">\${escapeHtml(L.activeAccount || 'Active')}</span>
                                    <span class="next-up-value">\${escapeHtml(data.launcher.lastLabel)}</span>
                                </div>
                            \` : ''}
                            \${data.launcher.nextLabel ? \`
                                <div class="next-up-info">
                                    <span class="next-up-label">\${escapeHtml(L.nextAccount || 'Next')}</span>
                                    <span class="next-up-value">\${escapeHtml(data.launcher.nextLabel)}</span>
                                </div>
                            \` : ''}
                            \${data.launcher.lastAt ? \`
                                <div class="next-up-info">
                                    <span class="next-up-label">\${escapeHtml(L.lastSwitched || 'Last Switched')}</span>
                                    <span class="next-up-value">\${escapeHtml(formatLastSwitched(data.launcher.lastLabel, data.launcher.lastAt))}</span>
                                </div>
                            \` : ''}
                        </div>
                        <div class="next-up-actions">
                            <button class="next-up-btn" data-command="ampify.launcher.switchNext">
                                <i class="codicon codicon-arrow-swap"></i>
                                \${escapeHtml(L.switchNow || 'Switch Now')}
                            </button>
                        </div>
                    </div>
                \`;
            }
            if (data.opencode) {
                html += \`
                    <div class="next-up-card">
                        <div class="next-up-header">
                            <i class="codicon codicon-key"></i>
                            <span class="next-up-module">\${escapeHtml(L.opencode || 'OpenCode')}</span>
                        </div>
                        <div class="next-up-body">
                            \${data.opencode.lastLabel ? \`
                                <div class="next-up-info">
                                    <span class="next-up-label">\${escapeHtml(L.activeAccount || 'Active')}</span>
                                    <span class="next-up-value">\${escapeHtml(data.opencode.lastLabel)}</span>
                                </div>
                            \` : ''}
                            \${data.opencode.nextLabel ? \`
                                <div class="next-up-info">
                                    <span class="next-up-label">\${escapeHtml(L.nextAccount || 'Next')}</span>
                                    <span class="next-up-value">\${escapeHtml(data.opencode.nextLabel)}</span>
                                </div>
                            \` : ''}
                            \${data.opencode.lastAt ? \`
                                <div class="next-up-info">
                                    <span class="next-up-label">\${escapeHtml(L.lastSwitched || 'Last Switched')}</span>
                                    <span class="next-up-value">\${escapeHtml(formatLastSwitched(data.opencode.lastLabel, data.opencode.lastAt))}</span>
                                </div>
                            \` : ''}
                        </div>
                        <div class="next-up-actions">
                            <button class="next-up-btn" data-command="ampify.opencodeAuth.switchNext">
                                <i class="codicon codicon-arrow-swap"></i>
                                \${escapeHtml(L.switchNow || 'Switch Now')}
                            </button>
                        </div>
                    </div>
                \`;
            }
            html += '</div></div>';
        }

        // Git Info Bar
        if (data.gitInfo && data.gitInfo.initialized) {
            const git = data.gitInfo;
            html += '<div class="section-block">';
            html += \`<h3 class="section-title">\${escapeHtml(L.gitInfo || 'Git Share')}</h3>\`;
            html += \`<div class="git-info-bar \${git.hasChanges ? 'git-has-changes' : ''}">\`;
            html += '<div class="git-info-left">';
            html += \`<span class="git-branch"><i class="codicon codicon-git-branch"></i>\${escapeHtml(git.branch || 'main')}</span>\`;
            if (git.remoteUrl) {
                html += \`<span class="git-remote" title="\${escapeHtml(git.remoteUrl)}"><i class="codicon codicon-remote"></i>\${escapeHtml(truncateUrl(git.remoteUrl))}</span>\`;
            }
            if (git.changedFileCount > 0) {
                html += \`<span class="git-badge"><i class="codicon codicon-diff"></i>\${git.changedFileCount}</span>\`;
            }
            if (git.unpushedCount > 0) {
                html += \`<span class="git-badge git-badge-warn"><i class="codicon codicon-cloud-upload"></i>\${git.unpushedCount}</span>\`;
            }
            html += '</div>';
            html += \`
                <div class="git-info-actions">
                    <button class="icon-btn" title="\${escapeHtml(L.gitSync || 'Sync')}" data-command="ampify.gitShare.sync"><i class="codicon codicon-sync"></i></button>
                    <button class="icon-btn" title="\${escapeHtml(L.gitPull || 'Pull')}" data-command="ampify.gitShare.pull"><i class="codicon codicon-cloud-download"></i></button>
                    <button class="icon-btn" title="\${escapeHtml(L.gitPush || 'Push')}" data-command="ampify.gitShare.push"><i class="codicon codicon-cloud-upload"></i></button>
                </div>
            \`;
            html += '</div></div>';
        }

        // Model Proxy Mini Panel
        if (data.proxyInfo && data.proxyInfo.running) {
            const proxy = data.proxyInfo;
            html += '<div class="section-block">';
            html += \`<h3 class="section-title">\${escapeHtml(L.proxyPanel || 'Model Proxy')}</h3>\`;
            html += \`
                <div class="proxy-mini-panel">
                    <div class="proxy-mini-status">
                        <span class="health-dot health-active"></span>
                        <span>\${escapeHtml(L.proxyRunning || 'Running')} :\${proxy.port}</span>
                    </div>
                    <div class="proxy-mini-stats">
                        <span class="proxy-mini-stat"><i class="codicon codicon-pulse"></i>\${proxy.todayRequests}</span>
                        <span class="proxy-mini-stat"><i class="codicon codicon-symbol-key"></i>\${proxy.todayTokens}</span>
                        \${proxy.todayErrors > 0 ? \`<span class="proxy-mini-stat" style="color:#f48771"><i class="codicon codicon-warning"></i>\${proxy.todayErrors}</span>\` : ''}
                    </div>
                    <div class="proxy-mini-actions">
                        <button class="icon-btn" title="\${escapeHtml(L.copyBaseUrl || 'Copy Base URL')}" data-command="ampify.modelProxy.copyBaseUrl"><i class="codicon codicon-copy"></i></button>
                        <button class="text-link" data-section-switch="modelProxy">\${escapeHtml(L.viewDetail || 'Detail')} -></button>
                    </div>
                </div>
            \`;
            html += '</div>';
        }

        // Quick Actions
        if (data.quickActions && data.quickActions.length > 0) {
            html += '<div class="section-block">';
            html += \`<h3 class="section-title">\${escapeHtml(L.quickActions || 'Quick Actions')}</h3>\`;
            html += '<div class="quick-action-grid">';
            for (const action of data.quickActions) {
                const actionType = action.action || 'command';
                const section = action.section || '';
                const actionId = action.actionId || action.id;
                html += \`
                    <button class="quick-action-btn" data-command="\${action.command || ''}" data-action-type="\${actionType}" data-action-id="\${actionId}" data-section="\${section}">
                        <i class="codicon codicon-\${action.iconId}"></i>
                        <span>\${escapeHtml(action.label)}</span>
                    </button>
                \`;
            }
            html += '</div></div>';
        }

        // Recent Logs
        html += '<div class="section-block">';
        html += \`<h3 class="section-title">\${escapeHtml(L.recentLogs || 'Recent Logs')}</h3>\`;
        if (data.recentLogs && data.recentLogs.length > 0) {
            html += '<div class="recent-logs-table">';
            html += \`
                <div class="log-row log-header">
                    <span class="log-col log-col-time">\${escapeHtml(L.logTime || 'Time')}</span>
                    <span class="log-col log-col-model">Model</span>
                    <span class="log-col log-col-status">Status</span>
                    <span class="log-col log-col-duration">ms</span>
                    <span class="log-col log-col-tokens">Tokens</span>
                </div>
            \`;
            for (const log of data.recentLogs) {
                html += \`
                    <div class="log-row">
                        <span class="log-col log-col-time">\${escapeHtml(formatLogTime(log.timestamp))}</span>
                        <span class="log-col log-col-model" title="\${escapeHtml(log.model)}">\${escapeHtml(truncateModel(log.model))}</span>
                        <span class="log-col log-col-status">
                            <span class="log-status-dot \${isSuccessStatus(log.status) ? 'log-status-ok' : 'log-status-err'}"></span>
                        </span>
                        <span class="log-col log-col-duration">\${log.durationMs}</span>
                        <span class="log-col log-col-tokens">\${log.inputTokens + log.outputTokens}</span>
                    </div>
                \`;
            }
            html += \`<button class="log-view-all" data-view-logs="true">\${escapeHtml(L.viewAllLogs || 'View All Logs')} -></button>\`;
            html += '</div>';
        } else {
            html += \`
                <div class="recent-logs-empty">
                    <div class="empty-state">
                        <i class="codicon codicon-output"></i>
                        <p>\${escapeHtml(L.noLogs || 'No logs yet')}</p>
                    </div>
                    <button class="log-view-all" data-view-logs="true">\${escapeHtml(L.viewAllLogs || 'View All Logs')} -></button>
                </div>
            \`;
        }
        html += '</div>';

        html += '</div></div>';
        body.innerHTML = html;

        // Bind events
        body.querySelectorAll('[data-module-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.moduleId;
                if (section) vscode.postMessage({ type: 'switchSection', section });
            });
        });

        body.querySelectorAll('.stat-card.clickable').forEach(card => {
            card.addEventListener('click', () => {
                const section = card.dataset.targetSection;
                if (section) vscode.postMessage({ type: 'switchSection', section });
            });
        });

        body.querySelectorAll('.next-up-btn, .icon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.dataset.command;
                if (command) vscode.postMessage({ type: 'executeCommand', command });
            });
        });

        body.querySelectorAll('[data-section-switch]').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.sectionSwitch;
                if (section) vscode.postMessage({ type: 'switchSection', section });
            });
        });

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

        body.querySelectorAll('[data-view-logs]').forEach(btn => {
            btn.addEventListener('click', () => {
                vscode.postMessage({ type: 'switchSection', section: 'modelProxy' });
                setTimeout(() => vscode.postMessage({ type: 'requestLogFiles' }), 150);
            });
        });
    }

    function formatLastSwitched(label, ts) {
        if (!ts) return label || '-';
        try {
            const date = new Date(ts);
            return \`\${label || '-'} | \${date.toLocaleString()}\`;
        } catch {
            return label || '-';
        }
    }

    function formatLogTime(ts) {
        try { return new Date(ts).toLocaleTimeString(); }
        catch { return ts || '-'; }
    }

    function truncateUrl(url) {
        if (!url) return '';
        if (url.length <= 28) return url;
        return url.slice(0, 25) + '...';
    }

    function truncateModel(model) {
        if (!model) return '';
        if (model.length <= 28) return model;
        return model.slice(0, 25) + '...';
    }

    function isSuccessStatus(status) {
        return status === 'success' || status === 'ok';
    }

    // ==================== Settings Rendering ====================
    function renderSettings(data) {
        const body = document.querySelector('.content-body');
        const toolbar = document.querySelector('.toolbar');

        toolbar.innerHTML = '<span class="toolbar-title">' + escapeHtml(getSectionTitle('settings')) + '</span>';

        let html = '<div class="settings">';
        for (const section of data.sections || []) {
            html += '<div class="settings-section">';
            html += '<div class="settings-section-title">' + section.title + '</div>';
            for (const field of section.fields || []) {
                html += '<div class="settings-field">';
                html += '<label class="settings-label">' + field.label + '</label>';
                const disabledAttr = field.readOnly ? ' disabled' : '';
                if (field.kind === 'select') {
                    html += '<select class="settings-input" data-key="' + field.key + '" data-scope="' + field.scope + '"' + disabledAttr + '>';
                    for (const option of field.options || []) {
                        const selected = option.value === field.value ? ' selected' : '';
                        html += '<option value="' + option.value + '"' + selected + '>' + option.label + '</option>';
                    }
                    html += '</select>';
                } else if (field.kind === 'textarea') {
                    html += '<textarea class="settings-input" data-key="' + field.key + '" data-scope="' + field.scope + '" placeholder="' + (field.placeholder || '') + '"' + disabledAttr + '>' + (field.value || '') + '</textarea>';
                } else {
                    html += '<input class="settings-input" data-key="' + field.key + '" data-scope="' + field.scope + '" type="text" value="' + (field.value || '') + '" placeholder="' + (field.placeholder || '') + '"' + disabledAttr + ' />';
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
            const isTextarea = input.tagName === 'TEXTAREA';
            const sendChange = () => {
                if (input.disabled) { return; }
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
            if (!isTextarea) {
                input.addEventListener('input', debounce);
            }
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
            : '-';

        let html = '<div class="proxy-dashboard">';

        // 鈹€鈹€ Stats Grid 鈹€鈹€
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

        // 鈹€鈹€ Connection Info (only when running) 鈹€鈹€
        if (running) {
            html += '<div class="proxy-section-title">' + escapeHtml(L.connection || 'CONNECTION') + '</div>';
            html += '<div class="proxy-connection">';
            html += \`
                <div class="proxy-conn-row">
                    <span class="proxy-conn-label"><i class="codicon codicon-link"></i> \${escapeHtml(L.baseUrl || 'Base URL')}</span>
                    <span class="proxy-conn-value">\${escapeHtml(data.baseUrl)}</span>
                    <button class="proxy-conn-btn" data-proxy-action="copyUrl" title="\${escapeHtml(L.copy || 'Copy')}"><i class="codicon codicon-copy"></i></button>
                </div>
            \`;
            html += '</div>';
        }

        // 鈹€鈹€ API Key Bindings 鈹€鈹€
        html += '<div class="proxy-section-title">' + escapeHtml(L.bindings || 'API KEY BINDINGS');
        html += ' <button class="proxy-conn-btn" data-proxy-action="addBinding" title="' + escapeHtml(L.addBinding || 'Add Binding') + '"><i class="codicon codicon-add"></i></button>';
        html += '</div>';
        if (data.bindings && data.bindings.length > 0) {
            html += '<div class="proxy-bindings-list">';
            for (const binding of data.bindings) {
                html += \`
                    <div class="proxy-conn-row proxy-binding-row" data-binding-id="\${escapeHtml(binding.id)}">
                        <span class="proxy-conn-label"><i class="codicon codicon-key"></i> \${escapeHtml(binding.label || binding.id)}</span>
                        <span class="proxy-model-tag">\${escapeHtml(binding.modelName || binding.modelId)}</span>
                        <span class="proxy-conn-value">\${escapeHtml(binding.maskedKey)}</span>
                        <button class="proxy-conn-btn proxy-binding-copy" title="\${escapeHtml(L.copy || 'Copy')}"><i class="codicon codicon-copy"></i></button>
                        <button class="proxy-conn-btn proxy-binding-remove" title="\${escapeHtml(L.removeBinding || 'Remove')}"><i class="codicon codicon-trash"></i></button>
                    </div>
                \`;
            }
            html += '</div>';
        } else {
            html += '<div class="proxy-empty-models"><i class="codicon codicon-info"></i> ' + escapeHtml(L.noBindings || 'No bindings yet. Add one to get started.') + '</div>';
        }

        // 鈹€鈹€ Available Models (collapsible compact list, read-only) 鈹€鈹€
        const modelsTitle = escapeHtml(L.availableModels || 'Available Models');
        html += '<div class="proxy-section-title proxy-models-toggle" data-toggle="proxy-models-list">';
        html += modelsTitle;
        html += ' <i class="codicon codicon-chevron-right proxy-models-chevron"></i>';
        html += '</div>';
        html += '<div class="proxy-models-list collapsed" id="proxy-models-list">';
        if (data.models && data.models.length > 0) {
            for (const model of data.models) {
                html += \`
                    <div class="proxy-model-row" data-model-id="\${escapeHtml(model.id)}">
                        <i class="codicon codicon-symbol-misc proxy-model-radio"></i>
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

        // 鈹€鈹€ Recent Logs (compact) 鈹€鈹€
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

        // 鈹€鈹€ Bind events 鈹€鈹€
        // Binding copy button click
        body.querySelectorAll('.proxy-binding-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('.proxy-binding-row');
                const bindingId = row && row.dataset.bindingId;
                if (bindingId) {
                    vscode.postMessage({ type: 'copyProxyBindingKey', bindingId });
                }
            });
        });

        // Binding remove button click
        body.querySelectorAll('.proxy-binding-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('.proxy-binding-row');
                const bindingId = row && row.dataset.bindingId;
                if (bindingId) {
                    vscode.postMessage({ type: 'removeProxyBinding', bindingId });
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

        // Proxy action buttons & "View All Logs" are handled by delegation in setupProxyActions()

        // Log row click -> show detail popup
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

        // 鈹€鈹€ Bind events 鈹€鈹€
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
        detailHtml += '<div class="proxy-log-detail-row"><span class="proxy-log-detail-label">' + escapeHtml(L.logRequestId || 'Request ID') + '</span><span class="proxy-log-detail-value mono">' + escapeHtml(log.requestId || '-') + '</span></div>';
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
    function renderSection(section, tree, toolbarActions, tags, activeTags, cards) {
        currentSection = section;
        currentTreeData = tree || [];
        currentCards = cards || [];
        currentTags = tags || [];
        currentActiveTags = activeTags || [];
        currentToolbarActions = toolbarActions || [];
        renderToolbar(section, currentToolbarActions);

        if (section === 'skills' || section === 'commands') {
            const mode = getViewMode(section);
            if (mode === 'cards') {
                compactListMode = false;
                renderCardsSection(section, currentCards, currentTags, currentActiveTags);
            } else {
                compactListMode = true;
                renderTree(currentTreeData, currentTags, currentActiveTags);
            }
            return;
        }

        compactListMode = false;
        renderTree(currentTreeData, currentTags, currentActiveTags);
    }

    function renderToolbar(section, actions, titleOverride) {
        const toolbar = document.querySelector('.toolbar');
        const titles = {
            dashboard: t('sectionDashboard', 'Dashboard'),
            accountCenter: t('sectionAccountCenter', 'Account Center'),
            launcher: t('sectionLauncher', 'Launcher'),
            skills: t('sectionSkills', 'Skills'),
            commands: t('sectionCommands', 'Commands'),
            gitshare: t('sectionGitShare', 'Git Sync'),
            modelProxy: t('sectionModelProxy', 'Model Proxy'),
            opencodeAuth: t('sectionOpenCodeAuth', 'OpenCode'),
            settings: t('sectionSettings', 'Settings')
        };
        
        const title = titleOverride || titles[section] || section.toUpperCase();
        let html = \`<span class="toolbar-title">\${escapeHtml(title)}</span>\`;

        const actionButtons = [];
        if (actions && actions.length > 0) {
            for (const action of actions) {
                actionButtons.push(\`
                    <button class="toolbar-btn" title="\${action.label}" data-command="\${action.command}" data-action-type="\${action.action || 'command'}" data-action-id="\${action.id}">
                        <i class="codicon codicon-\${action.iconId}"></i>
                    </button>
                \`);
            }
        }

        if (section === 'skills' || section === 'commands') {
            const mode = getViewMode(section);
            const icon = mode === 'cards' ? 'list-unordered' : 'dashboard';
            const title = mode === 'cards' ? t('viewListTitle', 'List View') : t('viewCardsTitle', 'Card View');
            const label = mode === 'cards' ? t('viewList', 'List') : t('viewCards', 'Cards');
            actionButtons.push(\`
                <button class="toolbar-btn toolbar-btn--view-toggle" title="\${title}" data-action-type="local" data-action-id="toggleView">
                    <i class="codicon codicon-\${icon}"></i>
                    <span class="toolbar-btn-text">\${label}</span>
                </button>
            \`);
        }

        if (actionButtons.length > 0) {
            html += '<div class="toolbar-actions">';
            html += actionButtons.join('');
            html += '</div>';
        }

        toolbar.innerHTML = html;
        
        toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const actionType = btn.dataset.actionType;
                if (actionType === 'local') {
                    handleLocalToolbarAction(btn.dataset.actionId);
                } else if (actionType === 'overlay') {
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

    function handleLocalToolbarAction(actionId) {
        if (actionId === 'toggleView') {
            toggleViewMode(currentSection);
        }
    }

    function getViewMode(section) {
        return viewModes[section] || 'cards';
    }

    function setViewMode(section, mode) {
        viewModes[section] = mode;
        saveState();
    }

    function toggleViewMode(section) {
        if (section !== 'skills' && section !== 'commands') {
            return;
        }
        const current = getViewMode(section);
        const next = current === 'cards' ? 'list' : 'cards';
        setViewMode(section, next);
        renderSection(section, currentTreeData, currentToolbarActions, currentTags, currentActiveTags, currentCards);
    }

    // ==================== Cards Rendering ====================
    function renderCardsSection(section, cards, tags, activeTags) {
        const body = document.querySelector('.content-body');
        hideDropOverlay();
        body.innerHTML = '';

        appendAiTaggingProgress(body, section);

        if (tags && tags.length > 0) {
            body.appendChild(renderTagChips(tags, activeTags || []));
        }

        const container = document.createElement('div');
        container.className = 'cards-container';

        if (!cards || cards.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            const icon = section === 'skills' ? 'library' : 'terminal';
            const message = section === 'skills'
                ? t('emptySkills', 'No skills found. Create or import a skill to get started.')
                : t('emptyCommands', 'No commands found. Create or import a command to get started.');
            const hint = section === 'skills'
                ? t('emptySkillsHint', 'You can also drag & drop skill folders here.')
                : t('emptyCommandsHint', 'You can also drag & drop command files here.');
            empty.innerHTML = \`
                <i class="codicon codicon-\${icon}"></i>
                <p>\${message}</p>
                <span class="empty-hint">\${hint}</span>
            \`;
            container.appendChild(empty);
        } else {
            const grid = document.createElement('div');
            grid.className = 'card-grid';
            for (const card of cards) {
                grid.appendChild(createCardElement(card));
            }
            container.appendChild(grid);
        }

        body.appendChild(container);
    }

    function createCardElement(card) {
        const el = document.createElement('div');
        el.className = 'item-card';
        el.title = card.description || '';
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', card.name || 'item');

        const openCard = () => {
            activeCardId = card.id;
            vscode.postMessage({ type: 'cardClick', section: currentSection, cardId: card.id });
            if (card.fileTree && card.fileTree.length > 0) {
                showFileTreeDialog(card.name, card.fileTree);
            }
        };

        el.addEventListener('click', openCard);
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openCard();
            }
        });

        const icon = document.createElement('div');
        icon.className = 'card-icon';
        icon.innerHTML = \`<i class="codicon codicon-\${card.iconId || 'extensions'}"></i>\`;
        el.appendChild(icon);

        const name = document.createElement('div');
        name.className = 'card-name';
        name.textContent = card.name || '';
        el.appendChild(name);

        if (card.description) {
            const desc = document.createElement('div');
            desc.className = 'card-desc';
            desc.textContent = card.description;
            el.appendChild(desc);
        }

        if (card.badges && card.badges.length > 0) {
            const badges = document.createElement('div');
            badges.className = 'card-badges';
            const maxBadges = 2;
            const display = card.badges.slice(0, maxBadges);
            for (const badge of display) {
                const chip = document.createElement('span');
                chip.className = 'card-badge';
                chip.textContent = badge;
                badges.appendChild(chip);
            }
            if (card.badges.length > maxBadges) {
                const more = document.createElement('span');
                more.className = 'card-badge card-badge--more';
                more.textContent = '+' + (card.badges.length - maxBadges);
                badges.appendChild(more);
            }
            el.appendChild(badges);
        }

        if (card.actions && card.actions.length > 0) {
            const actions = document.createElement('div');
            actions.className = 'card-actions';
            for (const action of card.actions) {
                const btn = document.createElement('button');
                btn.className = 'card-action-btn' + (action.danger ? ' danger' : '');
                btn.title = action.label;
                btn.innerHTML = \`<i class="codicon codicon-\${action.iconId || 'circle-outline'}"></i>\`;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    vscode.postMessage({ type: 'cardAction', section: currentSection, cardId: card.id, actionId: action.id });
                });
                actions.appendChild(btn);
            }
            el.appendChild(actions);
        }

        return el;
    }

    function showFileTreeDialog(title, files) {
        hideFileTreeDialog();

        const backdrop = document.createElement('div');
        backdrop.className = 'file-tree-backdrop';

        const panel = document.createElement('div');
        panel.className = 'file-tree-panel';

        const header = document.createElement('div');
        header.className = 'file-tree-header';
        header.innerHTML = \`
            <span>\${escapeHtml(title)}</span>
            <button class="icon-btn file-tree-close"><i class="codicon codicon-close"></i></button>
        \`;
        panel.appendChild(header);

        const body = document.createElement('div');
        body.className = 'file-tree-body';

        if (!files || files.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<i class="codicon codicon-folder"></i><p>' + escapeHtml(t('noFiles', 'No files')) + '</p>';
            body.appendChild(empty);
        } else {
            for (const node of files) {
                body.appendChild(createFileTreeNode(node, 0));
            }
        }

        panel.appendChild(body);
        backdrop.appendChild(panel);
        document.body.appendChild(backdrop);
        fileTreeDialog = backdrop;

        const close = () => hideFileTreeDialog();
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
        const closeBtn = panel.querySelector('.file-tree-close');
        if (closeBtn) closeBtn.addEventListener('click', close);
        const escHandler = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); } };
        document.addEventListener('keydown', escHandler);
    }

    function hideFileTreeDialog() {
        if (fileTreeDialog) {
            fileTreeDialog.remove();
            fileTreeDialog = null;
        }
    }

    function createFileTreeNode(node, depth) {
        const wrapper = document.createElement('div');
        wrapper.className = 'file-tree-node';

        const row = document.createElement('div');
        row.className = 'file-tree-row' + (!node.isDirectory ? ' file-tree-row--clickable' : '');
        row.style.paddingLeft = (depth * 16 + 8) + 'px';
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
        row.setAttribute('aria-expanded', node.isDirectory ? String(depth < 1) : 'false');

        const chevron = document.createElement('span');
        const chevronIcon = document.createElement('i');
        if (node.isDirectory) {
            chevron.className = 'file-tree-chevron';
            const defaultExpanded = depth < 1;
            chevronIcon.className = 'codicon ' + (defaultExpanded ? 'codicon-chevron-down' : 'codicon-chevron-right');
            chevron.appendChild(chevronIcon);
        } else {
            chevron.className = 'file-tree-chevron-placeholder';
        }
        row.appendChild(chevron);

        const icon = document.createElement('span');
        icon.className = 'file-tree-icon';
        const iconId = node.isDirectory ? 'folder' : getFileIcon(node.name || '');
        icon.innerHTML = \`<i class="codicon codicon-\${iconId}"></i>\`;
        row.appendChild(icon);

        const name = document.createElement('span');
        name.className = 'file-tree-name';
        name.textContent = node.name || '';
        row.appendChild(name);

        wrapper.appendChild(row);

        let childrenEl = null;
        if (node.isDirectory && node.children && node.children.length > 0) {
            childrenEl = document.createElement('div');
            childrenEl.className = 'file-tree-children';
            const defaultExpanded = depth < 1;
            childrenEl.style.display = defaultExpanded ? 'block' : 'none';
            for (const child of node.children) {
                childrenEl.appendChild(createFileTreeNode(child, depth + 1));
            }
            wrapper.appendChild(childrenEl);
        }

        const onActivateRow = () => {
            if (node.isDirectory) {
                if (childrenEl) {
                    const isOpen = childrenEl.style.display !== 'none';
                    childrenEl.style.display = isOpen ? 'none' : 'block';
                    chevronIcon.className = 'codicon ' + (isOpen ? 'codicon-chevron-right' : 'codicon-chevron-down');
                    row.setAttribute('aria-expanded', String(!isOpen));
                }
            } else {
                vscode.postMessage({ type: 'cardFileClick', section: currentSection, cardId: activeCardId, filePath: node.id });
            }
        };

        row.addEventListener('click', onActivateRow);
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onActivateRow();
            }
        });

        return wrapper;
    }

    function getFileIcon(name) {
        const lower = name.toLowerCase();
        if (lower.endsWith('.md')) return 'markdown';
        if (lower.endsWith('.ts') || lower.endsWith('.js')) return 'symbol-method';
        if (lower.endsWith('.json')) return 'json';
        if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'symbol-namespace';
        return 'file';
    }

    // ==================== Account Center Rendering ====================
    function renderAccountCenter(data) {
        const body = document.querySelector('.content-body');
        hideDropOverlay();
        const labels = (data && data.labels) || {};

        if (!data) {
            body.innerHTML = '<div class="empty-state"><i class="codicon codicon-info"></i><p>' + escapeHtml(labels.emptyData || t('noData', 'No data')) + '</p></div>';
            return;
        }

        const dashboard = data.dashboard || {};
        const tabs = data.tabs || [];
        const sections = data.sections || {};
        const activeTab = data.activeTab || 'launcher';
        const activeSection = sections[activeTab];
        const activeTabMeta = tabs.find((tab) => tab.id === activeTab);
        const activeDomain = (activeTabMeta && activeTabMeta.domain) || (activeTab === 'launcher' ? 'github' : 'opencode');
        const rows = activeSection && activeSection.rows ? activeSection.rows : [];
        const activeProviders = Array.isArray(dashboard.activeProviders) ? dashboard.activeProviders : [];
        const activeProvidersText = activeProviders.length > 0 ? activeProviders.join(', ') : '-';

        let html = '';
        html += '<div class="account-center-view">';

        html += '<div class="account-domain-strips">';
        html += '<div class="account-domain-strip account-domain-strip--github' + (activeDomain === 'github' ? ' active' : '') + '">';
        html += '<span class="account-domain-dot"></span>';
        html += '<span>' + escapeHtml(labels.groupGithub || 'GitHub Login Domain') + '</span>';
        html += '</div>';
        html += '<div class="account-domain-strip account-domain-strip--opencode' + (activeDomain === 'opencode' ? ' active' : '') + '">';
        html += '<span class="account-domain-dot"></span>';
        html += '<span>' + escapeHtml(labels.groupOpenCode || 'OpenCode Operation Domain') + '</span>';
        html += '</div>';
        html += '</div>';

        html += '<div class="account-tabs">';
        for (const tab of tabs) {
            const tabDomain = tab.domain || (tab.id === 'launcher' ? 'github' : 'opencode');
            const active = tab.id === activeTab ? ' active' : '';
            html += '<button class="account-tab-btn account-tab-btn--' + tabDomain + active + '" data-account-tab="' + escapeHtml(tab.id) + '">';
            html += '<span>' + escapeHtml(tab.label) + '</span>';
            html += '<span class="account-tab-count">' + Number(tab.count || 0) + '</span>';
            html += '</button>';
        }
        html += '</div>';

        html += '<div class="account-inline-toolbar-label">' + escapeHtml(labels.toolbarActions || 'Actions') + '</div>';
        html += '<div class="account-inline-toolbar account-inline-toolbar--' + activeDomain + '">';
        for (const action of (data.toolbar || [])) {
            html += '<button class="account-toolbar-btn account-toolbar-btn--' + activeDomain + '" data-ac-action="' + escapeHtml(action.id) + '">';
            html += '<i class="codicon codicon-' + escapeHtml(action.iconId || 'circle-outline') + '"></i>';
            html += '<span>' + escapeHtml(action.label) + '</span>';
            html += '</button>';
        }
        html += '</div>';

        if (activeTab === 'sessions') {
            html += '<div class="account-center-dashboard">';
            html += '<div class="account-stat-card">';
            html += '<div class="account-stat-label">' + escapeHtml(labels.dashboardActiveProviders || 'Active Providers') + '</div>';
            html += '<div class="account-stat-value account-stat-value--list" title="' + escapeHtml(activeProvidersText) + '">' + escapeHtml(activeProvidersText) + '</div>';
            html += '</div>';
            html += '<div class="account-stat-card">';
            html += '<div class="account-stat-label">' + escapeHtml(labels.dashboardActiveOhMy || 'Active Oh-My') + '</div>';
            html += '<div class="account-stat-value account-stat-value--text">' + escapeHtml(dashboard.activeOhMyName || '-') + '</div>';
            html += '</div>';
            html += '</div>';
        }

        if (activeTab === 'ohmy') {
            html += '<div class="account-models-panel">';
            html += '<div class="account-models-note-title">' + escapeHtml(labels.dashboardModelsMeaningTitle || 'Model Reference Scope') + '</div>';
            html += '<div class="account-models-note-desc">' + escapeHtml(labels.dashboardModelsMeaningDesc || 'These model IDs are read from the active oh-my-opencode.json (agents + categories) and represent config references, not real-time session runtime.') + '</div>';

            if (dashboard.models && dashboard.models.length > 0) {
                html += '<div class="account-models">';
                for (const model of dashboard.models) {
                    html += '<span class="account-model-chip">' + escapeHtml(model) + '</span>';
                }
                html += '</div>';
            }
            html += '</div>';
        }

        html += '<div class="account-list">';
        if (!rows.length) {
            html += '<div class="empty-state">';
            html += '<i class="codicon codicon-info"></i>';
            html += '<p>' + escapeHtml((activeSection && activeSection.emptyText) || labels.emptyData || t('noData', 'No data')) + '</p>';
            html += '</div>';
        } else {
            for (const row of rows) {
                const rowDomain = row.domain || activeDomain;
                const domainClass = rowDomain ? ' account-row--' + rowDomain : '';
                const statusClass = row.status ? ' account-row--' + row.status : '';
                html += '<div class="account-row' + domainClass + statusClass + '" data-row-id="' + escapeHtml(row.id) + '">';
                html += '<div class="account-row-head">';
                html += '<div class="account-row-name-wrap">';
                html += '<span class="account-row-name">' + escapeHtml(row.name || '') + '</span>';
                const badgesHtml = (row.badges || []).map((badge) => '<span class="account-row-badge">' + escapeHtml(badge) + '</span>').join('');
                html += badgesHtml;
                html += '</div>';
                html += '<span class="account-row-desc" title="' + escapeHtml(row.description || '-') + '">' + escapeHtml(row.description || '-') + '</span>';
                html += '</div>';

                if (row.subtitle) {
                    html += '<div class="account-row-subtitle" title="' + escapeHtml(row.subtitle) + '">' + escapeHtml(row.subtitle) + '</div>';
                }

                if (row.metaItems && row.metaItems.length > 0) {
                    html += '<div class="account-row-kv-list">';
                    for (const item of row.metaItems) {
                        const itemFullClass = item && item.full ? ' account-row-kv-item--full' : '';
                        const valueMonoClass = item && item.mono ? ' account-row-kv-value--mono' : '';
                        html += '<div class="account-row-kv-item' + itemFullClass + '">';
                        html += '<span class="account-row-kv-label">' + escapeHtml((item && item.label) || '-') + '</span>';
                        html += '<span class="account-row-kv-value' + valueMonoClass + '" title="' + escapeHtml((item && item.value) || '-') + '">' + escapeHtml((item && item.value) || '-') + '</span>';
                        html += '</div>';
                    }
                    html += '</div>';
                } else if (row.metaLines && row.metaLines.length > 0) {
                    html += '<div class="account-row-meta-list">';
                    for (const line of row.metaLines) {
                        html += '<div class="account-row-meta" title="' + escapeHtml(line || '') + '">' + escapeHtml(line || '') + '</div>';
                    }
                    html += '</div>';
                }

                if (row.actions && row.actions.length > 0) {
                    html += '<div class="account-row-actions">';
                    for (const action of row.actions) {
                        const danger = action.danger ? ' danger' : '';
                        const disabledClass = action.disabled ? ' disabled' : '';
                        const disabledAttr = action.disabled ? ' disabled' : '';
                        html += '<button class="account-row-action account-row-action--' + rowDomain + danger + disabledClass + '" data-ac-action="' + escapeHtml(action.id) + '" data-row-id="' + escapeHtml(row.id) + '"' + disabledAttr + '>';
                        html += '<i class="codicon codicon-' + escapeHtml(action.iconId || 'circle-outline') + '"></i>';
                        html += '<span>' + escapeHtml(action.label) + '</span>';
                        html += '</button>';
                    }
                    html += '</div>';
                }

                html += '</div>';
            }
        }
        html += '</div>';
        html += '</div>';

        body.innerHTML = html;

        body.querySelectorAll('[data-account-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.accountTab;
                if (!tab || tab === activeTab) {
                    return;
                }
                vscode.postMessage({ type: 'accountCenterTabChange', tab });
            });
        });

        body.querySelectorAll('.account-toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const actionId = btn.dataset.acAction;
                if (!actionId) {
                    return;
                }
                vscode.postMessage({ type: 'accountCenterAction', tab: activeTab, actionId });
            });
        });

        body.querySelectorAll('.account-row-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (btn.classList.contains('disabled')) {
                    return;
                }
                const actionId = btn.dataset.acAction;
                const rowId = btn.dataset.rowId;
                if (!actionId) {
                    return;
                }
                vscode.postMessage({ type: 'accountCenterAction', tab: activeTab, actionId, rowId });
            });
        });
    }

    // ==================== Tree Rendering ====================
    function renderTree(nodes, tags, activeTags) {
        const body = document.querySelector('.content-body');
        hideDropOverlay();

        if (!nodes || nodes.length === 0) {
            body.innerHTML = '';
            if (tags && tags.length > 0) {
                body.appendChild(renderTagChips(tags, activeTags || []));
            }
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<i class="codicon codicon-info"></i><p>' + escapeHtml(t('noData', 'No data')) + '</p>';
            body.appendChild(empty);
            return;
        }

        body.innerHTML = '';

        appendAiTaggingProgress(body, currentSection);

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

        if (compactListMode) {
            requestAnimationFrame(() => applyCompactLayout(container));
        }
    }

    function renderAiTaggingProgressPanel(section) {
        const body = document.querySelector('.content-body');
        if (!body) {
            return;
        }

        const existing = body.querySelector('.ai-tagging-progress');
        if (existing) {
            existing.remove();
        }

        appendAiTaggingProgress(body, section, true);
    }

    function appendAiTaggingProgress(container, section, prepend = false) {
        if (section !== 'skills' && section !== 'commands') {
            return;
        }
        const progress = aiTaggingProgressMap[section];
        if (!progress) {
            return;
        }
        if (!progress.running && aiTaggingDismissedMap[section]) {
            return;
        }

        const panel = document.createElement('div');
        panel.className = 'ai-tagging-progress';

        const title = section === 'skills' ? 'Skills AI Tagging' : 'Commands AI Tagging';
        const runningText = progress.running ? 'Running' : 'Finished';

        panel.innerHTML = 
            '<div class="ai-tagging-progress-head">'
                + '<span class="ai-tagging-progress-title">' + escapeHtml(title) + '</span>'
                + '<span class="ai-tagging-progress-meta">' + escapeHtml(runningText + ' · ' + progress.completed + '/' + progress.total + ' · ' + progress.percent + '%') + '</span>'
            + '</div>'
            + '<div class="ai-tagging-progress-bar"><span style="width:' + progress.percent + '%"></span></div>'
            + (!progress.running
                ? '<div class="ai-tagging-progress-actions"><button class="ai-tagging-progress-close" type="button">Close</button></div>'
                : '')
            + '<div class="ai-tagging-progress-list">'
            + progress.items.map(item => {
                const stateClass = item.status === 'success' ? 'ok' : item.status === 'failed' ? 'err' : item.status === 'running' ? 'run' : 'pending';
                const meta = item.status === 'success'
                    ? (item.tags && item.tags.length > 0 ? item.tags.join(', ') : 'done')
                    : (item.error || item.status);
                return '<div class="ai-tagging-progress-item">'
                    + '<span class="state ' + stateClass + '"></span>'
                    + '<span class="name" title="' + escapeHtml(item.name) + '">' + escapeHtml(item.name) + '</span>'
                    + '<span class="meta" title="' + escapeHtml(meta || '') + '">' + escapeHtml(meta || '') + '</span>'
                + '</div>';
            }).join('')
            + '</div>';

        if (prepend && container.firstChild) {
            container.insertBefore(panel, container.firstChild);
        } else {
            container.appendChild(panel);
        }

        if (!progress.running) {
            const closeBtn = panel.querySelector('.ai-tagging-progress-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    aiTaggingDismissedMap[section] = true;
                    panel.remove();
                });
            }
        }
    }

    function applyCompactLayout(container) {
        return;
    }

    function renderTagChips(tags, activeTags) {
        const bar = document.createElement('div');
        bar.className = 'tag-chips';

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
            clearBtn.className = 'tag-chip clear-chip';
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

        const row = document.createElement('div');
        row.className = 'tree-row';
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
        const useMultiLine = !compactListMode && (node.layout === 'twoLine' || node.layout === 'threeLine');
        if (compactListMode) {
            row.classList.add('tree-row--compact');
        }
        if (useMultiLine) {
            row.classList.add('tree-row--two-line');
            if (node.layout === 'threeLine') row.classList.add('tree-row--three-line');
        }
        row.style.paddingLeft = (depth * 16 + 4) + 'px';
        if (node.id === selectedNodeId) row.classList.add('selected');

        const hasChildren = node.collapsible || (node.children && node.children.length > 0);
        const isExpanded = node.expanded || expandedNodes.has(node.id);
        row.setAttribute('aria-expanded', hasChildren ? String(isExpanded) : 'false');

        const chevron = document.createElement('span');
        if (hasChildren) {
            chevron.className = 'tree-chevron';
            chevron.innerHTML = \`<i class="codicon codicon-\${isExpanded ? 'chevron-down' : 'chevron-right'}"></i>\`;
        } else {
            chevron.className = 'tree-chevron-placeholder';
        }
        row.appendChild(chevron);

        if (node.iconId) {
            const icon = document.createElement('span');
            icon.className = 'tree-icon';
            if (node.iconColor) icon.style.color = node.iconColor;
            icon.innerHTML = \`<i class="codicon codicon-\${node.iconId}"></i>\`;
            row.appendChild(icon);
        }

        if (useMultiLine) {
            const content = document.createElement('div');
            content.className = 'tree-content';

            const row1 = document.createElement('div');
            row1.className = 'tree-content-row1';
            const label = document.createElement('span');
            label.className = 'tree-label tree-label--primary';
            label.textContent = node.label;
            if (node.tooltip) label.title = node.tooltip;
            row1.appendChild(label);
            content.appendChild(row1);

            if (node.subtitle || (node.badges && node.badges.length > 0)) {
                const row2 = document.createElement('div');
                row2.className = 'tree-content-row2';
                if (node.subtitle) {
                    const subtitle = document.createElement('span');
                    subtitle.className = 'tree-subtitle';
                    subtitle.textContent = node.subtitle;
                    subtitle.title = node.subtitle;
                    row2.appendChild(subtitle);
                }
                if (node.badges && node.badges.length > 0) {
                    const badgeWrap = document.createElement('span');
                    badgeWrap.className = 'tree-badges';
                    const maxBadges = 3;
                    const display = node.badges.slice(0, maxBadges);
                    for (const badge of display) {
                        const badgeEl = document.createElement('span');
                        badgeEl.className = 'tree-badge';
                        badgeEl.textContent = badge;
                        badgeWrap.appendChild(badgeEl);
                    }
                    if (node.badges.length > maxBadges) {
                        const more = document.createElement('span');
                        more.className = 'tree-badge tree-badge--more';
                        more.textContent = '+' + (node.badges.length - maxBadges);
                        badgeWrap.appendChild(more);
                    }
                    row2.appendChild(badgeWrap);
                }
                content.appendChild(row2);
            }

            if (node.tertiary) {
                const row3 = document.createElement('div');
                row3.className = 'tree-content-row3';
                const tertiary = document.createElement('span');
                tertiary.className = 'tree-tertiary';
                tertiary.textContent = node.tertiary;
                tertiary.title = node.tertiary;
                row3.appendChild(tertiary);
                content.appendChild(row3);
            }

            row.appendChild(content);
        } else {
            if (compactListMode) {
                const compactContent = document.createElement('div');
                compactContent.className = 'tree-compact-content';

                const label = document.createElement('span');
                label.className = 'tree-label tree-label--compact';
                label.textContent = node.label;
                if (node.tooltip) label.title = node.tooltip;
                compactContent.appendChild(label);

                const descriptionText = node.description || node.subtitle || node.tertiary || '';
                if (descriptionText) {
                    const desc = document.createElement('span');
                    desc.className = 'tree-description tree-description--compact';
                    desc.textContent = descriptionText;
                    desc.title = descriptionText;
                    compactContent.appendChild(desc);
                }

                if (node.badges && node.badges.length > 0) {
                    const badgeWrap = document.createElement('span');
                    badgeWrap.className = 'tree-badges tree-badges--compact';
                    const maxBadges = 3;
                    const display = node.badges.slice(0, maxBadges);
                    for (const badge of display) {
                        const badgeEl = document.createElement('span');
                        badgeEl.className = 'tree-badge';
                        badgeEl.textContent = badge;
                        badgeWrap.appendChild(badgeEl);
                    }
                    if (node.badges.length > maxBadges) {
                        const more = document.createElement('span');
                        more.className = 'tree-badge tree-badge--more';
                        more.textContent = '...';
                        badgeWrap.appendChild(more);
                    }
                    compactContent.appendChild(badgeWrap);
                }

                row.appendChild(compactContent);
            } else {
                const label = document.createElement('span');
                label.className = 'tree-label';
                label.textContent = node.label;
                if (node.tooltip) label.title = node.tooltip;
                row.appendChild(label);

                if (node.description) {
                    const desc = document.createElement('span');
                    desc.className = 'tree-description';
                    desc.textContent = node.description;
                    row.appendChild(desc);
                }
            }
        }

        if (node.inlineActions && node.inlineActions.length > 0) {
            const actions = document.createElement('span');
            actions.className = 'tree-inline-actions';
            for (const action of node.inlineActions) {
                const pinned = node.pinnedActionId && action.id === node.pinnedActionId;
                const btn = document.createElement('button');
                btn.className = 'tree-action-btn' + (action.danger ? ' danger' : '') + (pinned ? ' tree-action-btn--pinned' : '');
                btn.title = action.label;
                btn.innerHTML = \`<i class="codicon codicon-\${action.iconId || 'circle-outline'}"></i>\`;
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

        row.addEventListener('click', (e) => {
            if (e.target.closest('.tree-action-btn')) return;

            if (hasChildren) {
                const isNowExpanded = expandedNodes.has(node.id);
                if (isNowExpanded) {
                    expandedNodes.delete(node.id);
                } else {
                    expandedNodes.add(node.id);
                }
                const childrenEl = el.querySelector(':scope > .tree-children');
                if (childrenEl) {
                    childrenEl.classList.toggle('collapsed', !expandedNodes.has(node.id));
                }
                if (hasChildren) {
                    chevron.innerHTML = \`<i class="codicon codicon-\${expandedNodes.has(node.id) ? 'chevron-down' : 'chevron-right'}"></i>\`;
                }
                row.setAttribute('aria-expanded', String(expandedNodes.has(node.id)));
                saveState();
            } else {
                document.querySelectorAll('.tree-row.selected').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
                selectedNodeId = node.id;
                vscode.postMessage({
                    type: 'treeItemClick',
                    nodeId: node.id,
                    section: currentSection
                });
            }
        });

        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                row.click();
            }
        });

        if (node.contextActions && node.contextActions.length > 0) {
            row.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showContextMenu(e.clientX, e.clientY, node);
            });
        }

        el.appendChild(row);

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
            item.setAttribute('role', 'menuitem');
            item.setAttribute('tabindex', '0');
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
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
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
        window.addEventListener('dragenter', (e) => {
            if (!isDropSection()) return;
            e.preventDefault();
            dragDepth += 1;
            showDropOverlay();
        }, true);

        window.addEventListener('dragover', (e) => {
            if (!isDropSection()) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        }, true);

        window.addEventListener('dragleave', (e) => {
            if (!isDropSection()) return;
            e.preventDefault();
            dragDepth = Math.max(0, dragDepth - 1);
            if (dragDepth === 0) hideDropOverlay();
        }, true);

        window.addEventListener('drop', (e) => {
            if (!isDropSection()) return;
            e.preventDefault();
            dragDepth = 0;
            hideDropOverlay();
            const uris = extractDropUris(e);
            if (uris.length > 0) {
                vscode.postMessage({ type: 'dropFiles', uris, section: currentSection });
            } else {
                vscode.postMessage({ type: 'dropEmpty', section: currentSection });
            }
        }, true);
    }

    function isDropSection() {
        return currentSection === 'skills' || currentSection === 'commands';
    }

    function showDropOverlay() {
        const body = document.querySelector('.content-body');
        if (!body || dropOverlay) return;
        const overlay = document.createElement('div');
        overlay.className = 'drop-overlay';
        const label = currentSection === 'skills'
            ? 'Drop skill folders here to import'
            : 'Drop command files here to import';
        overlay.innerHTML = \`
            <div class="drop-overlay-content">
                <i class="codicon codicon-folder-library"></i>
                <span>\${label}</span>
            </div>
        \`;
        body.appendChild(overlay);
        dropOverlay = overlay;
    }

    function hideDropOverlay() {
        if (dropOverlay) {
            dropOverlay.remove();
            dropOverlay = null;
        }
    }

    function extractDropUris(e) {
        const uris = [];
        const dt = e.dataTransfer;
        if (!dt) return uris;

        const files = dt.files;
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                if (files[i].path) uris.push(files[i].path);
            }
        }

        const uriList = dt.getData('text/uri-list');
        if (uriList) {
            uriList.split('\\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('#'))
                .forEach(l => uris.push(l));
        }

        return Array.from(new Set(uris));
    }

    // ==================== Overlay Panel ====================
    let activeOverlay = null;

    function showOverlayPanel(data) {
        hideOverlayPanel();
        const isAiTaggingOverlay = data.overlayId === 'skills-ai-tagging' || data.overlayId === 'commands-ai-tagging';

        const backdrop = document.createElement('div');
        backdrop.className = 'overlay-backdrop';

        const panel = document.createElement('div');
        panel.className = 'overlay-panel' + (isAiTaggingOverlay ? ' overlay-panel--ai-tagging' : '');

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
        body.className = 'overlay-body' + (isAiTaggingOverlay ? ' overlay-body--grid' : '');

        const fieldElements = {};
        const fieldContainers = {};

        for (const field of data.fields) {
            const fieldEl = document.createElement('div');
            fieldEl.className = 'overlay-field';
            fieldEl.dataset.key = field.key;

            if (isAiTaggingOverlay) {
                const fullWidthKeys = new Set(['provider', 'tagLibrary', 'targets']);
                if (fullWidthKeys.has(field.key)) {
                    fieldEl.classList.add('overlay-field--full');
                }
            }

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
            } else if (field.kind === 'multi-select-dropdown') {
                const container = document.createElement('div');
                container.className = 'overlay-dropdown-select';
                container.dataset.key = field.key;

                const selectedValues = (field.value || '').split(',').filter(Boolean);

                const trigger = document.createElement('button');
                trigger.type = 'button';
                trigger.className = 'overlay-dropdown-trigger';

                const optionsWrap = document.createElement('div');
                optionsWrap.className = 'overlay-dropdown-options';

                const actions = document.createElement('div');
                actions.className = 'overlay-dropdown-actions';

                const clearBtn = document.createElement('button');
                clearBtn.type = 'button';
                clearBtn.className = 'overlay-dropdown-clear';
                clearBtn.textContent = 'Clear';
                clearBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const checked = grid.querySelectorAll('input[type="checkbox"]:checked');
                    checked.forEach((cb) => {
                        cb.checked = false;
                        const label = cb.closest('.overlay-check-tag');
                        if (label) {
                            label.classList.remove('checked');
                        }
                    });
                    updateTrigger();
                });
                actions.appendChild(clearBtn);

                const grid = document.createElement('div');
                grid.className = 'overlay-dropdown-grid';

                const updateTrigger = () => {
                    const checked = grid.querySelectorAll('input[type="checkbox"]:checked').length;
                    trigger.textContent = checked > 0 ? (checked + ' selected') : (field.placeholder || 'Select items');
                };

                for (const opt of (field.options || [])) {
                    const tag = document.createElement('label');
                    tag.className = 'overlay-check-tag' + (selectedValues.includes(opt.value) ? ' checked' : '');
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.value = opt.value;
                    cb.checked = selectedValues.includes(opt.value);
                    cb.addEventListener('change', () => {
                        tag.classList.toggle('checked', cb.checked);
                        updateTrigger();
                    });
                    tag.appendChild(cb);
                    tag.appendChild(document.createTextNode(opt.label));
                    grid.appendChild(tag);
                }

                optionsWrap.appendChild(actions);
                optionsWrap.appendChild(grid);

                if (field.key === 'targets') {
                    optionsWrap.classList.add('open');
                }

                trigger.addEventListener('click', () => {
                    optionsWrap.classList.toggle('open');
                });

                document.addEventListener('click', (e) => {
                    if (!container.contains(e.target)) {
                        optionsWrap.classList.remove('open');
                    }
                });

                container.appendChild(trigger);
                container.appendChild(optionsWrap);
                fieldEl.appendChild(container);
                updateTrigger();
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
            fieldContainers[field.key] = fieldEl;
        }

        panel.appendChild(body);

        if (isAiTaggingOverlay) {
            const applyProviderVisibility = () => {
                const provider = getFieldValue(fieldElements.provider);
                const isVsCode = provider === 'vscode-chat';
                const openaiKeys = ['openaiBaseUrl', 'openaiApiKey', 'openaiModel'];
                const vscodeKeys = ['vscodeModelId'];

                openaiKeys.forEach(key => {
                    const el = fieldContainers[key];
                    if (el) {
                        el.style.display = isVsCode ? 'none' : '';
                    }
                });
                vscodeKeys.forEach(key => {
                    const el = fieldContainers[key];
                    if (el) {
                        el.style.display = isVsCode ? '' : 'none';
                    }
                });
            };

            const providerField = fieldElements.provider;
            if (providerField && providerField.el) {
                providerField.el.addEventListener('change', applyProviderVisibility);
                applyProviderVisibility();
            }
        }

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
                    if (errEl) { errEl.textContent = field.label + t('requiredSuffix', ' is required'); errEl.classList.add('visible'); }
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
        return Array.from(container.querySelectorAll('.overlay-tag-item')).map(el => el.textContent.replace(/\\s*[xX]?\\s*$/, '').trim());
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
            expandedNodes: Array.from(expandedNodes),
            viewModes
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


