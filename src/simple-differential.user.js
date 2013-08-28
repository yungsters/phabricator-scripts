// ==UserScript==
// @name           Phabricator: Simple Differential
// @version        0.0.2
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

  function setNodeTooltip(node, tooltip) {
    JX.Stratcom.addSigil(node, 'has-tooltip');
    JX.Stratcom.addData(node, {align: 'W', tip: tooltip});
    JX.DOM.alterClass(node, 'phabricator-has-tooltip', true);
  }

  /* INIT */

  var statusToColor = {
    'Abandoned': '#222',
    'Accepted': '#096',
    'Needs Review': '#c96',
    'Needs Revision': '#a00'
  };

  $$('.phabricator-object-item').forEach(function(itemNode) {
    var attributeList = $$('.phabricator-object-item-attribute', itemNode);
    var bylineNode = $('.phabricator-object-item-byline', itemNode);
    var bylinesNode = $('.phabricator-object-item-bylines', itemNode);
    var contentNode = $('.phabricator-object-item-content', itemNode);
    var nameNode = $('.phabricator-object-item-name', itemNode);
    var iconLabelNode = $('.phabricator-object-item-icon-label', itemNode);

    JX.DOM.alterClass(itemNode, 'phabricator-simple-item', true);

    if (bylinesNode) {
      bylinesNode.parentNode.removeChild(bylinesNode);
    }
    if (bylineNode && nameNode) {
      bylineNode.firstChild.textContent = ' by ';
      nameNode.appendChild(bylineNode);
    }

    var itemStatus = 'Unknown';
    var itemStatusNode = attributeList[0];
    if (itemStatusNode) {
      itemStatus = itemStatusNode.textContent;
      var statusColor = statusToColor[itemStatus];
      if (statusColor) {
        itemNode.style.borderColor = statusColor;
      }
    }

    var reviewerNames = [];
    var reviewersNode = attributeList[1];
    if (reviewersNode) {
      reviewerNames = $$('.phui-link-person', reviewersNode)
        .map(function(reviewerNode) {
          return reviewerNode.textContent;
        });
    }

    if (iconLabelNode) {
      var labelSpacerNode = document.createElement('span');
      labelSpacerNode.innerHTML = ' &middot; ';

      var simpleReviewerNode = document.createElement('span');
      simpleReviewerNode.textContent = reviewerNames.length + ' Reviewers';
      setNodeTooltip(simpleReviewerNode, reviewerNames.join(', '));

      var simpleStatusNode = document.createElement('span');
      simpleStatusNode.textContent = itemStatus;

      [ simpleReviewerNode,
        labelSpacerNode.cloneNode(true),
        simpleStatusNode,
        labelSpacerNode.cloneNode(true)
      ].forEach(function(node) {
        iconLabelNode.parentNode.insertBefore(node, iconLabelNode);
      });
    }

    if (contentNode) {
      contentNode.parentNode.removeChild(contentNode);
    }
  });

});
