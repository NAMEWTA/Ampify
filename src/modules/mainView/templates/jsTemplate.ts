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
                renderSection(msg.section, msg.tree, msg.toolbar, msg.tags, msg.activeTags);
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
                html += \`
                    <button class="quick-action-btn" data-command="\${action.command}" data-action-type="\${actionType}" data-action-id="\${action.id}">
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
                if (actionType === 'overlay') {
                    vscode.postMessage({ type: 'quickAction', actionId: btn.dataset.actionId });
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
