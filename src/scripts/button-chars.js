// -----------------------------------------
// BUTTON CHARACTER STAGGER
// Wraps each character in a span with incremental transition-delay
// Attribute: [data-button-animate-chars]
// -----------------------------------------

let processedButtons = [];

export function initButtonChars(scope) {
  scope = scope || document;
  var buttons = scope.querySelectorAll('[data-button-animate-chars]');
  if (!buttons.length) return;

  var offsetIncrement = 0.01;

  buttons.forEach(function (button) {
    if (button.__originalText) return; // already processed

    var text = button.textContent;
    button.__originalText = text;
    button.innerHTML = '';

    [...text].forEach(function (char, index) {
      var span = document.createElement('span');
      span.textContent = char;
      span.style.transitionDelay = index * offsetIncrement + 's';

      if (char === ' ') {
        span.style.whiteSpace = 'pre';
      }

      button.appendChild(span);
    });

    processedButtons.push(button);
  });
}

export function destroyButtonChars() {
  processedButtons.forEach(function (button) {
    if (button.__originalText) {
      button.textContent = button.__originalText;
      delete button.__originalText;
    }
  });
  processedButtons = [];
}
