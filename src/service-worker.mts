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

const listHeaders = [
  // 'accept',
  // 'accept-encoding',
  // 'accept-language',
  // 'access-control-request-headers',
  // 'cache-control',
  // 'connection',
  // 'content-language',
  // 'cookie',
  // 'forwarded',
  // 'if-match',
  // 'if-none-match',
  // 'keep-alive',
  // 'range',
  // 'te',
  // 'trailer',
  // 'transfer-encoding',
  // 'upgrade',
  // 'user-agent',
  // 'via',
  // 'want-digest',
  // 'x-forwarded-for',
]

class REXHeadersModule extends REXServiceWorkerModule {
  enabled:boolean = true
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

    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((matchedRule) => {
      if (this.debug) {
        console.log(`[rex-headers] Matched Rule:`)
        console.log(matchedRule)
      }
    })
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
        console.log('config')
        console.log(configuration)

        if (configuration !== undefined) {
          const headersConfig = configuration['headers']

          if (headersConfig['debug'] !== undefined) {
            this.debug = headersConfig['debug']
          }

          if (headersConfig['enabled'] !== undefined) {
            this.enabled = headersConfig['enabled']
          }

          if (this.debug) {
            console.log(`[rex-headers] Configuration:`)
            console.log(headersConfig)
          }

          if (headersConfig !== undefined) {
            // Before setting up, retrieve all variables available for substitution.

            rexCorePlugin.handleMessage({
              messageType: 'getIdentifier'
            }, this, (identifier) => {
              if (identifier !== undefined) {
                this.variableMap['<IDENTIFIER>'] = `${identifier}`
              }

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

    chrome.declarativeNetRequest.getDynamicRules()
      .then((oldRules) => {
        const oldRuleIds = []

        for (const oldRule of oldRules) {
          if ('modifyHeaders' === oldRule.action.type) {
            oldRuleIds.push(oldRule.id)
          }
        }

        const newRules = []

        for (const pattern of this.configuration.patterns) {
          const newRule = {
            operation: 'set',
            header: pattern.header,
            value: ''
          }

          if (listHeaders.includes(pattern.header.toLowerCase())) {
            newRule.operation = 'append'
          }

          if (pattern.value === undefined) {
            newRule.operation = 'remove'
          } else {
            newRule.value = this.injectValues(pattern.value)
          }

          const index = this.configuration.patterns.indexOf(pattern)
          const priority = this.configuration.patterns.length - index

          newRules.push({
            id: index + 1,
            priority: priority,
            action: {
              type: 'modifyHeaders',
              requestHeaders: [newRule]
            },
            condition: {
              urlFilter: pattern.pattern,
              resourceTypes: [
                'main_frame',
                'sub_frame',
                'stylesheet',
                'script',
                'image',
                'font',
                'object',
                'xmlhttprequest',
                'ping',
                'csp_report',
                'media',
                'websocket',
                'webtransport',
                'webbundle',
                'other',
              ]
            },
          })
        }

        if (this.debug) {
          console.log(`[rex-headers] Using rules:`)
          console.log(newRules)
        }

        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: oldRuleIds,
          addRules: newRules
        })
        .then(() => {
          if (this.debug) {
            console.log(`[rex-headers] Dynamic rules successfully updated. ${newRules.length} currently active.`)
          }

        }, (reason:any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          console.log(`[rex-headers] Unable to update modify header rules: ${reason}`)
        })
      })
  }
}

const plugin = new REXHeadersModule()

registerREXModule(plugin)

export default plugin
