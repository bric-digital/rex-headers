// Code heavily adapted from the Innsman project: https://github.com/vvmgev/Inssman/

export function restoreFetch() {
  if (self['originalFetch'] !== undefined) {
    // @ts-expect-error Restoring fetch to its original implementation.
    fetch = self['originalFetch'] // eslint-disable-line no-global-assign
  }
}

export function overrideFetch() {
  if (self['originalFetch'] === undefined) {
    self['originalFetch'] = fetch

    // @ts-expect-error Wrapping origina fetch to intercept and modify payloads.
    fetch = (...args) => { // eslint-disable-line no-global-assign
      return new Promise<Response>((resolve, reject) => {
        console.log('[rex-requests]: Using new fetch:')
        console.log(args)

        const [resource, initOptions = {}] = args

        let request;

        if (resource instanceof Request) {
          request = resource.clone();
        } else {
          request = new Request(resource.toString(), initOptions);
        }

        if (request.method === 'POST') {
          if (request.body !== null) {
            request.text()
              .then((readResult) => {
                if (readResult.includes('Content-Disposition: form-data;')) {
                  const originalBoundary = readResult.slice(2, readResult.indexOf('\r\n'))

                  new Response(readResult, {
                    headers: {
                      'Content-Type': `multipart/form-data; boundary=${originalBoundary}`
                    }
                  }).formData()
                    .then((formData:FormData) => {
                      const newFormData = new FormData()

                      for (const pair of formData.entries()) {
                        const key = pair[0]
                        let value = pair[1]

                        if (key === 'hello') {
                          value = 'world'
                        }

                        newFormData.set(key, value)
                      }

                      newFormData.set('foo', 'baz')
                      newFormData.delete('delete-me')

                      const formResponse = new Response(newFormData)

                      formResponse.text()
                        .then((rawFormData) => {
                          const newBoundary = rawFormData.slice(2, rawFormData.indexOf('\r\n'))

                          rawFormData = rawFormData.replaceAll(newBoundary, originalBoundary)

                          request = new Request(request.url, {
                            method: request.method,
                            body: rawFormData,
                            headers: request.headers,
                            referrer: request.referrer,
                            referrerPolicy: request.referrerPolicy,
                            mode: request.mode,
                            credentials: request.credentials,
                            cache: request.cache,
                            redirect: request.redirect,
                            integrity: request.integrity,
                          });

                          self['originalFetch'](request)
                            .then((response) => {
                              console.log('[rex-requests]: Returning response...')
                              resolve(response)
                            })
                            .catch((error) => {
                              reject(error)
                            })

                        })
                    })
                } else {
                  try {
                    JSON.parse(readResult)

                    // TODO: Deal with JSON
                  } catch (error) {
                    if (error instanceof SyntaxError) {
                      // Must be URL-encoded string

                      const newSearchParams = new URLSearchParams(readResult)

                      for (const pair of newSearchParams.entries()) {
                        const key = pair[0]
                        let value = pair[1]

                        if (key === 'hello') {
                          value = 'world'
                        }

                        newSearchParams.set(key, value)
                      }

                      newSearchParams.set('foo', 'baz')
                      newSearchParams.delete('delete-me')

                      request = new Request(request.url, {
                        method: request.method,
                        body: newSearchParams,
                        headers: request.headers,
                        referrer: request.referrer,
                        referrerPolicy: request.referrerPolicy,
                        mode: request.mode,
                        credentials: request.credentials,
                        cache: request.cache,
                        redirect: request.redirect,
                        integrity: request.integrity,
                      });

                      self['originalFetch'](request)
                        .then((response) => {
                          console.log('[rex-requests]: Returning response...')
                          resolve(response)
                        })
                        .catch((error) => {
                          reject(error)
                        })
                    } else {
                      throw(error)
                    }
                  }
                }
              }).catch((error) => {
                reject(error)
              })
          } else {
            console.log('null body')

            const newSearchParams = new URLSearchParams()

            newSearchParams.set('foo', 'baz')
            newSearchParams.delete('delete-me')

            request = new Request(request.url, {
              method: request.method,
              body: newSearchParams,
              headers: request.headers,
              referrer: request.referrer,
              referrerPolicy: request.referrerPolicy,
              mode: request.mode,
              credentials: request.credentials,
              cache: request.cache,
              redirect: request.redirect,
              integrity: request.integrity,
            });

            self['originalFetch'](request)
              .then((response) => {
                console.log('[rex-requests]: Returning response...')
                resolve(response)
              })
              .catch((error) => {
                reject(error)
              })
          }
        } else {
          self['originalFetch'](request)
            .then((response) => {
              console.log('[rex-requests]: Returning response...')
              resolve(response)
            })
            .catch((error) => {
              reject(error)
            })
        }
      })
    }
  }
}