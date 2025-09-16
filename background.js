chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'http://raz1ner.com/post/FB-Preview-Link-Converter/' })
  }
})
