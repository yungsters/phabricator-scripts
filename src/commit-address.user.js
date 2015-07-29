// ==UserScript==
// @name           Phabricator: Commit Addresses
// @version        0.1.0
// @description    Adds diff commits (if any) to the address bar.
// @match          https://secure.phabricator.com/*
// @match          https://phabricator.fb.com/*
// ==/UserScript==

function injectJS(callback) {
  var script = document.createElement('script');
  script.textContent = '(' + callback.toString() + ')(window);';
  document.body.appendChild(script);
}

injectJS(function(global) {

  /* UTILITIES */

  function $(selector, start) {
    return (start || document).querySelector(selector);
  }

  function $$(selector, start) {
    return JX.$A((start || document).querySelectorAll(selector));
  }

  /* INIT */

  if (document.location.hash) {
    return;
  }

  var commit;
  var commitDT = $$('.phui-property-list-properties .phui-property-list-key')
    .find(function(dt) {
      return dt.textContent.includes('Commits');
    });
  if (commitDT) {
    var commitLink = $('.phui-handle', commitDT.nextSibling);
    if (commitLink) {
      commit = commitLink.getAttribute('href').replace(/^\/+/, '');
    }
  }

  if (commit) {
    history.replaceState({}, '', '#' + commit);
  }

});
