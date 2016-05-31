var tabId = parseInt(window.location.search.substring(1));

window.addEventListener("load", function() {
  chrome.debugger.sendCommand({tabId:tabId}, "Network.enable");
  chrome.debugger.onEvent.addListener(onEvent);
});

window.addEventListener("unload", function() {

});

var requests = {};

function onEvent(debuggeeId, message, params) {
  if (tabId != debuggeeId.tabId)
    return;

  if (message == "Network.requestWillBeSent") {
    if (!requests[params.requestId]) {
      requests[params.requestId] = params.request;
    }
    if (params.redirectResponse){
      // Detect open redirection
      checkForOpenRedirect(params);
    }
  } else if (message == "Network.responseReceived") {
    if (params.requestId) {
      appendResponse(params.requestId, params.response);
    }
  }
}

function checkForOpenRedirect(params) {
  if (params['redirectResponse'] != undefined) {
    var requestUrl = params.redirectResponse.url;
    var redirectToUrl = params.redirectResponse.headers.location;
    var queryPairs = getQueryVariable(requestUrl);
    queryPairs.forEach(function(data) {
      var key = unescape(data[0]);
      var value = unescape(data[1]);
      if (value == redirectToUrl) {
        addRowToResult(requestUrl, JSON.stringify(params.redirectResponse,null,2), params.request.method, key + "=" + value, "Possible Open Redirect");
      }
    })
  }
}

function appendResponse(requestId, response) {
  chrome.debugger.sendCommand({
    tabId: tabId
  }, "Network.getResponseBody", {
    "requestId": requestId
  }, function(responseData) {
    if (chrome.runtime.lastError) {
    } else {
      handleResponse(responseData, response, requestId);  
    }
  });
}

function handleResponse(responseData, response, requestId) {
  if (!responseData) {
    return;
  }
  responseBody = responseData.body;

  var request = requests[requestId];
  var requestUrl = request.url;
  if (requestUrl.toLowerCase().startsWith("data:") || requestUrl.toLowerCase().startsWith("chrome-extension:") || requestUrl.toLowerCase().startsWith("javascript:")) {
    return;
  }

  var parsedUrl = parseURL(requestUrl);
  var parts = parsedUrl.path.split("/");
  parts.forEach(function(pathPart) {
      // Should check for reflection, but a lot of FP.
    });

  var params = getQueryVariable(requestUrl);
  var reflected = false;
  var reflectedParams = "";
  params.forEach(function(param) {
    var key = unescape(param[0]);
    var value = unescape(param[1]);
    var detectReflectionFromKeyOrValue = (key && responseBody.indexOf(key) > -1) || (value && responseBody.indexOf(value) > -1);

    if (key && responseBody.indexOf(key) > -1) {
      if (testArbitraryReflection(requestUrl, request.method, param[0])) {
        reflectedParams += "Key: " + key + "\n";
        reflected = true;
      }
    }
    if (value && responseBody.indexOf(value) > -1) {
      if (testArbitraryReflection(requestUrl, request.method, param[1])) {
        reflectedParams += "Value: " + value + "\n";
        reflected = true;
      }
    }

  });

  if (reflected) {
    addRowToResult(requestUrl, responseBody, request.method, reflectedParams, "");
  }
}

function addRowToResult(url, responseBody, method, params, comments) {
  var requestRow = document.createElement("tr");
  requestRow.className = "request";

  var dt = new Date();
  var utcDate = dt.toUTCString();
  var timeTd = document.createElement("td");
  timeTd.textContent = utcDate
  requestRow.appendChild(timeTd);

  var urlTd = document.createElement("td");
  urlTd.textContent = url;
  urlTd.className = "urlTd";

  var responseDiv = document.createElement("div");
  responseDiv.textContent = responseBody;
  responseDiv.hidden = true;
  $(urlTd).click(function() {$(responseDiv).toggle()});
  urlTd.appendChild(responseDiv);
  requestRow.appendChild(urlTd);

  var methodTd = document.createElement("td");
  methodTd.textContent = method;
  requestRow.appendChild(methodTd);

  var paramsTd = document.createElement("td");
  paramsTd.className = "params";
  paramsTd.textContent = params;
  requestRow.appendChild(paramsTd);

  var commentsTd = document.createElement("td");
  commentsTd.textContent = comments;
  requestRow.appendChild(commentsTd)
  document.getElementById("result").appendChild(requestRow);
}

function testArbitraryReflection(url, method, value) {
  if (method == "GET") {
    var randomNonce = Math.floor(Math.random() * 2147483647);
    var newUrl = replaceAll(url, value, randomNonce);

    var xhr = new XMLHttpRequest();

    xhr.open("GET", newUrl, false);
    xhr.send();
    var result = xhr.responseText;
    return result.indexOf(randomNonce) > -1;
  }
  // For now, return true to other method types.
  return true;
}

function replaceAll(original, oldChar, newChar) {
  while (original.indexOf(oldChar) > -1) {
    original = original.replace(oldChar, newChar);
  }
  return original
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