const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'out');

const PROBE_FILE_PARTS = [
  ['common', '_ampify_probe.txt'],
  ['common', 'ai', '_ampify_probe.txt'],
  ['common', 'git', '_ampify_probe.txt'],
  ['modules', 'mainView', 'bridges', '_ampify_probe.txt']
];

function probeOutWriteAccess() {
  for (const parts of PROBE_FILE_PARTS) {
    const filePath = path.join(outDir, ...parts);
    const dirPath = path.dirname(filePath);

    try {
      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(filePath, 'probe', 'utf8');
      fs.rmSync(filePath, { force: true });
    } catch (error) {
      return {
        ok: false,
        filePath,
        error
      };
    }
  }

  return { ok: true };
}

function tryRepairOutDir() {
  try {
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error
    };
  }
}

function ensureWindowsOutWritable() {
  fs.mkdirSync(outDir, { recursive: true });

  let probeResult = probeOutWriteAccess();
  if (probeResult.ok) {
    return { ok: true, repaired: false };
  }

  const repairResult = tryRepairOutDir();
  if (!repairResult.ok) {
    return {
      ok: false,
      stage: 'repair',
      probeResult,
      error: repairResult.error
    };
  }

  probeResult = probeOutWriteAccess();
  if (probeResult.ok) {
    return { ok: true, repaired: true };
  }

  return {
    ok: false,
    stage: 'probe-after-repair',
    probeResult,
    error: probeResult.error
  };
}

function printFailure(result) {
  const code = result.error && result.error.code ? result.error.code : 'UNKNOWN';
  const message = result.error && result.error.message ? result.error.message : String(result.error);

  console.error('[ampify] Windows out directory precheck failed.');
  console.error(`[ampify] stage: ${result.stage}, code: ${code}`);
  console.error(`[ampify] message: ${message}`);

  if (result.probeResult && result.probeResult.filePath) {
    console.error(`[ampify] probe path: ${result.probeResult.filePath}`);
  }

  console.error('[ampify] Suggested actions:');
  console.error('  1) Stop running extension debug sessions/watch processes that may lock out/*.js');
  console.error('  2) Retry: npm run compile:extension');
  console.error('  3) If still blocked, restart VS Code terminal and retry');
}

if (process.platform !== 'win32') {
  process.exit(0);
}

try {
  const result = ensureWindowsOutWritable();

  if (!result.ok) {
    printFailure(result);
    process.exit(1);
  }

  if (result.repaired) {
    console.log('[ampify] Windows out directory was repaired before compile.');
  }
} catch (error) {
  const code = error && error.code ? error.code : 'UNKNOWN';
  const message = error && error.message ? error.message : String(error);

  console.error('[ampify] Unexpected precheck error.');
  console.error(`[ampify] code: ${code}`);
  console.error(`[ampify] message: ${message}`);
  process.exit(1);
}
