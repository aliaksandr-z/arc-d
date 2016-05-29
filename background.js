var version = "1.1";

chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.debugger.attach({tabId:tab.id}, version,
      onAttach.bind(null, tab.id));
});

function onAttach(tabId) {
  if (chrome.runtime.lastError) {
    alert(chrome.runtime.lastError.message);
    return;
  }

  chrome.tabs.create(
      {url: "results.html?" + tabId});
}
