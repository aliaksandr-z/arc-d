
var script = document.createElement('script');
script.innerHTML = "Object.defineProperty(Object, 'xss', {enumerable: false, value: function() {alert('a');}});";
document.body.appendChild(script);

