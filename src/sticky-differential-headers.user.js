// ==UserScript==
// @name           Sticky Differential Headers
// @version        1.1.0
// @description    Changes filenames in Differential into sticky headers.
// @match          https://secure.phabricator.com/*
// @match          https://phabricator.fb.com/*
// ==/UserScript==

function injectJS(callback) {
  var script = document.createElement('script');
  script.textContent = '(' + callback.toString() + ')(window);';
  document.body.appendChild(script);
}

function injectStyles(styles) {
  var style = document.createElement('style');
  style.innerHTML = styles;
  document.body.appendChild(style);
}

injectStyles(
  '.fake-header {' +
    'display: none;' +
  '}' +
  '.current-changeset .fake-header {' +
    'display: block;' +
    'height: 27px;' +
  '}' +
  '.current-changeset h1 {' +
    'position: fixed;' +
    'top: 0;' +
    'background: #fff;' +
    'padding: 5px 10px !important;' +
    'box-shadow: 0 0 2px 2px rgba(0, 0, 0, 0.5);' +
  '}'
);

injectJS(function(global) {

  /* UTILITIES */

  function $(selector, start) {
    return (start || document).querySelector(selector);
  }

  function $$(selector, start) {
    return JX.$A((start || document).querySelectorAll(selector));
  }

  /* INIT */

  $$('.differential-changeset').forEach(function(changeSet) {
    var h1 = $('h1', changeSet);
    var fakeHeader = JX.$N('div', {className: 'fake-header'});
    h1.parentNode.insertBefore(fakeHeader, h1);
  });

  var fixedChangeSet = null;

  function shouldFixChangeSet(changeSet) {
    return global.scrollY > changeSet.offsetTop - 10;
  }

  function fixChangeSet(changeSet) {
    if (changeSet !== fixedChangeSet) {
      unfixChangeSet();
      fixedChangeSet = changeSet;
      fixedChangeSet.className += ' current-changeset';
    }
  }

  function unfixChangeSet() {
    if (fixedChangeSet) {
      JX.DOM.alterClass(fixedChangeSet, 'current-changeset', false);
      fixedChangeSet = null;
    }
  }

  global.addEventListener('scroll', function() {
    var changeSets = $$('.differential-changeset');
    // Iterate in reverse to find the last changeset that should be fixed.
    var i = changeSets.length;
    while (i--) {
      var changeSet = changeSets[i];
      if (shouldFixChangeSet(changeSet)) {
        fixChangeSet(changeSet);
        return;
      }
    }
    // If we get here, no changesets should be fixed.
    unfixChangeSet();
  }, false);

});
