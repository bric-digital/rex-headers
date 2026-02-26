import corePlugin from '@bric/rex-core/service-worker'
import headerPlugin from '@bric/rex-headers/service-worker'

console.log(`Imported ${corePlugin} into service worker context...`)
console.log(`Imported ${headerPlugin} into service worker context...`)

self.rexCorePlugin = corePlugin
self.rexHeaderPlugin = headerPlugin

corePlugin.setup()
