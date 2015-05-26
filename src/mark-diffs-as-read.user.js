// ==UserScript==
// @name           Phabricator: Mark Diffs as Read
// @version        0.4.1
// @description    Adds a "Mark as Read" toggle to diffs in Phabricator
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

// Courtesy of BootstrapCDN.
// injectCSS('//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.0/css/bootstrap-combined.min.css');
var spriteURL = '//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.0/img/glyphicons-halflings.png';

injectStyles(
  '.glyph {' +
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
  '.glyph.glyph-eye-close {' +
    'background-position: -120px -120px;' +
  '}' +
  '.glyph.glyph-eye-open {' +
    'background-position: -96px -120px;' +
  '}' +
  '.glyph.glyph-gray {' +
    'opacity: 0.5;' +
  '}'
);

injectStyles(
  '.hidden-row {' +
    'display: none;' +
  '}' +
  '.phui-object-item-icon-label .glyph.hide-icon {' +
    'border: 1px solid transparent;' +
    'cursor: pointer;' +
    'margin: -2px 0 0 4px;' +
    'vertical-align: text-top;' +
  '}' +
  '.hide-control {' +
    'color: #74777D;' +
    'line-height: 25px;' +
    'position: absolute;' +
    'right: 33px;' +
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
  '}' +
  '.all-hidden-view {' +
    'border: 1px solid #c7ccd9;' +
    'border-bottom: 1px solid #a1a6b0;' +
    'background-color: #fff;' +
    'color: #6b748c;' +
    'margin: 4px 0 8px 0;' +
  '}' +
  '.all-hidden-view-body {' +
    'color: #6b748c;' +
    'padding: 12px;' +
  '}' +
  '.show-hidden-rows .all-hidden {' +
    'display: none;' +
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
    subscribe: function(key, callback) {
      var handleStorageChange = function(event) {
        if (event.key === key) {
          callback(event);
        }
      };
      window.addEventListener('storage', handleStorageChange, false);
      return {
        unsubscribe: function() {
          if (handleStorageChange) {
            window.removeEventListener('storage', handleStorageChange, false);
            handleStorageChange = null;
          }
        }
      };
    },
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

    /**
     * List View
     */
    $$('.phui-object-item-list-view').forEach(function(listView) {
      var rows = JX.DOM.scry(listView, 'li');

      var hasRows = false;
      var isEmpty = true;

      rows.filter(function(row) {
        return row.parentNode === listView;
      }).forEach(function(row, index) {
        var diffIDNode = $$('.phui-object-item-objname', row)[0];
        var timeNode = JX.DOM.scry(row, 'span', 'time-label')[0];

        if (!timeNode) {
          var labelNodes = $$('.phui-object-item-icon-label', row);
          if (labelNodes.length) {
            timeNode = labelNodes[labelNodes.length - 1];
            JX.Stratcom.addSigil(timeNode, 'time-label');
          }
        }

        if (!timeNode || !diffIDNode) {
          return;
        }

        var cellID = diffIDNode.textContent;
        var timeString = timeNode.textContent;
        var isHidden =
          hiddenDiffs[cellID] && hiddenDiffs[cellID] === timeString;

        if (!isHidden) {
          isEmpty = false;
        }
        hasRows = true;

        var hideLinkNode =
          JX.$N('i', {
            className:
              'hide-icon glyph glyph-gray ' + (
                isHidden ? 'glyph-eye-close' : 'glyph-eye-open'
              ),
            sigil: 'hide-link',
            meta: {
              isHidden: isHidden,
              cellID: cellID,
              time: timeString
            }
          });

        var labelContainerNode = timeNode.parentNode;
        var prevLink = JX.DOM.scry(labelContainerNode, 'i', 'hide-link')[0];
        if (prevLink) {
          JX.DOM.replace(prevLink, hideLinkNode);
        } else {
          var hideLabelNode = JX.$N(
            'span',
            {className: 'phui-object-item-icon-label'},
            hideLinkNode
          );
          JX.DOM.appendContent(labelContainerNode, hideLabelNode);
        }
        JX.DOM.alterClass(row, 'hidden-row', isHidden);
      });

      var emptyNode = $$('.all-hidden', listView)[0];
      if (isEmpty && hasRows) {
        if (!emptyNode) {
          emptyNode = JX.$N('li', {
            className: 'all-hidden phabricatordefault-li'
          }, [
            JX.$N('div', {
              className: 'all-hidden-view phabricatordefault-div'
            },
              JX.$N('div', {
                className: 'all-hidden-view-body phabricatordefault-div'
              }, [
                'All revisions are marked as ',
                JX.$N('i', {
                  className: 'hide-icon glyph glyph-gray glyph-eye-close'
                }),
                ' read.'
              ])
            )
          ]);
        }
        JX.DOM.appendContent(listView, emptyNode);
      } else {
        if (emptyNode) {
          JX.DOM.remove(emptyNode);
        }
      }
    });

    /**
     * Diff View
     */
    $$('.phui-header-subheader').forEach(function(headerNode) {
      var diffIDNode = $$('.phabricator-last-crumb .phabricator-crumb-name')[0];
      var timeContainerNodes = $$('.phui-timeline-view .phui-timeline-extra');
      var timeContainerNode = timeContainerNodes[timeContainerNodes.length - 1];
      var timeNode = timeContainerNode.lastChild;

      if (!timeNode || !diffIDNode) {
        return;
      }

      var cellID = diffIDNode.textContent;
      var timeString = timeNode.textContent;
      var isHidden =
        hiddenDiffs[cellID] && hiddenDiffs[cellID] === timeString;

      var hideLinkNode =
        JX.$N('a', {
          className: 'mll policy-link',
          sigil: 'hide-link',
          meta: {
            isHidden: isHidden,
            cellID: cellID,
            time: timeString
          }
        }, [
          JX.$N('i', {
            className:
              'msr hide-icon glyph glyph-gray ' + (
                isHidden ? 'glyph-eye-close' : 'glyph-eye-open'
              )
          }),
          isHidden ? 'Read' : 'Unread'
        ]);

      var prevLink = JX.DOM.scry(headerNode, 'a', 'hide-link')[0];
      if (prevLink) {
        JX.DOM.replace(prevLink, hideLinkNode);
      } else {
        JX.DOM.appendContent(headerNode, hideLinkNode);
      }
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

  ScriptStorage.subscribe('hiddendiffs', flushStorageToView);
});
