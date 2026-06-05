(function() {
  'use strict';

  var M = window.__MGP;
  if (!M || !M.active) return;

  var state = M.state;
  var el = M.el;
  var ICONS = M.ICONS;
  var haptic = M.haptic;
  var releaseAllKeys = M.releaseAllKeys;
  var fireKey = M.fireKey;
  var saveState = M.saveState;

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;
  }

  function requestFullscreen() {
    var e = document.documentElement;
    var fn = e.requestFullscreen || e.webkitRequestFullscreen || e.webkitRequestFullScreen || e.mozRequestFullScreen || e.msRequestFullscreen;
    if (!fn) return;
    try {
      var p = fn.call(e);
      if (p && p.catch) p.catch(function() {});
    } catch(err) {}
  }

  function exitFullscreen() {
    var fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (!fn) return;
    try {
      var p = fn.call(document);
      if (p && p.catch) p.catch(function() {});
    } catch(err) {}
  }

  function lockOrientation(orientation) {
    var so = screen.orientation;
    if (so && so.lock) {
      try {
        var p = so.lock(orientation || 'landscape');
        if (p && p.catch) p.catch(function() {});
        return;
      } catch(err) {}
    }
    var legacy = screen.lockOrientation || screen.mozLockOrientation || screen.msLockOrientation;
    if (legacy) { try { legacy.call(screen, orientation || 'landscape'); } catch(err) {} }
  }

  function unlockOrientation() {
    var so = screen.orientation;
    if (so && so.unlock) { try { so.unlock(); } catch(err) {} return; }
    var legacy = screen.unlockOrientation || screen.mozUnlockOrientation || screen.msUnlockOrientation;
    if (legacy) { try { legacy.call(screen); } catch(err) {} }
  }

  var eventListeners = {};

  function MobileGamepad() {
    this.overlay = null;
    this.joystick = null;
    this.dpad = null;
    this.actionButtons = null;
    this.cursorSim = null;
    this.keyboardMgr = null;
    this.settings = null;
    this.switchBtn = null;
    this.fsBtn = null;
    this.orientationHandler = null;
    this.resizeHandler = null;
    this.visibilityHandler = null;
    this.init();
  }

  MobileGamepad.prototype.init = function() {
    M.injectCSS();
    this.overlay = el('div', 'mgp-overlay');
    document.body.appendChild(this.overlay);

    var self = this;

    this.joystick = new M.Joystick(this.overlay, function(dirs, magnitude) {
      self.emit('direction', { dirs: dirs, magnitude: magnitude });
    });
    this.dpad = new M.DPad(this.overlay);
    this.actionButtons = new M.ActionButtons(this.overlay);
    this.cursorSim = new M.CursorSimulator(this.overlay);
    this.keyboardMgr = new M.KeyboardManager(this.overlay);
    this.settings = new M.SettingsPanel(this.overlay, function() { self.applyState(); });

    this.buildSwitchButton();
    this.buildFullscreenButton();
    this.applyState();
    this.bindGlobalEvents();
    this.preventGhostInputs();
    M.ensurePadConnected();
  };

  MobileGamepad.prototype.buildSwitchButton = function() {
    this.switchBtn = el('div', 'mgp-switch-btn mgp-ctrl', this.overlay);
    this.switchBtn.innerHTML = ICONS.swap;

    var self = this;
    this.switchBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      state.inputMode = state.inputMode === 'joystick' ? 'dpad' : 'joystick';
      saveState();
      self.applyState();
      haptic(10);
    }, { passive: false });
  };

  MobileGamepad.prototype.buildFullscreenButton = function() {
    this.fsBtn = el('div', 'mgp-fs-btn mgp-ctrl', this.overlay);
    this.fsBtn.innerHTML = ICONS.expand;

    var self = this;
    this.fsBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      self.toggleFullscreen();
      haptic(10);
    }, { passive: false });

    var sync = function() { self.updateFullscreenIcon(); };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
  };

  MobileGamepad.prototype.updateFullscreenIcon = function() {
    if (!this.fsBtn) return;
    this.fsBtn.innerHTML = fullscreenElement() ? ICONS.compress : ICONS.expand;
  };

  MobileGamepad.prototype.toggleFullscreen = function() {
    if (fullscreenElement()) exitFullscreen();
    else requestFullscreen();
  };

  MobileGamepad.prototype.applyState = function() {
    this.overlay.style.opacity = state.opacity;

    this.joystick.updateVisibility();
    this.joystick.applyScale();

    this.dpad.updateVisibility();
    this.dpad.applyScale();

    this.actionButtons.updateVisibility();
    this.actionButtons.updateLabels();
    this.actionButtons.applyScale();

    this.cursorSim.updateVisibility();

    this.keyboardMgr.updateVisibility();

    this.settings.updateGearPosition();

    this.switchBtn.style.display = state.showControls ? '' : 'none';
    this.fsBtn.style.display = state.showControls ? '' : 'none';

    if (state.actionButtons) {
      this.switchBtn.style.bottom = '150px';
    } else {
      this.switchBtn.style.bottom = '16px';
    }

    var kbdBtn = this.keyboardMgr.btn;
    if (state.actionButtons && state.virtualKeyboard) {
      kbdBtn.style.bottom = '148px';
      kbdBtn.style.right = '60px';
    } else if (state.virtualKeyboard) {
      kbdBtn.style.bottom = '16px';
      kbdBtn.style.right = '60px';
    }
  };

  MobileGamepad.prototype.bindGlobalEvents = function() {
    var self = this;

    this.resizeHandler = function() {
      self.applyState();
    };
    window.addEventListener('resize', this.resizeHandler);

    this.orientationHandler = function() {
      if (self.joystick && self.joystick.active) self.joystick.release();
      setTimeout(function() { self.applyState(); }, 150);
    };
    window.addEventListener('orientationchange', this.orientationHandler);

    this.visibilityHandler = function() {
      if (document.hidden) {
        self.releaseAllInputs();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    document.addEventListener('fullscreenchange', function() {
      setTimeout(function() { self.applyState(); }, 200);
    });

    window.addEventListener('blur', function() {
      self.releaseAllInputs();
    });
  };

  MobileGamepad.prototype.releaseAllInputs = function() {
    releaseAllKeys();
    if (this.joystick) this.joystick.release();
    if (this.dpad) this.dpad.releaseAll();
    if (this.actionButtons) this.actionButtons.releaseAll();
    if (M.padReset) M.padReset();
  };

  MobileGamepad.prototype.preventGhostInputs = function() {
    this.overlay.addEventListener('contextmenu', function(e) {
      e.preventDefault();
    });
  };

  MobileGamepad.prototype.show = function() {
    state.showControls = true;
    saveState();
    this.applyState();
    this.overlay.style.display = '';
  };

  MobileGamepad.prototype.hide = function() {
    state.showControls = false;
    saveState();
    releaseAllKeys();
    this.overlay.style.display = 'none';
  };

  MobileGamepad.prototype.toggle = function() {
    if (state.showControls) this.hide();
    else this.show();
  };

  MobileGamepad.prototype.enterFullscreen = function() { requestFullscreen(); };
  MobileGamepad.prototype.exitFullscreen = function() { exitFullscreen(); };
  MobileGamepad.prototype.lockOrientation = function(o) { lockOrientation(o); };
  MobileGamepad.prototype.unlockOrientation = function() { unlockOrientation(); };

  MobileGamepad.prototype.setOption = function(key, value) {
    if (state.hasOwnProperty(key)) {
      state[key] = value;
      saveState();
      this.applyState();
    }
  };

  MobileGamepad.prototype.getOption = function(key) {
    return state.hasOwnProperty(key) ? state[key] : undefined;
  };

  MobileGamepad.prototype.getState = function() {
    var copy = {};
    for (var k in state) copy[k] = state[k];
    return copy;
  };

  MobileGamepad.prototype.resetDefaults = function() {
    for (var k in M.defaults) {
      state[k] = M.defaults[k];
    }
    saveState();
    this.applyState();
    if (this.settings.open) {
      this.settings.syncUI();
    }
  };

  MobileGamepad.prototype.onDirectionChange = function(callback) {
    this.joystick.onUpdate = callback;
  };

  MobileGamepad.prototype.simulateKey = function(code, type) {
    fireKey(code, type || 'keydown');
  };

  MobileGamepad.prototype.on = function(event, callback) {
    if (!eventListeners[event]) eventListeners[event] = [];
    eventListeners[event].push(callback);
    return this;
  };

  MobileGamepad.prototype.off = function(event, callback) {
    if (!eventListeners[event]) return this;
    eventListeners[event] = eventListeners[event].filter(function(cb) { return cb !== callback; });
    return this;
  };

  MobileGamepad.prototype.emit = function(event, data) {
    if (!eventListeners[event]) return;
    for (var i = 0; i < eventListeners[event].length; i++) {
      try { eventListeners[event][i](data); } catch(e) {}
    }
  };

  MobileGamepad.prototype.isPressed = function(code) {
    return !!M.pressedKeys[code];
  };

  MobileGamepad.prototype.getActiveDirections = function() {
    if (this.joystick) return { up: this.joystick.dirs.up, down: this.joystick.dirs.down, left: this.joystick.dirs.left, right: this.joystick.dirs.right };
    return { up: false, down: false, left: false, right: false };
  };

  MobileGamepad.prototype.getPressedKeys = function() {
    return Object.keys(M.pressedKeys);
  };

  MobileGamepad.prototype.getGamepad = function() {
    return M.pad;
  };

  MobileGamepad.prototype.isMobile = function() { return true; };

  MobileGamepad.prototype.isSpoofing = function() { return M.config.mode !== 'never'; };

  MobileGamepad.prototype.getRealUserAgent = function() { return M.real.ua; };

  MobileGamepad.prototype.getVersion = function() { return M.VERSION; };

  MobileGamepad.prototype.getMovementScheme = function() { return state.movementScheme; };

  MobileGamepad.prototype.setMovementScheme = function(scheme) {
    if (M.MOVEMENT_SCHEMES[scheme]) {
      state.movementScheme = scheme;
      saveState();
      this.applyState();
      if (this.settings.open) this.settings.syncUI();
    }
  };

  MobileGamepad.prototype.getAvailableSchemes = function() {
    return Object.keys(M.MOVEMENT_SCHEMES);
  };

  MobileGamepad.prototype.destroy = function() {
    releaseAllKeys();
    this.joystick.destroy();
    this.dpad.destroy();
    this.actionButtons.destroy();
    this.cursorSim.destroy();
    this.keyboardMgr.destroy();
    this.settings.destroy();
    if (this.switchBtn && this.switchBtn.parentNode) this.switchBtn.parentNode.removeChild(this.switchBtn);
    if (this.fsBtn && this.fsBtn.parentNode) this.fsBtn.parentNode.removeChild(this.fsBtn);
    if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('orientationchange', this.orientationHandler);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    var styleEl = document.getElementById('mgp-styles');
    if (styleEl) styleEl.parentNode.removeChild(styleEl);
    delete window.MobileGamepad;
  };

  var instance = null;

  function autoInit() {
    if (instance) return;
    instance = new MobileGamepad();
    window.MobileGamepad = instance;
    M.instance = instance;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

})();
