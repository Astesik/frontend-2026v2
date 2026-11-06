import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import crypto from 'node:crypto'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/services/api.ts', import.meta.url), 'utf8')
  .replaceAll('import.meta.env.VITE_API_BASE_URL', '""')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
const tokenKey = 'routewise.auth.token'
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function setup() {
  const storage = new Map([[tokenKey, 'old-access']]), listeners = [], calls = [], gate = deferred()
  let locks = Promise.resolve()
  const sharedLocks = { request(_name, callback) { const result = locks.then(callback); locks = result.catch(() => {}); return result } }
  function tab() {
    const handlers = [], state = { applied: [], cleared: 0 }
    listeners.push(handlers)
    const axios = {
      create() { return { defaults: { headers: { common: {} } }, interceptors: { request: { use() {} }, response: { use() {} } }, post() { calls.push('refresh'); return gate.promise } } },
      isAxiosError(error) { return error?.isAxiosError === true },
      AxiosHeaders: { from() { return { set() {} } } },
    }
    const module = { exports: {} }
    const localStorage = {
      getItem(key) { return storage.get(key) ?? null },
      setItem(key, value) { const old = storage.get(key); storage.set(key, value); if (old !== value) for (const target of listeners) if (target !== handlers) queueMicrotask(() => target.forEach(callback => callback({ key }))) },
      removeItem(key) { const existed = storage.delete(key); if (existed) for (const target of listeners) if (target !== handlers) queueMicrotask(() => target.forEach(callback => callback({ key }))) },
    }
    const sandbox = { module, exports: module.exports, localStorage, window: { addEventListener(name, callback) { if (name === 'storage') handlers.push(callback) } }, navigator: { locks: sharedLocks }, crypto: crypto.webcrypto, setTimeout, console,
      require(name) { if (name === 'axios') return axios; if (name.includes('uiStore')) return { useUiStore() { return { addToast() {} } } }; throw new Error(name) },
    }
    vm.runInNewContext(compiled, sandbox, { filename: 'api.js' })
    const api = module.exports
    api.registerAuthSessionHandlers({ setSession(session) { state.applied.push(session.token) }, clearSession() { state.cleared++ } })
    return { api, state }
  }
  return { tab, gate, calls, storage }
}

{
  const test = setup(), first = test.tab(), second = test.tab()
  const a = first.api.refreshAccessToken(), b = second.api.refreshAccessToken()
  await Promise.resolve(); test.gate.resolve({ data: { accessToken: 'new-access' } })
  assert.deepEqual(await Promise.all([a, b]), ['new-access', 'new-access'])
  assert.equal(test.calls.length, 1, 'Two tabs must rotate one cookie only once')
}
{
  const test = setup(), tab = test.tab(), refresh = tab.api.refreshAccessToken()
  await Promise.resolve()
  tab.api.invalidateAuthRequests(); tab.api.setAuthToken(null)
  test.gate.resolve({ data: { accessToken: 'late-access' } })
  assert.equal(await refresh, null)
  assert.equal(test.storage.has(tokenKey), false, 'Late refresh must not restore logged-out account')
  assert.equal(tab.state.applied.length, 0)
}
{
  const test = setup(), tab = test.tab(), refresh = tab.api.refreshAccessToken()
  await Promise.resolve(); test.gate.reject({ isAxiosError: true, response: { status: 429 } })
  await assert.rejects(refresh)
  assert.equal(test.storage.get(tokenKey), 'old-access', 'Rate limiting must retain local session')
  assert.equal(tab.state.cleared, 0)
}
{
  const test = setup(), tab = test.tab(), refresh = tab.api.refreshAccessToken()
  await Promise.resolve(); tab.api.invalidateAuthRequests(); tab.api.setAuthToken('other-account')
  test.gate.reject({ isAxiosError: true, response: { status: 401 } })
  assert.equal(await refresh, null)
  assert.equal(test.storage.get(tokenKey), 'other-account', 'An old rejected refresh must not clear a newer login')
}
console.log('Auth security: two-tab rotation, late refresh after logout, transient 429 and account generation guards OK.')
