import { test, expect } from './fixtures';

test('Processing though service worker', async ({serviceWorker}) => {
  serviceWorker.evaluate(async () => {
    chrome.runtime.sendMessage({
      messageType: 'processContent',
      content: {}
    }).then((response) => {
      expect(response).toEqual({})
    })
  })
})