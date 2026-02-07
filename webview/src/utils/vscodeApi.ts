/**
 * VS Code API wrapper.
 * Provides a singleton accessor for the VS Code Webview API.
 */

let _vscodeApi: VsCodeApi | undefined

export function getVsCodeApi(): VsCodeApi {
  if (!_vscodeApi) {
    // In production (inside VS Code webview), acquireVsCodeApi is available globally
    if (typeof acquireVsCodeApi === 'function') {
      _vscodeApi = acquireVsCodeApi()
    } else {
      // Dev/mock mode — provide a stub for HMR dev server
      console.warn('[Ampify] acquireVsCodeApi not found — running in dev mode with mock API')
      _vscodeApi = {
        postMessage: (msg: unknown) => console.log('[Mock postMessage]', msg),
        getState: () => ({}),
        setState: (state: unknown) => console.log('[Mock setState]', state),
      }
    }
  }
  return _vscodeApi
}
