// ==UserScript==
// @name           Phabricator: Simple Differential
// @version        0.1.3
// @description    Makes Differential... simpler.
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
  '.glyph-list-alt {' +
    'background-position: -264px -24px;' +
  '}' +
  '.glyph-user {' +
    'background-position: -168px 0;' +
  '}' +
  '.glyph-gray {' +
    'opacity: 0.5;' +
  '}'
);

injectStyles(
  '.phabricator-object-item-name .phabricator-object-item-byline {' +
    'color: #777;' +
    'display: inline;' +
    'font-weight: normal;' +
  '}' +
  '.phabricator-has-tooltip {' +
    'cursor: default;' +
  '}' +
  '.phabricator-simple-item .phabricator-object-icon-pane {' +
    'width: auto;' +
  '}' +
  '.phabricator-simple-item.phabricator-object-item {' +
    'margin-bottom: 0;' +
  '}' +
  '.phabricator-simple-item .phabricator-object-item-frame {' +
    'border-bottom-width: 0;' +
    'min-height: 30px;' +
  '}' +
  '.phabricator-simple-item:last-child {' +
    'margin-bottom: 3px;' +
  '}' +
  '.phabricator-simple-item:last-child .phabricator-object-item-frame {' +
    'border-bottom-width: 1px;' +
  '}' +
  '.phabricator-simple-icon {' +
    'margin-top: -1px;' +
    'vertical-align: text-top;' +
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

  function setNodeTooltip(node, tooltip, alignment) {
    JX.Stratcom.addSigil(node, 'has-tooltip');
    JX.Stratcom.addData(node, {
      align: alignment || 'W',
      size: 300,
      tip: tooltip
    });
    JX.DOM.alterClass(node, 'phabricator-has-tooltip', true);
  }

  /* INIT */

  // Use `?complex` to disable these changes.
  if ('complex' in JX.$U(global.location).getQueryParams()) {
    return;
  }

  var statusToColor = {
    'Abandoned': '#222',
    'Accepted': '#096',
    'Closed': '#069',
    'Needs Revision': '#a00'
  };

  $$('.phabricator-object-item').forEach(function(itemNode) {
    var attributeList = $$('.phabricator-object-item-attribute', itemNode);
    var bylineNode = $('.phabricator-object-item-byline', itemNode);
    var bylinesNode = $('.phabricator-object-item-bylines', itemNode);
    var contentNode = $('.phabricator-object-item-content', itemNode);
    var nameNode = $('.phabricator-object-item-name', itemNode);
    var objNameNode = $('.phabricator-object-item-objname', itemNode);
    var iconLabelNode = $('.phabricator-object-item-icon-label', itemNode);

    JX.DOM.alterClass(itemNode, 'phabricator-simple-item', true);

    if (bylinesNode) {
      bylinesNode.parentNode.removeChild(bylinesNode);
    }
    if (bylineNode && nameNode) {
      bylineNode.firstChild.textContent = ' by ';
      nameNode.appendChild(bylineNode);
    }

    var attributeListIndex = 0;

    var pendingCommentNode = attributeList[attributeListIndex];
    var pendingCommentIconNode = $('.icons-file-grey', pendingCommentNode);
    if (pendingCommentIconNode) {
      JX.DOM.alterClass(
        pendingCommentIconNode,
        'phabricator-simple-icon',
        true
      );
      attributeListIndex++;
    }

    var itemStatus = 'Unknown';
    var itemStatusNode = attributeList[attributeListIndex++];
    if (itemStatusNode) {
      // Sometimes the status node might have a spacer in it.
      itemStatus = itemStatusNode.lastChild.textContent;
      var statusColor = statusToColor[itemStatus];
      if (statusColor) {
        itemNode.style.borderColor = statusColor;
      }
    }
    setNodeTooltip(objNameNode, itemStatus);

    var reviewerNames = [];
    var reviewersNode = attributeList[attributeListIndex++];
    if (reviewersNode) {
      reviewerNames = $$('.phui-link-person', reviewersNode)
        .map(function(reviewerNode) {
          return reviewerNode.textContent;
        });
    }

    var loc = '?';
    var locAttributeNode = attributeList[attributeListIndex++];
    if (locAttributeNode) {
      var locMatch = locAttributeNode.textContent.match(/\d+/);
      if (locMatch) {
        loc = locMatch[0];
      }
    }

    if (iconLabelNode) {
      var labelSpacerNode = JX.$N(
        'span',
        {className: 'phabricator-object-item-icon-label'},
        JX.$H(' &middot; ')
      );

      var reviewerNode = JX.$N('span', ' ' + reviewerNames.length);
      JX.DOM.prependContent(
        reviewerNode,
        JX.$N('span', {
          className: 'phabricator-simple-icon glyph-gray glyph-user'
        })
      );
      setNodeTooltip(reviewerNode, reviewerNames.join(', '));

      var locNode = JX.$N('span', ' ' + loc);
      JX.DOM.prependContent(
        locNode,
        JX.$N('span', {
          className: 'phabricator-simple-icon glyph-gray glyph-list-alt'
        })
      );

      [ pendingCommentIconNode,
        reviewerNode,
        locNode
      ].forEach(function(node) {
        if (!node) {
          return;
        }
        // This class gets hidden on narrow viewports.
        JX.DOM.alterClass(node, 'phabricator-object-item-icon-label', true);
        iconLabelNode.parentNode.insertBefore(node, iconLabelNode);
        iconLabelNode.parentNode.insertBefore(
          labelSpacerNode.cloneNode(true),
          iconLabelNode
        );
      });
    }

    if (contentNode) {
      contentNode.parentNode.removeChild(contentNode);
    }
  });

});
