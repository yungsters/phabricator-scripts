// ==UserScript==
// @name           Phabricator: Mark Diffs as Read
// @version        0.0.3
// @description    Adds a "Mark as Read" toggle to diffs in Phabricator
// @match          https://secure.phabricator.com/*
// @match          https://phabricator.fb.com/*
// ==/UserScript==

function injectJS(callback) {
  var script = document.createElement('script');
  script.textContent = '(' + callback.toString() + ')(window);';
  document.body.appendChild(script);
}

function injectCSS(href) {
  var link = document.createElement('link');
  link.setAttribute('href', href);
  link.setAttribute('rel', 'stylesheet');
  document.head.appendChild(link);
}

function injectStyles(styles) {
  var style = document.createElement('style');
  style.innerHTML = styles;
  document.body.appendChild(style);
}

// Courtesy of BootstrapCDN.
// injectCSS('//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.0/css/bootstrap-combined.min.css');
var spriteURL = '//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.0/img/glyphicons-halflings.png';

injectStyles(
  '[class^="icon-"], [class*=" icon-"] {' +
    'display: inline-block;' +
    'width: 14px;' +
    'height: 14px;' +
    '*margin-right: .3em;' +
    'line-height: 14px;' +
    'vertical-align: text-top;' +
    'background-image: url("' + spriteURL + '");' +
    'background-position: 14px 14px;' +
    'background-repeat: no-repeat;' +
    'margin-top: 1px;' +
  '}' +
  '.icon-eye-close {' +
    'background-position: -120px -120px;' +
  '}' +
  '.icon-eye-open {' +
    'background-position: -96px -120px;' +
  '}'
);

injectStyles(
  '.hidden-row {' +
    'display: none;' +
  '}' +
  '.hide-icon {' +
    'border: 1px solid transparent;' +
    'cursor: pointer;' +
    'margin-right: 15px;' +
    'visibility: hidden;' +
  '}' +
  '.hideable-row .phabricator-flag-icon {' +
    'position: absolute;' +
    'margin-left: 25px;' +
  '}' +
  '.hideable-row:hover .hide-icon {' +
    'visibility: visible;' +
  '}' +
  '.hide-control {' +
    'float: right;' +
    'line-height: 25px;' +
    'margin-left: 0.5em;' +
  '}' +
  '.hide-control input {' +
    'display: inline-block;' +
    'width: auto;' +
  '}' +
  '.show-hidden-rows .hidden-row {' +
    'display: block;' +
    'opacity: 0.5;' +
  '}' +
  '.show-hidden-rows .hide-icon {' +
    'visibility: visible;' +
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

  var ScriptStorage = global.ScriptStorage = {
    get: function(key) {
      var item;
      try {
        item = JSON.parse(localStorage.getItem(key));
      } catch (e) {}
      return item && typeof item === 'object' ? item : {};
    },
    set: function(key, item) {
      localStorage.setItem(key, JSON.stringify(item));
    }
  };

  /* INIT */

  (function() {
    var submitControls = $(
      '.aphront-list-filter-view .aphront-list-filter-reveal'
    );
    if (submitControls) {
      var checkbox = JX.$N('input', {type: 'checkbox', sigil: 'toggle-hide'});
      JX.DOM.prependContent(
        submitControls,
        JX.$N('div', {className: 'hide-control'}, [
          JX.$N(
            'label',
            {htmlFor: JX.DOM.uniqID(checkbox)},
            'Show Read Diffs '
          ),
          checkbox
        ])
      );
    }
  })();

  function flushStorageToView() {
    var hiddenDiffs = ScriptStorage.get('hiddendiffs');

    $$('.phui-object-item-list-view').forEach(function(listView) {
      var rows = JX.DOM.scry(listView, 'li');

      rows.forEach(function(row, index) {
        var itemNameNode = $$('.phui-object-item-name', row)[0];
        var diffIDNode = $$('.phui-object-item-objname', row)[0];

        var timeNodes = $$('.phui-object-item-icon-label', row);
        var timeNode = timeNodes[timeNodes.length - 1];

        if (!timeNode || !diffIDNode) return;

        JX.DOM.alterClass(row, 'hideable-row', true);

        var cellID = diffIDNode.innerHTML;
        var timeString = timeNode.innerHTML;
        var isHidden =
          hiddenDiffs[cellID] && hiddenDiffs[cellID] === timeString;

        var hideLink =
          JX.$N('i', {
            className:
              'hide-icon ' + (isHidden ? 'icon-eye-close' : 'icon-eye-open'),
            sigil: 'hide-link',
            meta: {
              isHidden: isHidden,
              cellID: cellID,
              time: timeString
            }
          });

        var prevLink = JX.DOM.scry(itemNameNode, 'i', 'hide-link')[0];
        if (prevLink) {
          JX.DOM.replace(prevLink, hideLink);
        } else {
          JX.DOM.prependContent(itemNameNode, hideLink);
        }
        JX.DOM.alterClass(row, 'hidden-row', isHidden);
      });
    });
  }

  JX.Stratcom.listen('mousedown', 'hide-link', function(event) {
    var hideLink = event.getNodeData('hide-link');
    var cellID = hideLink.cellID;
    var updatedTime = hideLink.time;

    var hiddenDiffs = ScriptStorage.get('hiddendiffs');

    if (hiddenDiffs[cellID] && hiddenDiffs[cellID] === updatedTime) {
      delete hiddenDiffs[cellID];
    } else {
      hiddenDiffs[cellID] = updatedTime;
    }

    ScriptStorage.set('hiddendiffs', hiddenDiffs);
    flushStorageToView();

    event.prevent();
  });

  JX.Stratcom.listen('change', 'toggle-hide', function(event) {
    var checkbox = event.getNode('toggle-hide');
    JX.DOM.alterClass(document.body, 'show-hidden-rows', checkbox.checked);
  });

  if (JX.Tooltip) {
    JX.Stratcom.listen(
      ['mouseover', 'mouseout', 'mousedown'],
      'hide-link',
      function(event) {
        if (event.getType() === 'mouseover') {
          var isHidden = event.getNodeData('hide-link').isHidden;
          JX.Tooltip.show(
            event.getNode('hide-link'),
            1000,
            'W',
             isHidden ? 'Mark as Unread' : 'Mark as Read'
          );
        } else {
          JX.Tooltip.hide();
        }
      }
    );
  }

  flushStorageToView();

});
