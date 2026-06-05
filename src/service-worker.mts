import { REXConfiguration } from '@bric/rex-core/common'
import rexCorePlugin, { REXServiceWorkerModule, registerREXModule } from '@bric/rex-core/service-worker'

import { overrideFetch, restoreFetch } from './fetch.mjs'

export interface RequestsConfiguration {
  enabled:boolean,
  debug?:boolean,
  headers?:HeadersConfiguration
  post?:POSTConfiguration
}

export interface HeaderPattern {
  pattern:string,
  header:string,
  value?:string,
  append?:boolean,
}

export interface POSTUpdateRule {
  pattern:string,
  key:string,
  value?:string,
  upsert?:boolean,
}

export interface HeadersConfiguration {
  patterns:HeaderPattern[],
}

export interface POSTConfiguration {
  rules:POSTUpdateRule[],
}

class REXHeadersModule extends REXServiceWorkerModule {
  enabled:boolean = true
  debug:boolean = false
  configuration:RequestsConfiguration|null = null
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
      requests: {
        enabled: 'Boolean, true if module is active, false otherwise.',
        debug: 'Boolean, true if debug logging is active, false otherwise.',
        headers: {
          patterns: [{
            pattern: 'URL pattern to match for header manipulation. See https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns for pattern syntax.',
            header: 'Name of the header to insert, replace, or remove.',
            value: '(Optional) Value of the header to insert or replace. Tokens such as <IDENTIFIER> may be used to inject local variables. If not present, the header is removed.'
          }]
        },
        post: {
          patterns: [{
            pattern: 'URL pattern to match for POST request manipulation. See https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns for pattern syntax.',
            header: 'Name of the header to insert, replace, or remove.',
            value: '(Optional) Value of the header to insert or replace. Tokens such as <IDENTIFIER> may be used to inject local variables. If not present, the header is removed.'
          }]
        }
      }
    }
  }

  refreshConfiguration() {
    rexCorePlugin.fetchConfiguration()
      .then((configuration:REXConfiguration) => {
        console.log('config')
        console.log(configuration)

        if (configuration !== undefined) {
          const requestsConfig = configuration['requests']

          if (requestsConfig !== undefined) {
            if (requestsConfig['debug'] !== undefined) {
              this.debug = requestsConfig['debug']
            }

            if (requestsConfig['enabled'] !== undefined) {
              this.enabled = requestsConfig['enabled']
            }

            if (this.debug) {
              console.log(`[rex-requests] Configuration:`)
              console.log(requestsConfig)
            }

            if (this.enabled) {
              overrideFetch()
            } else {
              restoreFetch()
            }

            // Before setting up, retrieve all variables available for substitution.

            rexCorePlugin.handleMessage({
              messageType: 'getIdentifier'
            }, this, (identifier) => {
              if (this.debug) {
                console.log(`[rex-requests] Fetched identifier:`)
                console.log(identifier)
              }

              if (identifier !== undefined) {
                this.variableMap['<IDENTIFIER>'] = `${identifier}`
              }

              this.updateConfiguration(requestsConfig)
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

  updateConfiguration(config:RequestsConfiguration) {
    this.configuration = config

    const headersConfig:HeadersConfiguration|undefined = this.configuration.headers

    if (headersConfig !== undefined) {
      chrome.declarativeNetRequest.getDynamicRules()
        .then((oldRules) => {
          const oldRuleIds:number[] = []

          for (const oldRule of oldRules) {
            if ('modifyHeaders' === oldRule.action.type) {
              oldRuleIds.push(oldRule.id)
            }
          }

          const newRules:chrome.declarativeNetRequest.Rule[] = []

          for (const pattern of headersConfig.patterns) {
            const newRule:chrome.declarativeNetRequest.ModifyHeaderInfo = {
              operation: 'set',
              header: pattern.header,
              value: ''
            }

            if (pattern.append) {
              newRule.operation = 'append'
            }

            if (pattern.value === undefined) {
              newRule.operation = 'remove'
            } else {
              newRule.value = this.injectValues(pattern.value)
            }

            const index = headersConfig.patterns.indexOf(pattern)
            const priority = headersConfig.patterns.length - index

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
            console.log(`[rex-requests] Using rules:`)
            console.log(newRules)
          }

          chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: oldRuleIds,
            addRules: newRules
          })
          .then(() => {
            if (this.debug) {
              console.log(`[rex-requests] Dynamic rules successfully updated. ${newRules.length} currently active.`)
            }

          }, (reason:any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.log(`[rex-requests] Unable to update modify header rules: ${reason}`)
          })
        })
    }
  }
}

const plugin = new REXHeadersModule()

registerREXModule(plugin)

export default plugin
