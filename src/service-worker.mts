import { matchPattern } from 'browser-extension-url-match'
import { REXConfiguration } from '@bric/rex-core/extension'
import rexCorePlugin, { REXServiceWorkerModule, registerREXModule } from '@bric/rex-core/service-worker'

export interface HeaderPattern {
  pattern:string,
  header:string,
  value?:string,
}

export interface HeadersConfiguration {
  enabled:boolean,
  debug?:boolean,
  patterns:HeaderPattern[],
}

class REXHeadersModule extends REXServiceWorkerModule {
  debug:boolean = false
  configuration:HeadersConfiguration
  variableMap:{string?: string} = {}

  constructor() {
    super()
  }

  moduleName() {
    return 'HeadersModule'
  }

  setup() {
    this.refreshConfiguration()
  }

  configurationDetails():any { // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      headers: {
        enabled: 'Boolean, true if module is active, false otherwise.',
        debug: 'Boolean, true if debug logging is active, false otherwise.',
        patterns: [{
          pattern: 'URL pattern to match for header manipulation. See https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns for pattern syntax.',
          header: 'Name of the header to insert, replace, or remove.',
          value: '(Optional) Value of the header to insert or replace. Tokens such as <IDENTIFIER> may be used to inject local variables. If not present, the header is removed.'
        }]
      }
    }
  }

  refreshConfiguration() {
    rexCorePlugin.fetchConfiguration()
      .then((configuration:REXConfiguration) => {
        if (configuration !== undefined) {
          const headersConfig = configuration['headers']

          if (this.debug) {
            console.log(`[Headers] Configuration:`)
            console.log(headersConfig)
          }

          if (headersConfig !== undefined) {
            // Before setting up, retrieve all variables available for substitution.

            rexCorePlugin.handleMessage({
              messageType: 'getIdentifier'
            }, this, (identifier) => {
              this.variableMap['<IDENTIFIER>'] = identifier

              this.updateConfiguration(headersConfig)
            })

            return
          }
        }

        setTimeout(() => {
          this.refreshConfiguration()
        }, 1000)
      })
  }

  injectValues(headerValue:string|undefined):string|undefined {
    if (headerValue === undefined) {
      return undefined
    }

    for (const key of Object.keys(this.variableMap)) {
      if (headerValue.includes(key)) {
        headerValue = headerValue.replaceAll(key, this.variableMap[key])
      }
    }

    return headerValue
  }

  updateConfiguration(config:HeadersConfiguration) {
    this.configuration = config

    const urlPatterns = []

    for (const pattern of this.configuration.patterns) {
      if (urlPatterns.includes(pattern.pattern) === false) {
        urlPatterns.push(pattern.pattern)
      }
    }

    chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
      const newHeaders = []

      for (const header of details.requestHeaders) {
        newHeaders.push(header)
      }

      for (const pattern of this.configuration.patterns) {
        const matcher = matchPattern(pattern.pattern).assertValid()

        if (matcher.match(details.url)) {
          const name:string = pattern.header
          const value:string|undefined = this.injectValues(pattern.value)

          let foundAt:number = -1
          let remove:boolean = false

          for (const header of newHeaders) {
            if (header.name === name) {
              foundAt = newHeaders.indexOf(header)

              if (value === undefined) {
                remove = true
              }
            }
          }

          if (foundAt === -1 && value !== undefined) {
            newHeaders.push({
              name: name,
              value: value
            })
          } else if (remove) {
            newHeaders.splice(foundAt, 1)
          } else {
            newHeaders[foundAt] = {
              name: name,
              value: value
            }
          }
        }
      }

      return {
        requestHeaders: newHeaders
      }
    }, {
      urls: urlPatterns
    }, ['requestHeaders'])
  }

  handleMessage(message:any, sender:any, sendResponse:(response:any) => void):boolean { // eslint-disable-line @typescript-eslint/no-explicit-any
    return false
  }
}

const plugin = new REXHeadersModule()

registerREXModule(plugin)

export default plugin
