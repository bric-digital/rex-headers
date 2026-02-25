import { test as base, chromium, type BrowserContext } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url';

export const test = base.extend<{
  context: BrowserContext
  extensionId: string,
  serviceWorker,
}>({
  context: async ({ }, use) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const pathToExtension = path.join(__dirname, '../dist/extension')

    console.log(`pathToExtension: ${pathToExtension}`)
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    setTimeout(() => {
      console.log('Keeping browser around')
      context.close();
    }, 10000)

    await use(context);
  },
  extensionId: async ({ context }, use) => {
    // for manifest v3:
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker)
      serviceWorker = await context.waitForEvent('serviceworker');

    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },
  serviceWorker: async ({ context }, use) => {
    // for manifest v3:
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }

    use(serviceWorker)
      .then(() => {
        console.log('Keeping browser around')
        serviceWorker.close();
      })
  },

});

export const expect = test.expect;



// test.describe('HistoryServiceWorkerModule — Option C (real extension)', () => {
//   // Run tests in definition order so stateful operations (inject config, trigger
//   // collection) compose correctly across the shared context.
//   test.describe.configure({ mode: 'serial' })

//   let context: BrowserContext
//   let serviceWorker: Worker
//   let userDataDir: string

//   test.beforeAll(async () => {
//     const extensionPath = path.join(__dirname, '../extension')
//     userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-history-ext-'))

//     context = await chromium.launchPersistentContext(userDataDir, {
//       headless: false,
//       args: [
//         `--disable-extensions-except=${extensionPath}`,
//         `--load-extension=${extensionPath}`,
//       ],
//     })

//     // Use an already-active worker when available; otherwise wait for the
//     // 'serviceworker' event.  A single launchPersistentContext means the
//     // race (SW registers before the listener is attached) only needs to be
//     // handled once here rather than once per test.
//     serviceWorker =
//       context.serviceWorkers()[0] ??
//       await context.waitForEvent('serviceworker', { timeout: 30_000 })

//     // Ensure the module's initial setup() has completed before any test runs.
//     await waitForSetupComplete(serviceWorker)
//   })

//   test.afterAll(async () => {
//     await context?.close()
//     if (userDataDir) {
//       fs.rmSync(userDataDir, { recursive: true, force: true })
//     }
//   })

//   test('service worker starts and writes initial status to chrome.storage', async () => {
//     const status = await serviceWorker.evaluate(async () => {
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       const result = await (globalThis as any).chrome.storage.local.get('webmunkHistoryStatus')
//       return result.webmunkHistoryStatus
//     })

//     expect(status).toBeTruthy()
//     expect(status.isCollecting).toBe(false)
//   })

