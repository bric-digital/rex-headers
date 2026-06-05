import { test, expect } from './fixtures';

test('Service worker POST tests: Insert on empty payload', async ({serviceWorker}) => {
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
              const testUrl = 'http://localhost:3000/post'

              fetch(testUrl, {
                method: 'POST'
              }).then((response:Response) => {
                  response.json().then((jsonResponse) => {
                    testResolve(jsonResponse)
                  })
                })
            }, 2500)
          })
        })
      })
      .then((workerResponse) => {
        expect(workerResponse['foo']).toEqual('baz')
        expect(workerResponse['hello']).toEqual(undefined)

        resolve()
      })
    }, 5000)
  })
})


test('Service worker POST tests: Existing payload (form data)', async ({serviceWorker}) => {
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
              const testUrl = 'http://localhost:3000/post'

              const formData = new FormData()

              formData.set('foo', 'bar')
              formData.set('hello', 'globe')
              formData.set('delete-me', 'right-away')

              fetch(testUrl, {
                method: 'POST',
                body: formData
              }).then((response:Response) => {
                  response.json().then((jsonResponse) => {
                    testResolve(jsonResponse)
                  })
                })
            }, 2500)
          })
        })
      })
      .then((workerResponse) => {
        expect(workerResponse['foo']).toEqual('baz')
        expect(workerResponse['hello']).toEqual('world')
        expect(workerResponse['delete-me']).toEqual(undefined)

        resolve()
      })
    }, 5000)
  })
})

test('Service worker POST tests: Existing payload (URL search params)', async ({serviceWorker}) => {
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
              const testUrl = 'http://localhost:3000/post'

              const searchParams = new URLSearchParams()

              searchParams.set('foo', 'bar')
              searchParams.set('hello', 'globe')
              searchParams.set('delete-me', 'right-away')

              fetch(testUrl, {
                method: 'POST',
                body: searchParams
              }).then((response:Response) => {
                  response.json().then((jsonResponse) => {
                    testResolve(jsonResponse)
                  })
                })
            }, 2500)
          })
        })
      })
      .then((workerResponse) => {
        expect(workerResponse['foo']).toEqual('baz')
        expect(workerResponse['hello']).toEqual('world')
        expect(workerResponse['delete-me']).toEqual(undefined)

        resolve()
      })
    }, 5000)
  })
})
