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

    // ==================== Message Handling ====================
    window.addEventListener('message', event => {
        const msg = event.data;
        switch (msg.type) {
            case 'updateSection':
                renderSection(msg.section, msg.tree, msg.toolbar);
                break;
            case 'updateDashboard':
                renderDashboard(msg.data);
                break;
            case 'updateSettings':
                renderSettings(msg.data);
                break;
            case 'setActiveSection':
                currentSection = msg.section;
                setActiveNavItem(msg.section);
                saveState();
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
                html += \`
                    <button class="quick-action-btn" data-command="\${action.command}">
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
                vscode.postMessage({ type: 'executeCommand', command: btn.dataset.command });
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

    // ==================== Section Rendering ====================
    function renderSection(section, tree, toolbarActions) {
        currentTreeData = tree;
        renderToolbar(section, toolbarActions);
        renderTree(tree);
    }

    function renderToolbar(section, actions) {
        const toolbar = document.querySelector('.toolbar');
        const titles = {
            dashboard: 'DASHBOARD',
            launcher: 'LAUNCHER',
            skills: 'SKILLS',
            commands: 'COMMANDS',
            gitshare: 'GIT SYNC',
            settings: 'SETTINGS'
        };
        
        let html = \`<span class="toolbar-title">\${titles[section] || section.toUpperCase()}</span>\`;
        
        if (actions) {
            for (const action of actions) {
                html += \`
                    <button class="toolbar-btn" title="\${action.label}" data-command="\${action.command}">
                        <i class="codicon codicon-\${action.iconId}"></i>
                    </button>
                \`;
            }
        }
        
        toolbar.innerHTML = html;
        
        toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                vscode.postMessage({ type: 'executeCommand', command: btn.dataset.command });
            });
        });
    }

    // ==================== Tree Rendering ====================
    function renderTree(nodes) {
        const body = document.querySelector('.content-body');
        
        if (!nodes || nodes.length === 0) {
            body.innerHTML = \`
                <div class="empty-state">
                    <i class="codicon codicon-info"></i>
                    <p>No data</p>
                </div>
            \`;
            return;
        }
        
        const container = document.createElement('div');
        container.className = 'tree-container';
        
        for (const node of nodes) {
            container.appendChild(createTreeNode(node, 0));
        }
        
        body.innerHTML = '';
        body.appendChild(container);
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
