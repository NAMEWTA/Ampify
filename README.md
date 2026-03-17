# Ampify

Ampify is a compact VS Code extension focused on five capabilities:

- Copy file path + line references
- Skills management
- Commands management
- Git Share synchronization
- Unified MainView webview

## MainView Sections

Visible sections are fixed to:

- `dashboard`
- `skills`
- `commands`
- `gitshare`
- `settings`

`copier` stays command-driven (no dedicated section).

## Core Commands

### Copy

- `ampify.copy-relative-path-line`
- `ampify.copy-absolute-path-line`

### MainView

- `ampify.mainView.refresh`

### Skills

- `ampify.skills.refresh`
- `ampify.skills.search`
- `ampify.skills.filterByTag`
- `ampify.skills.clearFilter`
- `ampify.skills.create`
- `ampify.skills.import`
- `ampify.skills.importFromUris`
- `ampify.skills.apply`
- `ampify.skills.preview`
- `ampify.skills.openFile`
- `ampify.skills.openFolder`
- `ampify.skills.delete`
- `ampify.skills.remove`

### Commands

- `ampify.commands.refresh`
- `ampify.commands.search`
- `ampify.commands.filterByTag`
- `ampify.commands.clearFilter`
- `ampify.commands.create`
- `ampify.commands.import`
- `ampify.commands.apply`
- `ampify.commands.preview`
- `ampify.commands.open`
- `ampify.commands.openFolder`
- `ampify.commands.delete`
- `ampify.commands.remove`

### Git Share

- `ampify.gitShare.refresh`
- `ampify.gitShare.sync`
- `ampify.gitShare.pull`
- `ampify.gitShare.push`
- `ampify.gitShare.commit`
- `ampify.gitShare.showDiff`
- `ampify.gitShare.editConfig`
- `ampify.gitShare.openConfigWizard`
- `ampify.gitShare.openFolder`

## Configuration

- `ampify.language`
- `ampify.rootDir`
- `ampify.skills.injectTarget`
- `ampify.commands.injectTarget`

## Data Directory

Default root: `~/.vscode-ampify/`

```text
~/.vscode-ampify/
|- gitshare/
|  |- .git/
|  |- config.json
|  |- vscodeskillsmanager/
|  |  |- config.json
|  |  `- skills/<skill>/SKILL.md
|  `- vscodecmdmanager/
|     |- config.json
|     `- commands/<command>.md
```

Legacy launcher/opencode data may still exist locally but is no longer used by Ampify.

## Development

```bash
npm install
npm run compile
npm run lint
```

- Watch mode: `npm run watch`
- Debug entry: `.vscode/launch.json` -> `调试扩展`
