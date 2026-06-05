(function() {
  'use strict';

  if (typeof window === 'undefined') return;
  if (window.__MGP) return;

  var script = document.currentScript;
  var ds = (script && script.dataset) ? script.dataset : {};

  var realTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  var realMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|Silk|Kindle|PlayBook/i.test(navigator.userAgent || '');
  var realUA = navigator.userAgent;
  var realMaxTouch = navigator.maxTouchPoints || 0;

  var mode = (ds.activate || '').toLowerCase();
  if (!mode) {
    if (window.MOBILEAPI_FORCE === true) mode = 'always';
    else if (window.MOBILEAPI_FORCE === false) mode = 'never';
    else mode = 'auto';
  }
  var active = mode === 'always' ? true : (mode === 'never' ? false : (realTouch || realMobile));

  var basePath = '';
  if (ds.base) basePath = ds.base;
  else if (script && script.src) basePath = script.src.replace(/[^\/]*$/, '');

  var M = {
    active: active,
    real: { touch: realTouch, mobile: realMobile, ua: realUA, maxTouchPoints: realMaxTouch },
    config: { mode: mode, spoof: ds.spoof !== 'off', shim: ds.shim !== 'off' },
    basePath: basePath,
    pad: null
  };
  window.__MGP = M;

  if (!active) return;

  var buttons = [];
  for (var bi = 0; bi < 17; bi++) buttons.push({ pressed: false, touched: false, value: 0 });
  M.pad = {
    id: 'MobileAPI Virtual Controller (STANDARD GAMEPAD)',
    index: 0,
    connected: true,
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons: buttons,
    timestamp: 0,
    vibrationActuator: null
  };

  function define(obj, prop, value) {
    try {
      Object.defineProperty(obj, prop, { configurable: true, get: function() { return value; } });
      return true;
    } catch(e) { return false; }
  }

  if (M.config.spoof) {
    var DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

    define(navigator, 'userAgent', DESKTOP_UA);
    define(navigator, 'appVersion', '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    define(navigator, 'platform', 'Win32');
    define(navigator, 'vendor', 'Google Inc.');
    define(navigator, 'maxTouchPoints', 0);
    define(navigator, 'msMaxTouchPoints', 0);

    var brands = [
      { brand: 'Chromium', version: '125' },
      { brand: 'Google Chrome', version: '125' },
      { brand: 'Not.A/Brand', version: '24' }
    ];
    var uaData = {
      brands: brands,
      mobile: false,
      platform: 'Windows',
      getHighEntropyValues: function() {
        return Promise.resolve({
          architecture: 'x86',
          bitness: '64',
          brands: brands,
          mobile: false,
          model: '',
          platform: 'Windows',
          platformVersion: '15.0.0',
          uaFullVersion: '125.0.0.0',
          fullVersionList: brands
        });
      },
      toJSON: function() { return { brands: brands, mobile: false, platform: 'Windows' }; }
    };
    define(navigator, 'userAgentData', uaData);

    function hideProp(obj, prop) {
      try { delete obj[prop]; } catch(e) {}
      if (prop in obj) {
        try { Object.defineProperty(obj, prop, { configurable: true, get: function() { return undefined; } }); } catch(e) {}
      }
    }
    hideProp(window, 'ontouchstart');
    hideProp(window, 'orientation');

    define(screen, 'width', 1536);
    define(screen, 'height', 864);
    define(screen, 'availWidth', 1536);
    define(screen, 'availHeight', 824);
    define(screen, 'colorDepth', 24);
    define(screen, 'pixelDepth', 24);

    var realMatchMedia = (typeof window.matchMedia === 'function') ? window.matchMedia.bind(window) : null;

    function fakeMQL(query, matches, base) {
      var listeners = [];
      var mql = {
        matches: matches,
        media: (base && base.media) || query,
        onchange: null,
        addListener: function(fn) { if (fn) listeners.push(fn); },
        removeListener: function(fn) { listeners = listeners.filter(function(l) { return l !== fn; }); },
        addEventListener: function(type, fn) { if (type === 'change' && fn) listeners.push(fn); },
        removeEventListener: function(type, fn) { if (type === 'change') listeners = listeners.filter(function(l) { return l !== fn; }); },
        dispatchEvent: function() { return false; }
      };
      try { if (window.MediaQueryList) Object.setPrototypeOf(mql, window.MediaQueryList.prototype); } catch(e) {}
      return mql;
    }

    define(window, 'matchMedia', function(query) {
      var base = realMatchMedia ? realMatchMedia(query) : null;
      var s = String(query).replace(/\s+/g, '').toLowerCase();
      if (s.indexOf('pointer:') < 0 && s.indexOf('hover:') < 0) return base || fakeMQL(query, false, null);
      if (/width|height|aspect|resolution|orientation|device|color|grid|scan|monochrome|prefers/.test(s)) return base || fakeMQL(query, false, null);
      var vals = [];
      if (s.indexOf('pointer:coarse') >= 0) vals.push(false);
      if (s.indexOf('any-pointer:coarse') >= 0) vals.push(false);
      if (s.indexOf('pointer:fine') >= 0) vals.push(true);
      if (s.indexOf('any-pointer:fine') >= 0) vals.push(true);
      if (s.indexOf('pointer:none') >= 0) vals.push(false);
      if (s.indexOf('hover:none') >= 0) vals.push(false);
      if (s.indexOf('hover:hover') >= 0) vals.push(true);
      if (s.indexOf('any-hover:hover') >= 0) vals.push(true);
      if (s.indexOf('any-hover:none') >= 0) vals.push(false);
      if (!vals.length) return base || fakeMQL(query, false, null);
      var combined = (s.indexOf(',') >= 0) ? vals.some(function(v) { return v; }) : vals.every(function(v) { return v; });
      return fakeMQL(query, combined, base);
    });
  }

  if (M.config.shim) {
    if (typeof window.caches === 'undefined') {
      var cacheKeyOf = function(req) {
        if (typeof req === 'string') return req;
        if (req && req.url) return req.url;
        return String(req);
      };
      var CacheShim = function() { this._m = {}; };
      CacheShim.prototype.match = function(req) { var r = this._m[cacheKeyOf(req)]; return Promise.resolve(r ? r.clone() : undefined); };
      CacheShim.prototype.put = function(req, res) { try { this._m[cacheKeyOf(req)] = res.clone(); } catch(e) { this._m[cacheKeyOf(req)] = res; } return Promise.resolve(); };
      CacheShim.prototype.add = function(req) { var self = this; return fetch(req).then(function(res) { return self.put(req, res); }); };
      CacheShim.prototype.addAll = function(reqs) { var self = this; return Promise.all((reqs || []).map(function(r) { return self.add(r); })).then(function() {}); };
      CacheShim.prototype['delete'] = function(req) { var k = cacheKeyOf(req); var had = k in this._m; delete this._m[k]; return Promise.resolve(had); };
      CacheShim.prototype.keys = function() { var m = this._m; return Promise.resolve(Object.keys(m).map(function(k) { return new Request(k); })); };
      CacheShim.prototype.matchAll = function() { var m = this._m; return Promise.resolve(Object.keys(m).map(function(k) { return m[k].clone(); })); };

      var cacheStores = {};
      var cacheStorageShim = {
        open: function(name) { if (!cacheStores[name]) cacheStores[name] = new CacheShim(); return Promise.resolve(cacheStores[name]); },
        has: function(name) { return Promise.resolve(!!cacheStores[name]); },
        'delete': function(name) { var had = !!cacheStores[name]; delete cacheStores[name]; return Promise.resolve(had); },
        keys: function() { return Promise.resolve(Object.keys(cacheStores)); },
        match: function(req) {
          var names = Object.keys(cacheStores), i = 0;
          var step = function() {
            if (i >= names.length) return Promise.resolve(undefined);
            return cacheStores[names[i++]].match(req).then(function(r) { return r || step(); });
          };
          return step();
        }
      };
      define(window, 'caches', cacheStorageShim);
    }

    if (window.crypto && typeof window.crypto.randomUUID !== 'function') {
      var randomUUID = function() {
        var b;
        if (window.crypto && window.crypto.getRandomValues) { b = new Uint8Array(16); window.crypto.getRandomValues(b); }
        else { b = []; for (var i = 0; i < 16; i++) b.push(Math.floor(Math.random() * 256)); }
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        var h = [];
        for (var j = 0; j < 16; j++) h.push((b[j] + 0x100).toString(16).slice(1));
        return h[0] + h[1] + h[2] + h[3] + '-' + h[4] + h[5] + '-' + h[6] + h[7] + '-' + h[8] + h[9] + '-' + h[10] + h[11] + h[12] + h[13] + h[14] + h[15];
      };
      try { window.crypto.randomUUID = randomUUID; } catch(e) {
        try { Object.defineProperty(window.crypto, 'randomUUID', { value: randomUUID, configurable: true }); } catch(e2) {}
      }
    }
  }

  var realGetGamepads = null;
  if (typeof navigator.getGamepads === 'function') {
    try { realGetGamepads = navigator.getGamepads.bind(navigator); } catch(e) {}
  } else if (typeof navigator.webkitGetGamepads === 'function') {
    try { realGetGamepads = navigator.webkitGetGamepads.bind(navigator); } catch(e) {}
  }

  function snapshotPad(p, index) {
    var btns = [];
    for (var i = 0; i < p.buttons.length; i++) {
      btns.push({ pressed: p.buttons[i].pressed, touched: p.buttons[i].touched, value: p.buttons[i].value });
    }
    return { id: p.id, index: index, connected: true, mapping: p.mapping, axes: p.axes.slice(), buttons: btns, timestamp: p.timestamp, vibrationActuator: null };
  }

  function getGamepads() {
    var list = [];
    if (realGetGamepads) {
      try {
        var r = realGetGamepads();
        if (r) { for (var i = 0; i < r.length; i++) list.push(r[i]); }
      } catch(e) {}
    }
    while (list.length < 4) list.push(null);
    if (M.pad) {
      var slot = 0;
      while (slot < list.length && list[slot]) slot++;
      M.pad.index = slot;
      list[slot] = snapshotPad(M.pad, slot);
    }
    return list;
  }
  define(navigator, 'getGamepads', getGamepads);
  define(navigator, 'webkitGetGamepads', getGamepads);

  function loadModules(list) {
    var i = 0;
    (function next() {
      if (i >= list.length) return;
      var s = document.createElement('script');
      s.src = basePath + list[i++];
      s.async = false;
      s.onload = next;
      s.onerror = next;
      (document.head || document.documentElement).appendChild(s);
    })();
  }

  loadModules(['core.js', 'ui.js', 'app.js']);

})();
