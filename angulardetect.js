function injectXssMethod() {
  var triggered = false;
  Object.defineProperty(Object.prototype, 'xss', {
    value: function() {
      if (!triggered) {
        alert("Angular XSS: " + document.domain);
        triggered = true;
      } else {
        console.log("Alert already triggered on" + document.domain);
      }
    },
    enumerable: false,
    writable: true,
    configurable: true
  });
}

var code = "(" + injectXssMethod.toString() + ")()";
var script = document.createElement("script");
script.innerText = code;
document.documentElement.appendChild(script);
document.documentElement.removeChild(script);