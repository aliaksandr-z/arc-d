var tabId = parseInt(window.location.search.substring(1));

window.addEventListener("load", function() {
  chrome.debugger.sendCommand({tabId:tabId}, "Network.enable");
  chrome.debugger.onEvent.addListener(onEvent);
});

window.addEventListener("unload", function() {
  chrome.debugger.detach({tabId:tabId});
  window.close();
});

var requests = {};

function onEvent(debuggeeId, message, params) {
  if (tabId != debuggeeId.tabId)
    return;

  if (message == "Network.requestWillBeSent") {
    if (!requests[params.requestId]) {
      requests[params.requestId] = params.request;
    }
    if (params.redirectResponse)
      appendResponse(params.requestId, params.redirectResponse);
  } else if (message == "Network.responseReceived") {
    appendResponse(params.requestId, params.response);
  }
}

function appendResponse(requestId, response, method) {
  chrome.debugger.sendCommand({
    tabId: tabId
  }, "Network.getResponseBody", {
    "requestId": requestId
  }, function(responseData) {
    responseBody = responseData.body;
    var request = requests[requestId];
    if (request.url.toLowerCase().startsWith("data:")){
      return;
    }
    var requestRow = document.createElement("tr");
    requestRow.className = "request";

    var urlTd = document.createElement("td");
    urlTd.textContent = request.url;
    requestRow.appendChild(urlTd);

    var methodTd = document.createElement("td");
    methodTd.textContent = request.method;
    requestRow.appendChild(methodTd);

    var paramsTd = document.createElement("td");
    paramsTd.className = "params";
    var params = getQueryVariable(request.url);
    var reflected = false;
    params.forEach(function(param) {
      var key = unescape(param[0]);
      var value = unescape(param[1]);
      paramsTd.textContent += (key?key:"") + " = " + (value?value:"");
      if ((key && responseBody.indexOf(key) > 0) || (value && responseBody.indexOf(value) > 0)) {
        paramsTd.textContent += " (Reflects)";
        reflected = true;
      }
      paramsTd.textContent += "\n";
    });

    requestRow.appendChild(paramsTd);
    if (reflected) {
      document.getElementById("result").appendChild(requestRow);
    }
  });
}

function formatHeaders(headers) {
  var text = "";
  for (name in headers)
    text += name + ": " + headers[name] + "\n";
  var div = document.createElement("div");
  div.textContent = text;
  return div;
}

function getQueryVariable(url) {
  var query = url.split("?").slice(1).join('?');
  var vars = query.split('&');
  var params = [];
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    params.push([pair[0],pair.slice(1).join("=")]);
  }
  return params;
}

function parseURL(url) {
  var result = {};
  var match = url.match(
                        /^([^:]+):\/\/([^\/:]*)(?::([\d]+))?(?:(\/[^#]*)(?:#(.*))?)?$/i);
  if (!match)
    return result;
  result.scheme = match[1].toLowerCase();
  result.host = match[2];
  result.port = match[3];
  result.path = match[4] || "/";
  result.fragment = match[5];
  return result;
}