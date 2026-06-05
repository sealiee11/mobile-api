(function() {
  'use strict';

  var M = window.__MGP;
  if (!M || !M.active) return;

  var state = M.state;
  var MOVEMENT_SCHEMES = M.MOVEMENT_SCHEMES;
  var getMovementKeys = M.getMovementKeys;
  var BINDABLE_KEYS = M.BINDABLE_KEYS;
  var keyLabel = M.keyLabel;
  var fireKey = M.fireKey;
  var haptic = M.haptic;
  var clamp = M.clamp;
  var dist = M.dist;
  var el = M.el;
  var ICONS = M.ICONS;
  var padButton = M.padButton;
  var padAxis = M.padAxis;

  var DIR_BTN = { up: 12, down: 13, left: 14, right: 15 };
  var ACTION_BTN = { a: 0, b: 1, x: 2, y: 3 };

  function Joystick(overlay, onUpdate) {
    this.overlay = overlay;
    this.onUpdate = onUpdate;
    this.active = false;
    this.touchId = null;
    this.cx = 0;
    this.cy = 0;
    this.knobX = 0;
    this.knobY = 0;
    this.dirs = { up: false, down: false, left: false, right: false };
    this.zone = null;
    this.base = null;
    this.knob = null;
    this.dirDots = {};
    this.floatZone = null;
    this.floatBase = null;
    this.floatKnob = null;
    this.floatDirDots = {};
    this.radius = 0;
    this.deadzone = 0.18;
    this.buildFixed();
    this.buildFloat();
    this.bindEvents();
  }

  Joystick.prototype.buildFixed = function() {
    this.zone = el('div', 'mgp-joystick-zone mgp-ctrl', this.overlay);
    this.base = el('div', 'mgp-joystick-base', this.zone);
    var dirs = ['up','down','left','right'];
    for (var i = 0; i < dirs.length; i++) {
      this.dirDots[dirs[i]] = el('div', 'mgp-joystick-dir mgp-dir-' + dirs[i], this.base);
    }
    this.knob = el('div', 'mgp-joystick-knob', this.base);
  };

  Joystick.prototype.buildFloat = function() {
    this.floatZone = el('div', 'mgp-ctrl', this.overlay);
    this.floatZone.style.cssText = 'position:absolute;top:0;left:0;width:50%;height:100%;pointer-events:auto;touch-action:none;display:none;z-index:2147483647';
    this.floatBase = el('div', 'mgp-joystick-base mgp-float-base', this.floatZone);
    var dirs = ['up','down','left','right'];
    for (var i = 0; i < dirs.length; i++) {
      this.floatDirDots[dirs[i]] = el('div', 'mgp-joystick-dir mgp-dir-' + dirs[i], this.floatBase);
    }
    this.floatKnob = el('div', 'mgp-joystick-knob', this.floatBase);
  };

  Joystick.prototype.getActiveBase = function() {
    return state.joystickType === 'floating' ? this.floatBase : this.base;
  };

  Joystick.prototype.getActiveKnob = function() {
    return state.joystickType === 'floating' ? this.floatKnob : this.knob;
  };

  Joystick.prototype.getActiveDots = function() {
    return state.joystickType === 'floating' ? this.floatDirDots : this.dirDots;
  };

  Joystick.prototype.updateVisibility = function() {
    var isJoystick = state.inputMode === 'joystick' && state.showControls;
    var isFloat = state.joystickType === 'floating';
    this.zone.style.display = (isJoystick && !isFloat) ? '' : 'none';
    this.floatZone.style.display = (isJoystick && isFloat) ? '' : 'none';
  };

  Joystick.prototype.applyScale = function() {
    var s = state.controlSize;
    this.zone.style.transform = 'scale(' + s + ')';
    this.zone.style.transformOrigin = 'bottom left';
  };

  Joystick.prototype.bindEvents = function() {
    var self = this;

    this.zone.addEventListener('touchstart', function(e) {
      if (state.joystickType !== 'fixed' || state.inputMode !== 'joystick') return;
      e.preventDefault();
      e.stopPropagation();
      var t = e.changedTouches[0];
      self.touchId = t.identifier;
      var rect = self.base.getBoundingClientRect();
      self.cx = rect.left + rect.width / 2;
      self.cy = rect.top + rect.height / 2;
      self.radius = rect.width / 2;
      self.active = true;
      self.base.classList.add('mgp-active');
      self.knob.classList.add('mgp-active');
      self.handleMove(t.clientX, t.clientY);
      haptic(8);
    }, { passive: false, capture: true });

    this.floatZone.addEventListener('touchstart', function(e) {
      if (state.joystickType !== 'floating' || state.inputMode !== 'joystick') return;
      if (self.active) return;
      e.preventDefault();
      e.stopPropagation();
      var t = e.changedTouches[0];
      self.touchId = t.identifier;
      var baseSize = 130 * state.controlSize;
      var bx = clamp(t.clientX, baseSize / 2 + 8, window.innerWidth * 0.5 - baseSize / 2);
      var by = clamp(t.clientY, baseSize / 2 + 8, window.innerHeight - baseSize / 2 - 8);
      self.cx = bx;
      self.cy = by;
      self.radius = baseSize / 2;
      self.floatBase.style.width = baseSize + 'px';
      self.floatBase.style.height = baseSize + 'px';
      self.floatBase.style.left = (bx - baseSize / 2) + 'px';
      self.floatBase.style.top = (by - baseSize / 2) + 'px';
      self.floatBase.classList.add('mgp-visible', 'mgp-active');
      self.floatKnob.classList.add('mgp-active');
      self.floatKnob.style.width = (52 * state.controlSize) + 'px';
      self.floatKnob.style.height = (52 * state.controlSize) + 'px';
      self.active = true;
      self.handleMove(t.clientX, t.clientY);
      haptic(8);
    }, { passive: false, capture: true });

    document.addEventListener('touchmove', function(e) {
      if (!self.active || self.touchId === null) return;
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === self.touchId) {
          e.preventDefault();
          self.handleMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    }, { passive: false });

    document.addEventListener('touchend', function(e) {
      if (!self.active || self.touchId === null) return;
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === self.touchId) {
          self.release();
          break;
        }
      }
    }, { passive: false });

    document.addEventListener('touchcancel', function(e) {
      if (!self.active || self.touchId === null) return;
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === self.touchId) {
          self.release();
          break;
        }
      }
    }, { passive: false });
  };

  Joystick.prototype.handleMove = function(x, y) {
    var dx = x - this.cx;
    var dy = y - this.cy;
    var d = dist(0, 0, dx, dy);
    var maxR = this.radius - 26 * state.controlSize;
    if (maxR < 10) maxR = 10;

    if (d > maxR) {
      dx = dx / d * maxR;
      dy = dy / d * maxR;
    }

    var activeKnob = this.getActiveKnob();
    activeKnob.style.left = 'calc(50% + ' + dx + 'px)';
    activeKnob.style.top = 'calc(50% + ' + dy + 'px)';

    var norm = d / maxR;
    var newDirs = { up: false, down: false, left: false, right: false };
    var moveKeys = getMovementKeys();

    if (norm > this.deadzone) {
      if (state.directionMode === '8way') {
        var nx = dx / d;
        var ny = dy / d;
        if (ny < -0.38) newDirs.up = true;
        if (ny > 0.38) newDirs.down = true;
        if (nx < -0.38) newDirs.left = true;
        if (nx > 0.38) newDirs.right = true;
        if (!newDirs.up && !newDirs.down && !newDirs.left && !newDirs.right) {
          if (Math.abs(nx) > Math.abs(ny)) {
            if (nx > 0) newDirs.right = true;
            else newDirs.left = true;
          } else {
            if (ny < 0) newDirs.up = true;
            else newDirs.down = true;
          }
        }
      } else {
        var absDx = Math.abs(dx);
        var absDy = Math.abs(dy);
        if (absDx > absDy) {
          if (dx > 0) newDirs.right = true;
          else newDirs.left = true;
        } else {
          if (dy < 0) newDirs.up = true;
          else newDirs.down = true;
        }
      }
    }

    var changed = false;
    var dirKeyMap = { up: moveKeys.up, down: moveKeys.down, left: moveKeys.left, right: moveKeys.right };
    var dots = this.getActiveDots();

    for (var dir in newDirs) {
      if (newDirs[dir] !== this.dirs[dir]) {
        changed = true;
        if (newDirs[dir]) {
          fireKey(dirKeyMap[dir], 'keydown');
          padButton(DIR_BTN[dir], true);
          if (dots[dir]) dots[dir].classList.add('mgp-lit');
        } else {
          fireKey(dirKeyMap[dir], 'keyup');
          padButton(DIR_BTN[dir], false);
          if (dots[dir]) dots[dir].classList.remove('mgp-lit');
        }
      }
    }

    if (norm > this.deadzone) {
      padAxis(0, clamp(dx / maxR, -1, 1));
      padAxis(1, clamp(dy / maxR, -1, 1));
    } else {
      padAxis(0, 0);
      padAxis(1, 0);
    }

    if (changed) haptic(6);
    this.dirs = newDirs;
    if (this.onUpdate) this.onUpdate(this.dirs, norm);
  };

  Joystick.prototype.release = function() {
    this.active = false;
    this.touchId = null;

    var moveKeys = getMovementKeys();
    var dirKeyMap = { up: moveKeys.up, down: moveKeys.down, left: moveKeys.left, right: moveKeys.right };
    var dots = this.getActiveDots();
    for (var dir in this.dirs) {
      if (this.dirs[dir]) {
        fireKey(dirKeyMap[dir], 'keyup');
        padButton(DIR_BTN[dir], false);
        if (dots[dir]) dots[dir].classList.remove('mgp-lit');
      }
    }
    this.dirs = { up: false, down: false, left: false, right: false };
    padAxis(0, 0);
    padAxis(1, 0);

    this.base.classList.remove('mgp-active');
    this.knob.classList.remove('mgp-active');
    this.knob.style.left = '50%';
    this.knob.style.top = '50%';

    this.floatBase.classList.remove('mgp-visible', 'mgp-active');
    this.floatKnob.classList.remove('mgp-active');
    this.floatKnob.style.left = '50%';
    this.floatKnob.style.top = '50%';

    if (this.onUpdate) this.onUpdate(this.dirs, 0);
  };

  Joystick.prototype.destroy = function() {
    if (this.zone && this.zone.parentNode) this.zone.parentNode.removeChild(this.zone);
    if (this.floatZone && this.floatZone.parentNode) this.floatZone.parentNode.removeChild(this.floatZone);
  };


  function DPad(overlay) {
    this.overlay = overlay;
    this.zone = null;
    this.buttons = {};
    this.touchMap = {};
    this.pressed = { up: false, down: false, left: false, right: false };
    this.build();
    this.bindEvents();
  }

  DPad.prototype.build = function() {
    this.zone = el('div', 'mgp-dpad-zone mgp-ctrl', this.overlay);
    var pad = el('div', 'mgp-dpad', this.zone);
    el('div', 'mgp-dpad-center', pad);

    var dirs = [
      { name: 'up', cls: 'mgp-dpad-up', icon: ICONS.arrowUp },
      { name: 'down', cls: 'mgp-dpad-down', icon: ICONS.arrowDown },
      { name: 'left', cls: 'mgp-dpad-left', icon: ICONS.arrowLeft },
      { name: 'right', cls: 'mgp-dpad-right', icon: ICONS.arrowRight }
    ];

    for (var i = 0; i < dirs.length; i++) {
      var btn = el('div', 'mgp-dpad-btn mgp-ctrl ' + dirs[i].cls, pad);
      btn.innerHTML = dirs[i].icon;
      btn.dataset.dir = dirs[i].name;
      this.buttons[dirs[i].name] = btn;
    }
  };

  DPad.prototype.updateVisibility = function() {
    this.zone.style.display = (state.inputMode === 'dpad' && state.showControls) ? '' : 'none';
  };

  DPad.prototype.applyScale = function() {
    var s = state.controlSize;
    this.zone.style.transform = 'scale(' + s + ')';
    this.zone.style.transformOrigin = 'bottom left';
  };

  DPad.prototype.bindEvents = function() {
    var self = this;

    this.zone.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var moveKeys = getMovementKeys();
      var dirKeyMap = { up: moveKeys.up, down: moveKeys.down, left: moveKeys.left, right: moveKeys.right };
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        var target = document.elementFromPoint(t.clientX, t.clientY);
        var btn = target ? target.closest('.mgp-dpad-btn') : null;
        if (btn && btn.dataset.dir) {
          var dir = btn.dataset.dir;
          self.touchMap[t.identifier] = dir;
          if (!self.pressed[dir]) {
            self.pressed[dir] = true;
            btn.classList.add('mgp-pressed');
            fireKey(dirKeyMap[dir], 'keydown');
            padButton(DIR_BTN[dir], true);
            haptic(8);
          }
        }
      }
    }, { passive: false, capture: true });

    document.addEventListener('touchmove', function(e) {
      var moveKeys = getMovementKeys();
      var dirKeyMap = { up: moveKeys.up, down: moveKeys.down, left: moveKeys.left, right: moveKeys.right };
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (self.touchMap[t.identifier] !== undefined) {
          var target = document.elementFromPoint(t.clientX, t.clientY);
          var btn = target ? target.closest('.mgp-dpad-btn') : null;
          var oldDir = self.touchMap[t.identifier];
          var newDir = btn ? btn.dataset.dir : null;
          if (newDir !== oldDir) {
            if (oldDir && self.pressed[oldDir]) {
              self.pressed[oldDir] = false;
              self.buttons[oldDir].classList.remove('mgp-pressed');
              fireKey(dirKeyMap[oldDir], 'keyup');
              padButton(DIR_BTN[oldDir], false);
            }
            if (newDir && !self.pressed[newDir]) {
              self.pressed[newDir] = true;
              self.buttons[newDir].classList.add('mgp-pressed');
              fireKey(dirKeyMap[newDir], 'keydown');
              padButton(DIR_BTN[newDir], true);
              haptic(6);
            }
            self.touchMap[t.identifier] = newDir;
          }
        }
      }
    }, { passive: false });

    var endHandler = function(e) {
      var moveKeys = getMovementKeys();
      var dirKeyMap = { up: moveKeys.up, down: moveKeys.down, left: moveKeys.left, right: moveKeys.right };
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        var dir = self.touchMap[t.identifier];
        if (dir !== undefined) {
          if (dir && self.pressed[dir]) {
            var stillHeld = false;
            for (var id in self.touchMap) {
              if (id != t.identifier && self.touchMap[id] === dir) {
                stillHeld = true;
                break;
              }
            }
            if (!stillHeld) {
              self.pressed[dir] = false;
              self.buttons[dir].classList.remove('mgp-pressed');
              fireKey(dirKeyMap[dir], 'keyup');
              padButton(DIR_BTN[dir], false);
            }
          }
          delete self.touchMap[t.identifier];
        }
      }
    };

    document.addEventListener('touchend', endHandler, { passive: false });
    document.addEventListener('touchcancel', endHandler, { passive: false });
  };

  DPad.prototype.releaseAll = function() {
    var moveKeys = getMovementKeys();
    var map = { up: moveKeys.up, down: moveKeys.down, left: moveKeys.left, right: moveKeys.right };
    for (var dir in this.pressed) {
      if (this.pressed[dir]) {
        this.pressed[dir] = false;
        if (this.buttons[dir]) this.buttons[dir].classList.remove('mgp-pressed');
        fireKey(map[dir], 'keyup');
        padButton(DIR_BTN[dir], false);
      }
    }
    this.touchMap = {};
  };

  DPad.prototype.destroy = function() {
    if (this.zone && this.zone.parentNode) this.zone.parentNode.removeChild(this.zone);
  };


  function ActionButtons(overlay) {
    this.overlay = overlay;
    this.container = null;
    this.buttons = {};
    this.touchMap = {};
    this.pressed = {};
    this.build();
    this.bindEvents();
  }

  ActionButtons.prototype.build = function() {
    this.container = el('div', 'mgp-actions mgp-ctrl', this.overlay);

    var defs = [
      { id: 'a', cls: 'mgp-action-a', label: 'A' },
      { id: 'b', cls: 'mgp-action-b', label: 'B' },
      { id: 'x', cls: 'mgp-action-x', label: 'X' },
      { id: 'y', cls: 'mgp-action-y', label: 'Y' }
    ];

    for (var i = 0; i < defs.length; i++) {
      var btn = el('div', 'mgp-action-btn mgp-ctrl ' + defs[i].cls, this.container);
      btn.dataset.btnId = defs[i].id;
      this.buttons[defs[i].id] = btn;
      this.pressed[defs[i].id] = false;
    }

    this.updateLabels();
  };

  ActionButtons.prototype.getKeyForButton = function(id) {
    var map = { a: 'actionBindA', b: 'actionBindB', x: 'actionBindX', y: 'actionBindY' };
    return state[map[id]];
  };

  ActionButtons.prototype.updateLabels = function() {
    for (var id in this.buttons) {
      var keyCode = this.getKeyForButton(id);
      this.buttons[id].textContent = keyLabel(keyCode);
    }
  };

  ActionButtons.prototype.updateVisibility = function() {
    this.container.style.display = (state.actionButtons && state.showControls) ? '' : 'none';
  };

  ActionButtons.prototype.applyScale = function() {
    var s = state.controlSize;
    this.container.style.transform = 'scale(' + s + ')';
    this.container.style.transformOrigin = 'bottom right';
  };

  ActionButtons.prototype.bindEvents = function() {
    var self = this;

    this.container.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        var target = document.elementFromPoint(t.clientX, t.clientY);
        var btn = target ? target.closest('.mgp-action-btn') : null;
        if (btn && btn.dataset.btnId) {
          var id = btn.dataset.btnId;
          self.touchMap[t.identifier] = id;
          if (!self.pressed[id]) {
            self.pressed[id] = true;
            btn.classList.add('mgp-pressed');
            fireKey(self.getKeyForButton(id), 'keydown');
            padButton(ACTION_BTN[id], true);
            haptic(10);
          }
        }
      }
    }, { passive: false, capture: true });

    document.addEventListener('touchmove', function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (self.touchMap[t.identifier] !== undefined) {
          var target = document.elementFromPoint(t.clientX, t.clientY);
          var btn = target ? target.closest('.mgp-action-btn') : null;
          var oldId = self.touchMap[t.identifier];
          var newId = btn ? btn.dataset.btnId : null;
          if (newId !== oldId) {
            if (oldId && self.pressed[oldId]) {
              self.pressed[oldId] = false;
              self.buttons[oldId].classList.remove('mgp-pressed');
              fireKey(self.getKeyForButton(oldId), 'keyup');
              padButton(ACTION_BTN[oldId], false);
            }
            if (newId && !self.pressed[newId]) {
              self.pressed[newId] = true;
              self.buttons[newId].classList.add('mgp-pressed');
              fireKey(self.getKeyForButton(newId), 'keydown');
              padButton(ACTION_BTN[newId], true);
              haptic(8);
            }
            self.touchMap[t.identifier] = newId;
          }
        }
      }
    }, { passive: false });

    var endHandler = function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        var id = self.touchMap[t.identifier];
        if (id !== undefined) {
          if (id && self.pressed[id]) {
            var stillHeld = false;
            for (var tid in self.touchMap) {
              if (tid != t.identifier && self.touchMap[tid] === id) {
                stillHeld = true;
                break;
              }
            }
            if (!stillHeld) {
              self.pressed[id] = false;
              self.buttons[id].classList.remove('mgp-pressed');
              fireKey(self.getKeyForButton(id), 'keyup');
              padButton(ACTION_BTN[id], false);
            }
          }
          delete self.touchMap[t.identifier];
        }
      }
    };

    document.addEventListener('touchend', endHandler, { passive: false });
    document.addEventListener('touchcancel', endHandler, { passive: false });
  };

  ActionButtons.prototype.releaseAll = function() {
    for (var id in this.pressed) {
      if (this.pressed[id]) {
        this.pressed[id] = false;
        if (this.buttons[id]) this.buttons[id].classList.remove('mgp-pressed');
        fireKey(this.getKeyForButton(id), 'keyup');
        padButton(ACTION_BTN[id], false);
      }
    }
    this.touchMap = {};
  };

  ActionButtons.prototype.destroy = function() {
    if (this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
  };


  function CursorSimulator(overlay) {
    this.overlay = overlay;
    this.dot = null;
    this.cursorX = window.innerWidth / 2;
    this.cursorY = window.innerHeight / 2;
    this.touchId = null;
    this.active = false;
    this.dragging = false;
    this.lastTapTime = 0;
    this.doubleTapWindow = 320;
    this.dragStarted = false;
    this.build();
    this.bindEvents();
  }

  CursorSimulator.prototype.build = function() {
    this.dot = el('div', 'mgp-cursor-dot');
    this.dot.style.display = 'none';
    document.body.appendChild(this.dot);
  };

  CursorSimulator.prototype.updateVisibility = function() {
    if (state.cursorMode && state.showControls) {
      this.dot.style.display = '';
      this.dot.style.left = this.cursorX + 'px';
      this.dot.style.top = this.cursorY + 'px';
    } else {
      this.dot.style.display = 'none';
      if (this.dragging) this.endDrag();
    }
  };

  CursorSimulator.prototype.isControlElement = function(target) {
    if (!target) return false;
    return target.closest('.mgp-ctrl') ||
           target.closest('.mgp-panel') ||
           target.closest('.mgp-panel-backdrop') ||
           target.closest('.mgp-gear') ||
           target.closest('.mgp-switch-btn') ||
           target.closest('.mgp-fs-btn') ||
           target.closest('.mgp-kbd-btn');
  };

  CursorSimulator.prototype.dispatchMouse = function(type, x, y, extra) {
    var opts = {
      clientX: x, clientY: y,
      screenX: x, screenY: y,
      pageX: x + window.scrollX,
      pageY: y + window.scrollY,
      bubbles: true, cancelable: true, view: window
    };
    if (extra) {
      for (var k in extra) opts[k] = extra[k];
    }
    var target = document.elementFromPoint(x, y) || document.body;
    target.dispatchEvent(new MouseEvent(type, opts));
  };

  CursorSimulator.prototype.bindEvents = function() {
    var self = this;

    document.addEventListener('touchstart', function(e) {
      if (!state.cursorMode || !state.showControls) return;
      if (self.active) return;

      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        var target = document.elementFromPoint(t.clientX, t.clientY);
        if (self.isControlElement(target)) continue;

        e.preventDefault();
        self.touchId = t.identifier;
        self.active = true;

        var now = Date.now();
        var isDoubleTap = (now - self.lastTapTime) < self.doubleTapWindow;
        self.lastTapTime = now;

        if (isDoubleTap && state.doubleTapDrag) {
          self.dragging = true;
          self.dragStarted = true;
          self.dot.classList.add('mgp-dragging');
          self.dispatchMouse('mousedown', self.cursorX, self.cursorY, { button: 0 });
        }
        break;
      }
    }, { passive: false, capture: true });

    document.addEventListener('touchmove', function(e) {
      if (!self.active || self.touchId === null) return;
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === self.touchId) {
          var t = e.changedTouches[i];
          e.preventDefault();
          self.cursorX = clamp(t.clientX, 0, window.innerWidth);
          self.cursorY = clamp(t.clientY, 0, window.innerHeight);
          self.dot.style.left = self.cursorX + 'px';
          self.dot.style.top = self.cursorY + 'px';
          self.dispatchMouse('mousemove', self.cursorX, self.cursorY);
          break;
        }
      }
    }, { passive: false });

    var endHandler = function(e) {
      if (!self.active || self.touchId === null) return;
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === self.touchId) {
          if (self.dragging) {
            self.endDrag();
          } else if (!self.dragStarted) {
            self.dispatchMouse('click', self.cursorX, self.cursorY, { button: 0 });
          }
          self.active = false;
          self.touchId = null;
          self.dragStarted = false;
          break;
        }
      }
    };

    document.addEventListener('touchend', endHandler, { passive: true });
    document.addEventListener('touchcancel', endHandler, { passive: true });
  };

  CursorSimulator.prototype.endDrag = function() {
    this.dispatchMouse('mouseup', this.cursorX, this.cursorY, { button: 0 });
    this.dragging = false;
    this.dot.classList.remove('mgp-dragging');
  };

  CursorSimulator.prototype.destroy = function() {
    if (this.dot && this.dot.parentNode) this.dot.parentNode.removeChild(this.dot);
  };


  function KeyboardManager(overlay) {
    this.overlay = overlay;
    this.btn = null;
    this.input = null;
    this.kbVisible = false;
    this.build();
    this.bindEvents();
  }

  KeyboardManager.prototype.build = function() {
    this.btn = el('div', 'mgp-kbd-btn mgp-ctrl', this.overlay);
    this.btn.innerHTML = ICONS.keyboard;
    this.input = el('input', 'mgp-hidden-input');
    this.input.type = 'text';
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('autocorrect', 'off');
    this.input.setAttribute('autocapitalize', 'off');
    this.input.setAttribute('spellcheck', 'false');
    document.body.appendChild(this.input);
  };

  KeyboardManager.prototype.updateVisibility = function() {
    this.btn.style.display = (state.virtualKeyboard && state.showControls) ? '' : 'none';
  };

  KeyboardManager.prototype.bindEvents = function() {
    var self = this;

    this.btn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (self.kbVisible) {
        self.input.blur();
        self.kbVisible = false;
      } else {
        self.input.focus();
        self.kbVisible = true;
      }
      haptic(10);
    }, { passive: false });

    this.input.addEventListener('blur', function() {
      self.kbVisible = false;
    });

    this.input.addEventListener('input', function() {
      self.input.value = '';
    });
  };

  KeyboardManager.prototype.destroy = function() {
    if (this.btn && this.btn.parentNode) this.btn.parentNode.removeChild(this.btn);
    if (this.input && this.input.parentNode) this.input.parentNode.removeChild(this.input);
  };


  function SettingsPanel(overlay, onChanged) {
    this.overlay = overlay;
    this.onChanged = onChanged;
    this.gear = null;
    this.backdrop = null;
    this.panel = null;
    this.open = false;
    this.els = {};
    this.resetConfirm = false;
    this.build();
    this.bindGear();
  }

  SettingsPanel.prototype.build = function() {
    this.gear = el('div', 'mgp-gear mgp-ctrl', this.overlay);
    this.gear.innerHTML = ICONS.gear;

    this.backdrop = el('div', 'mgp-panel-backdrop');
    document.body.appendChild(this.backdrop);

    this.panel = el('div', 'mgp-panel');
    document.body.appendChild(this.panel);

    el('div', 'mgp-panel-handle', this.panel);
    var title = el('div', 'mgp-panel-title', this.panel);
    title.textContent = 'Gamepad Settings';

    this.buildInputSection();
    this.buildMovementSection();
    this.buildJoystickSection();
    this.buildActionSection();
    this.buildAdvancedSection();
    this.buildAppearanceSection();
    this.buildVersion();
    this.bindBackdrop();
    this.bindSwipe();
  };

  SettingsPanel.prototype.buildInputSection = function() {
    var section = el('div', 'mgp-section', this.panel);
    var label = el('div', 'mgp-section-label', section);
    label.textContent = 'INPUT MODE';

    var row = el('div', 'mgp-row', section);
    var seg = el('div', 'mgp-seg', row);

    var btnJoy = el('button', 'mgp-seg-btn', seg);
    btnJoy.textContent = 'Joystick';
    var btnDpad = el('button', 'mgp-seg-btn', seg);
    btnDpad.textContent = 'D-Pad';

    this.els.segJoystick = btnJoy;
    this.els.segDpad = btnDpad;

    var self = this;
    btnJoy.addEventListener('click', function() {
      state.inputMode = 'joystick';
      self.syncUI();
      self.emitChange();
    });
    btnDpad.addEventListener('click', function() {
      state.inputMode = 'dpad';
      self.syncUI();
      self.emitChange();
    });
  };

  SettingsPanel.prototype.buildMovementSection = function() {
    var section = el('div', 'mgp-section', this.panel);
    this.els.movementSection = section;

    var label = el('div', 'mgp-section-label', section);
    label.textContent = 'MOVEMENT KEYS';

    var row1 = el('div', 'mgp-row', section);
    var seg = el('div', 'mgp-seg', row1);

    var schemeKeys = Object.keys(MOVEMENT_SCHEMES);
    var self = this;
    this.els.schemeButtons = {};

    for (var i = 0; i < schemeKeys.length; i++) {
      (function(key) {
        var btn = el('button', 'mgp-seg-btn', seg);
        btn.textContent = MOVEMENT_SCHEMES[key].label;
        self.els.schemeButtons[key] = btn;
        btn.addEventListener('click', function() {
          state.movementScheme = key;
          self.syncUI();
          self.emitChange();
        });
      })(schemeKeys[i]);
    }

    var hintRow = el('div', '', section);
    this.els.schemeHint = el('div', 'mgp-scheme-hint', hintRow);

    this.els.customBindContainer = el('div', '', section);
    var customDirs = [
      { id: 'customUp', label: 'Up', stateKey: 'customMoveUp' },
      { id: 'customDown', label: 'Down', stateKey: 'customMoveDown' },
      { id: 'customLeft', label: 'Left', stateKey: 'customMoveLeft' },
      { id: 'customRight', label: 'Right', stateKey: 'customMoveRight' }
    ];

    for (var ci = 0; ci < customDirs.length; ci++) {
      (function(bind) {
        var row = el('div', 'mgp-bind-row', self.els.customBindContainer);
        var lbl = el('div', 'mgp-bind-label mgp-bind-label-wide', row);
        lbl.textContent = bind.label;
        var btn = el('div', 'mgp-bind-btn', row);
        btn.textContent = keyLabel(state[bind.stateKey]);
        btn.dataset.stateKey = bind.stateKey;
        self.els['bind_' + bind.id] = btn;

        btn.addEventListener('click', function() {
          self.cycleBinding(bind.stateKey, btn);
        });
      })(customDirs[ci]);
    }
  };

  SettingsPanel.prototype.buildJoystickSection = function() {
    var section = el('div', 'mgp-section', this.panel);
    this.els.joystickSection = section;

    var label = el('div', 'mgp-section-label', section);
    label.textContent = 'JOYSTICK';

    var row1 = el('div', 'mgp-row', section);
    var lbl1 = el('div', 'mgp-row-label', row1);
    lbl1.textContent = 'Position';
    var seg1 = el('div', 'mgp-seg', row1);
    var btnFixed = el('button', 'mgp-seg-btn', seg1);
    btnFixed.textContent = 'Fixed';
    var btnFloat = el('button', 'mgp-seg-btn', seg1);
    btnFloat.textContent = 'Float';
    this.els.segFixed = btnFixed;
    this.els.segFloat = btnFloat;

    var self = this;
    btnFixed.addEventListener('click', function() {
      state.joystickType = 'fixed';
      self.syncUI();
      self.emitChange();
    });
    btnFloat.addEventListener('click', function() {
      state.joystickType = 'floating';
      self.syncUI();
      self.emitChange();
    });

    var row2 = el('div', 'mgp-row', section);
    var lbl2 = el('div', 'mgp-row-label', row2);
    lbl2.textContent = 'Directions';
    var seg2 = el('div', 'mgp-seg', row2);
    var btn4 = el('button', 'mgp-seg-btn', seg2);
    btn4.textContent = '4-Way';
    var btn8 = el('button', 'mgp-seg-btn', seg2);
    btn8.textContent = '8-Way';
    this.els.seg4way = btn4;
    this.els.seg8way = btn8;

    btn4.addEventListener('click', function() {
      state.directionMode = '4way';
      self.syncUI();
      self.emitChange();
    });
    btn8.addEventListener('click', function() {
      state.directionMode = '8way';
      self.syncUI();
      self.emitChange();
    });
  };

  SettingsPanel.prototype.buildActionSection = function() {
    var section = el('div', 'mgp-section', this.panel);
    var label = el('div', 'mgp-section-label', section);
    label.textContent = 'ACTION BUTTONS';

    var toggleRow = el('div', 'mgp-row', section);
    var toggleLabel = el('div', 'mgp-row-label', toggleRow);
    toggleLabel.textContent = 'Show Buttons';
    this.els.toggleActions = this.createToggle(toggleRow, state.actionButtons);

    var self = this;
    this.els.toggleActions.el.addEventListener('click', function() {
      state.actionButtons = !state.actionButtons;
      self.updateToggle(self.els.toggleActions, state.actionButtons);
      self.syncUI();
      self.emitChange();
    });

    this.els.bindContainer = el('div', '', section);
    var binds = [
      { id: 'a', label: 'A', stateKey: 'actionBindA' },
      { id: 'b', label: 'B', stateKey: 'actionBindB' },
      { id: 'x', label: 'X', stateKey: 'actionBindX' },
      { id: 'y', label: 'Y', stateKey: 'actionBindY' }
    ];

    for (var i = 0; i < binds.length; i++) {
      (function(bind) {
        var row = el('div', 'mgp-bind-row', self.els.bindContainer);
        var lbl = el('div', 'mgp-bind-label', row);
        lbl.textContent = bind.label;
        var btn = el('div', 'mgp-bind-btn', row);
        btn.textContent = keyLabel(state[bind.stateKey]);
        btn.dataset.stateKey = bind.stateKey;
        self.els['bind_' + bind.id] = btn;

        btn.addEventListener('click', function() {
          self.cycleBinding(bind.stateKey, btn);
        });
      })(binds[i]);
    }
  };

  SettingsPanel.prototype.cycleBinding = function(stateKey, btn) {
    var current = state[stateKey];
    var idx = BINDABLE_KEYS.indexOf(current);
    idx = (idx + 1) % BINDABLE_KEYS.length;
    state[stateKey] = BINDABLE_KEYS[idx];
    btn.textContent = keyLabel(BINDABLE_KEYS[idx]);
    this.emitChange();
    haptic(6);
  };

  SettingsPanel.prototype.buildAdvancedSection = function() {
    var section = el('div', 'mgp-section', this.panel);
    var label = el('div', 'mgp-section-label', section);
    label.textContent = 'ADVANCED';

    var self = this;

    var row1 = el('div', 'mgp-row', section);
    var lbl1 = el('div', 'mgp-row-label', row1);
    lbl1.textContent = 'Cursor Mode';
    this.els.toggleCursor = this.createToggle(row1, state.cursorMode);
    this.els.toggleCursor.el.addEventListener('click', function() {
      state.cursorMode = !state.cursorMode;
      self.updateToggle(self.els.toggleCursor, state.cursorMode);
      self.syncUI();
      self.emitChange();
    });

    var row2 = el('div', 'mgp-row', section);
    this.els.doubleTapRow = row2;
    var lbl2 = el('div', 'mgp-row-label', row2);
    lbl2.textContent = 'Double-Tap Drag';
    this.els.toggleDoubleTap = this.createToggle(row2, state.doubleTapDrag);
    this.els.toggleDoubleTap.el.addEventListener('click', function() {
      state.doubleTapDrag = !state.doubleTapDrag;
      self.updateToggle(self.els.toggleDoubleTap, state.doubleTapDrag);
      self.emitChange();
    });

    var row3 = el('div', 'mgp-row', section);
    var lbl3 = el('div', 'mgp-row-label', row3);
    lbl3.textContent = 'Virtual Keyboard';
    this.els.toggleKeyboard = this.createToggle(row3, state.virtualKeyboard);
    this.els.toggleKeyboard.el.addEventListener('click', function() {
      state.virtualKeyboard = !state.virtualKeyboard;
      self.updateToggle(self.els.toggleKeyboard, state.virtualKeyboard);
      self.emitChange();
    });

    var row4 = el('div', 'mgp-row', section);
    var lbl4 = el('div', 'mgp-row-label', row4);
    lbl4.textContent = 'Haptic Feedback';
    this.els.toggleHaptic = this.createToggle(row4, state.hapticFeedback);
    this.els.toggleHaptic.el.addEventListener('click', function() {
      state.hapticFeedback = !state.hapticFeedback;
      self.updateToggle(self.els.toggleHaptic, state.hapticFeedback);
      self.emitChange();
      haptic(15);
    });
  };

  SettingsPanel.prototype.buildAppearanceSection = function() {
    var section = el('div', 'mgp-section', this.panel);
    var label = el('div', 'mgp-section-label', section);
    label.textContent = 'APPEARANCE';

    var self = this;

    var row1 = el('div', 'mgp-row', section);
    var lbl1 = el('div', 'mgp-row-label', row1);
    lbl1.textContent = 'Opacity';
    var wrap1 = el('div', 'mgp-slider-wrap', row1);
    var slider1 = el('input', 'mgp-slider mgp-ctrl', wrap1);
    slider1.type = 'range';
    slider1.min = '0.15';
    slider1.max = '0.9';
    slider1.step = '0.05';
    slider1.value = state.opacity;
    var val1 = el('div', 'mgp-slider-val', wrap1);
    val1.textContent = Math.round(state.opacity * 100) + '%';
    this.els.sliderOpacity = slider1;
    this.els.sliderOpacityVal = val1;

    slider1.addEventListener('input', function() {
      state.opacity = parseFloat(slider1.value);
      val1.textContent = Math.round(state.opacity * 100) + '%';
      self.emitChange();
    });

    var row2 = el('div', 'mgp-row', section);
    var lbl2 = el('div', 'mgp-row-label', row2);
    lbl2.textContent = 'Size';
    var wrap2 = el('div', 'mgp-slider-wrap', row2);
    var slider2 = el('input', 'mgp-slider mgp-ctrl', wrap2);
    slider2.type = 'range';
    slider2.min = '0.6';
    slider2.max = '1.5';
    slider2.step = '0.05';
    slider2.value = state.controlSize;
    var val2 = el('div', 'mgp-slider-val', wrap2);
    val2.textContent = Math.round(state.controlSize * 100) + '%';
    this.els.sliderSize = slider2;
    this.els.sliderSizeVal = val2;

    slider2.addEventListener('input', function() {
      state.controlSize = parseFloat(slider2.value);
      val2.textContent = Math.round(state.controlSize * 100) + '%';
      self.emitChange();
    });
  };

  SettingsPanel.prototype.buildVersion = function() {
    var section = el('div', 'mgp-section', this.panel);
    el('div', 'mgp-divider', section);

    var resetBtn = el('button', 'mgp-reset-btn', section);
    resetBtn.textContent = 'Reset to Defaults';
    this.els.resetBtn = resetBtn;

    var self = this;
    resetBtn.addEventListener('click', function() {
      if (self.resetConfirm) {
        for (var k in M.defaults) { state[k] = M.defaults[k]; }
        self.syncUI();
        self.emitChange();
        resetBtn.textContent = 'Reset to Defaults';
        self.resetConfirm = false;
        haptic(20);
      } else {
        self.resetConfirm = true;
        resetBtn.textContent = 'Tap Again to Confirm';
        haptic(10);
        setTimeout(function() {
          self.resetConfirm = false;
          resetBtn.textContent = 'Reset to Defaults';
        }, 3000);
      }
    });

    var v = el('div', 'mgp-version', this.panel);
    v.textContent = 'MobileGamepad v' + M.VERSION;
  };

  SettingsPanel.prototype.createToggle = function(parent, initialState) {
    var wrap = el('button', 'mgp-toggle mgp-ctrl', parent);
    if (initialState) wrap.classList.add('mgp-on');
    var thumb = el('div', 'mgp-toggle-thumb', wrap);
    return { el: wrap, thumb: thumb };
  };

  SettingsPanel.prototype.updateToggle = function(toggle, val) {
    if (val) toggle.el.classList.add('mgp-on');
    else toggle.el.classList.remove('mgp-on');
  };

  SettingsPanel.prototype.syncUI = function() {
    var j = state.inputMode === 'joystick';
    this.els.segJoystick.classList.toggle('mgp-active', j);
    this.els.segDpad.classList.toggle('mgp-active', !j);

    this.els.joystickSection.style.display = j ? '' : 'none';

    this.els.segFixed.classList.toggle('mgp-active', state.joystickType === 'fixed');
    this.els.segFloat.classList.toggle('mgp-active', state.joystickType === 'floating');

    this.els.seg4way.classList.toggle('mgp-active', state.directionMode === '4way');
    this.els.seg8way.classList.toggle('mgp-active', state.directionMode === '8way');

    var schemeKeys = Object.keys(MOVEMENT_SCHEMES);
    for (var si = 0; si < schemeKeys.length; si++) {
      var sk = schemeKeys[si];
      if (this.els.schemeButtons[sk]) {
        this.els.schemeButtons[sk].classList.toggle('mgp-active', state.movementScheme === sk);
      }
    }

    var isCustom = state.movementScheme === 'custom';
    this.els.customBindContainer.style.display = isCustom ? '' : 'none';

    if (!isCustom) {
      var scheme = MOVEMENT_SCHEMES[state.movementScheme] || MOVEMENT_SCHEMES.arrows;
      this.els.schemeHint.textContent = '↑ ' + keyLabel(scheme.up) + '  ↓ ' + keyLabel(scheme.down) + '  ← ' + keyLabel(scheme.left) + '  → ' + keyLabel(scheme.right);
      this.els.schemeHint.style.display = '';
    } else {
      this.els.schemeHint.style.display = 'none';
    }

    if (isCustom) {
      var customBinds = [
        { id: 'customUp', stateKey: 'customMoveUp' },
        { id: 'customDown', stateKey: 'customMoveDown' },
        { id: 'customLeft', stateKey: 'customMoveLeft' },
        { id: 'customRight', stateKey: 'customMoveRight' }
      ];
      for (var cb = 0; cb < customBinds.length; cb++) {
        var bindEl = this.els['bind_' + customBinds[cb].id];
        if (bindEl) bindEl.textContent = keyLabel(state[customBinds[cb].stateKey]);
      }
    }

    this.updateToggle(this.els.toggleActions, state.actionButtons);
    this.els.bindContainer.style.display = state.actionButtons ? '' : 'none';

    var btnIds = ['a','b','x','y'];
    for (var bi = 0; bi < btnIds.length; bi++) {
      var btnId = btnIds[bi];
      var stateKey = 'actionBind' + btnId.toUpperCase();
      if (this.els['bind_' + btnId]) {
        this.els['bind_' + btnId].textContent = keyLabel(state[stateKey]);
      }
    }

    this.updateToggle(this.els.toggleCursor, state.cursorMode);
    this.els.doubleTapRow.style.display = state.cursorMode ? '' : 'none';
    this.updateToggle(this.els.toggleDoubleTap, state.doubleTapDrag);
    this.updateToggle(this.els.toggleKeyboard, state.virtualKeyboard);
    this.updateToggle(this.els.toggleHaptic, state.hapticFeedback);

    this.els.sliderOpacity.value = state.opacity;
    this.els.sliderOpacityVal.textContent = Math.round(state.opacity * 100) + '%';
    this.els.sliderSize.value = state.controlSize;
    this.els.sliderSizeVal.textContent = Math.round(state.controlSize * 100) + '%';
  };

  SettingsPanel.prototype.bindGear = function() {
    var self = this;
    this.gear.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      self.toggle();
      haptic(10);
    }, { passive: false });
  };

  SettingsPanel.prototype.bindBackdrop = function() {
    var self = this;
    this.backdrop.addEventListener('touchstart', function(e) {
      e.preventDefault();
      self.close();
    }, { passive: false });
  };

  SettingsPanel.prototype.bindSwipe = function() {
    var self = this;
    var startY = 0;
    var startTime = 0;
    this.panel.addEventListener('touchstart', function(e) {
      if (e.target.closest('.mgp-slider') || e.target.closest('.mgp-toggle') ||
          e.target.closest('.mgp-seg-btn') || e.target.closest('.mgp-bind-btn')) return;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    }, { passive: true });
    this.panel.addEventListener('touchend', function(e) {
      var endY = e.changedTouches[0].clientY;
      var elapsed = Date.now() - startTime;
      if (endY - startY > 60 && elapsed < 400) {
        self.close();
      }
    }, { passive: true });
  };

  SettingsPanel.prototype.toggle = function() {
    if (this.open) this.close();
    else this.show();
  };

  SettingsPanel.prototype.show = function() {
    this.open = true;
    this.syncUI();
    this.gear.classList.add('mgp-open');
    this.backdrop.classList.add('mgp-visible');
    this.panel.classList.add('mgp-visible');
  };

  SettingsPanel.prototype.close = function() {
    this.open = false;
    this.gear.classList.remove('mgp-open');
    this.backdrop.classList.remove('mgp-visible');
    this.panel.classList.remove('mgp-visible');
  };

  SettingsPanel.prototype.emitChange = function() {
    M.saveState();
    if (this.onChanged) this.onChanged();
  };

  SettingsPanel.prototype.updateGearPosition = function() {
    if (state.actionButtons) {
      this.gear.style.bottom = '148px';
    } else {
      this.gear.style.bottom = '16px';
    }
  };

  SettingsPanel.prototype.destroy = function() {
    if (this.gear && this.gear.parentNode) this.gear.parentNode.removeChild(this.gear);
    if (this.backdrop && this.backdrop.parentNode) this.backdrop.parentNode.removeChild(this.backdrop);
    if (this.panel && this.panel.parentNode) this.panel.parentNode.removeChild(this.panel);
  };

  M.Joystick = Joystick;
  M.DPad = DPad;
  M.ActionButtons = ActionButtons;
  M.CursorSimulator = CursorSimulator;
  M.KeyboardManager = KeyboardManager;
  M.SettingsPanel = SettingsPanel;

})();
