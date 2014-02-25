// ==UserScript==
// @name           Phabricator: Sublime Text Edit Links
// @version        1.1.7
// @description    Adds "Edit" links (to Sublime Text) next to file paths.
// @match          https://secure.phabricator.com/*
// @match          https://phabricator.fb.com/*
// ==/UserScript==

// Configuration...
var localPath = '/Volumes/dev/www/';

function inject(callback) {
  var script = document.createElement('script');
  script.textContent = '(' + callback.toString() + ')();';
  document.body.appendChild(script);
}

function $A(obj) { return Array.prototype.slice.call(obj); }
function gc(el, className) { return $A(el.getElementsByClassName(className)); }
function gt(el, tagName)   { return $A(el.getElementsByTagName(tagName)); }
function $S(inline_styles) {
  var style = document.createElement('style');
  style.innerHTML = inline_styles;
  document.body.appendChild(style);
}

$S(
  'div.buoyant {' +
    'font-size: 14px;' +
  '}' +
  'div.buoyant a {' +
    'color: #fff;' +
  '}'
);

function cleanPath(path) {
  var parts = path.split('www/');
  if (parts.length > 1) {
    return parts.splice(1).join('www/');
  } else {
    return parts[0];
  }
}

var baseURL = 'subl://open/?url=file://';
function getLink(path, line) {
  var link = baseURL + localPath + cleanPath(path);
  if (line) {
    link += '&line=' + line;
  }
  return link;
}

function createEditLink(path, wrap) {
  var link = document.createElement('a');
  link.setAttribute('data-sigil', 'prevent');
  link.href = getLink.apply(null, path.split(':'));
  link.innerHTML = 'Edit';
  link.style.padding = '0 0.25em';

  if (wrap) {
    var span = document.createElement('span');
    span.innerHTML = '&nbsp;&middot&nbsp;';
    span.appendChild(link);

    link = span;
  }

  return link;
}

// Differential: Inline Comments
gc(document, 'differential-inline-summary').forEach(function(table) {
  gt(table, 'th').forEach(function(th) {
    th.appendChild(createEditLink(th.innerHTML, true));
  });
});

// Differential: Table of Contents
gc(document, 'differential-toc').forEach(function(toc) {
  gc(toc, 'differential-toc-file').forEach(function(td) {
    gt(td, 'a').forEach(function(a) {
      td.appendChild(createEditLink(a.innerHTML, true));
    });
  });
});

// Differential: Changesets
gc(document, 'differential-changeset').forEach(function(changeset) {
  gt(changeset, 'h1').forEach(function(h1) {
    h1.appendChild(createEditLink(h1.textContent, true));
  });
});

// Diffusion: File Table View
gc(document, 'aphront-table-view').forEach(function(table) {
  var trs = gt(table, 'tr');
  if (trs[0] && gt(trs[0], 'th')[0].innerHTML === 'ID') {
    return;
  }
  trs.forEach(function(tr, i) {
    if (i) {
      var tds = gt(tr, 'td');
      var td = document.createElement('td');
      var a = gt(tds[3], 'a')[0];
      if (a) {
        td.appendChild(createEditLink(a.innerHTML));
        tr.insertBefore(td, tds[3]);
      }
    } else {
      var ths = gt(tr, 'th');
      var th = document.createElement('th');
      th.innerHTML = 'T.M.';
      if (ths[3].innerHTML.trim() === 'Path') {
        tr.insertBefore(th, ths[3]);
      }
    }
  });
});

// Differential: Sticky Headers
document.addEventListener('scroll', function() {
  var header = gc(document, 'buoyant')[0];
  if (header && header.childNodes.length < 2) {
    header.appendChild(createEditLink(header.innerHTML, true));
  }
}, false);

inject(function() {

  JX.Stratcom.listen('click', 'prevent', function(event) {
    event.stop();
  });

});
