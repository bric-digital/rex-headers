import { test, expect } from './fixtures';

test('Service worker tests', async ({serviceWorker}) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      serviceWorker.evaluate(async () => {
        return new Promise<any>((testResolve) => {
          self.rexCorePlugin.handleMessage({
            'messageType': 'setIdentifier',
            'identifier': 'i-am-rex'
          }, this, (response:any) => {
            self.rexHeaderPlugin.refreshConfiguration()

            setTimeout(() => {
              const testUrl = 'http://localhost:3000/'

              fetch(testUrl).then((response:Response) => {
                  response.json().then((jsonResponse) => {
                    testResolve({
                      'response.ok': response.ok,
                      'user-agent': jsonResponse['user-agent'],
                      'x-rex-identifier': jsonResponse['x-rex-identifier']
                    })
                  })
                })
            }, 2500)
          })

        })
      })
      .then((workerResponse) => {
        expect(workerResponse['response.ok']).toStrictEqual(true)
        expect(workerResponse['user-agent']).toEqual('REX Headers Test Extension')
        expect(workerResponse['x-rex-identifier']).toEqual('i-am-rex')

        resolve()
      })
    }, 5000)
  })
})