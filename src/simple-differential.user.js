// ==UserScript==
// @name           Phabricator: Simple Differential
// @version        0.1.10
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
  '.glyph.glyph-list-alt {' +
    'background-position: -264px -24px;' +
  '}' +
  '.glyph.glyph-user {' +
    'background-position: -168px 0;' +
  '}' +
  '.glyph.glyph-gray {' +
    'opacity: 0.5;' +
  '}'
);

injectStyles(
  '.phui-object-item-name .phui-object-item-byline {' +
    'color: #777;' +
    'display: inline;' +
    'font-weight: normal;' +
  '}' +
  '.phui-has-tooltip {' +
    'cursor: default;' +
  '}' +
  '.phui-simple-item .phui-object-icon-pane {' +
    'width: auto;' +
  '}' +
  '.phui-simple-item.phui-object-item.phui-object-item {' +
    'margin-bottom: -1px;' +
  '}' +
  '.phui-simple-item.phui-object-item .phui-object-item-frame {' +
    'min-height: 29px;' +
  '}' +
  '.phui-simple-item:last-child {' +
    'margin-bottom: 3px;' +
  '}' +
  '.phui-simple-item:last-child .phui-object-item-frame {' +
    'margin-bottom: 0;' +
  '}' +
  '.phui-object-item-icon-label .glyph {' +
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
    JX.DOM.alterClass(node, 'phui-has-tooltip', true);
  }

  /* INIT */

  // Use `#complex` to disable these changes.
  if (global.location.hash === '#complex') {
    return;
  }

  var statusToColor = {
    'Abandoned': '#222',
    'Accepted': '#096',
    'Closed': '#069',
    'Needs Revision': '#a00'
  };

  $$('.phui-object-item').forEach(function(itemNode) {
    var attributeList = $$('.phui-object-item-attribute', itemNode);
    var bylineNode = $('.phui-object-item-byline', itemNode);
    var bylinesNode = $('.phui-object-item-bylines', itemNode);
    var contentNode = $('.phui-object-item-content', itemNode);
    var nameNode = $('.phui-object-item-name', itemNode);
    var objNameNode = $('.phui-object-item-objname', itemNode);
    var iconLabelNode = $('.phui-object-item-icon-label', itemNode);

    JX.DOM.alterClass(itemNode, 'phui-simple-item', true);

    if (bylinesNode) {
      bylinesNode.parentNode.removeChild(bylinesNode);
    }
    if (bylineNode && nameNode) {
      bylineNode.firstChild.textContent = ' by ';
      nameNode.appendChild(bylineNode);
    }

    var attributeListIndex = 0;

    // Filter out the "Project" attribute.
    attributeList = attributeList.filter(function(attributeNode) {
      var maybeProject = attributeNode.lastChild;
      if (maybeProject.nodeType === Node.TEXT_NODE) {
        return !maybeProject.textContent.match(/^Project: /);
      }
      return true;
    });

    var pendingCommentNode = attributeList[attributeListIndex];
    var pendingCommentIconNode = $('.icons-file-grey', pendingCommentNode);
    if (pendingCommentIconNode) {
      attributeListIndex++;
    }

    var itemStatus = 'Unknown';
    var itemStatusNode = attributeList[attributeListIndex];
    if (itemStatusNode) {
      // Sometimes the status node might have a spacer in it.
      var maybeItemStatus = itemStatusNode.lastChild;
      if (maybeItemStatus.nodeType === Node.TEXT_NODE) {
        itemStatus = maybeItemStatus.textContent;
        var statusColor = statusToColor[itemStatus];
        if (statusColor) {
          itemNode.style.borderColor = statusColor;
        }
        attributeListIndex++;
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
      var locMatch = locAttributeNode.textContent.match(/[0-9,]+/);
      if (locMatch) {
        loc = locMatch[0];
      }
    }

    if (iconLabelNode) {
      var labelSpacerNode = JX.$N(
        'span',
        {className: 'phui-object-item-icon-label'},
        JX.$H(' &middot; ')
      );

      var reviewerNode = JX.$N('span', ' ' + reviewerNames.length);
      JX.DOM.prependContent(
        reviewerNode,
        JX.$N('span', {
          className: 'glyph glyph-gray glyph-user'
        })
      );
      setNodeTooltip(reviewerNode, reviewerNames.join(', '));

      var locNode = JX.$N('span', ' ' + loc);
      JX.DOM.prependContent(
        locNode,
        JX.$N('span', {
          className: 'glyph glyph-gray glyph-list-alt'
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
        JX.DOM.alterClass(node, 'phui-object-item-icon-label', true);
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
