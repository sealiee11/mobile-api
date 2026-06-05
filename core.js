(function() {
  'use strict';

  var M = window.__MGP;
  if (!M || !M.active) return;

  var PREFIX = 'mgp_';
  M.VERSION = '2.0.0';

  function store(key, val) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch(e) {}
  }

  function load(key, fallback) {
    try {
      var v = localStorage.getItem(PREFIX + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch(e) { return fallback; }
  }

  var MOVEMENT_SCHEMES = {
    arrows: { label: 'Arrows', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
    wasd:   { label: 'WASD',   up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' },
    zqsd:   { label: 'ZQSD',   up: 'KeyZ', down: 'KeyS', left: 'KeyQ', right: 'KeyD' },
    ijkl:   { label: 'IJKL',   up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL' },
    custom: { label: 'Custom', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }
  };

  var defaults = {
    inputMode: 'joystick',
    joystickType: 'fixed',
    directionMode: '4way',
    movementScheme: 'arrows',
    customMoveUp: 'ArrowUp',
    customMoveDown: 'ArrowDown',
    customMoveLeft: 'ArrowLeft',
    customMoveRight: 'ArrowRight',
    actionButtons: true,
    actionBindA: 'Space',
    actionBindB: 'KeyX',
    actionBindX: 'ShiftLeft',
    actionBindY: 'KeyZ',
    cursorMode: false,
    doubleTapDrag: false,
    virtualKeyboard: false,
    hapticFeedback: true,
    opacity: 0.45,
    controlSize: 1.0,
    showControls: true
  };

  var state = {};
  Object.keys(defaults).forEach(function(k) {
    state[k] = load(k, defaults[k]);
  });

  function saveState() {
    Object.keys(state).forEach(function(k) { store(k, state[k]); });
  }

  function getMovementKeys() {
    if (state.movementScheme === 'custom') {
      return { up: state.customMoveUp, down: state.customMoveDown, left: state.customMoveLeft, right: state.customMoveRight };
    }
    var scheme = MOVEMENT_SCHEMES[state.movementScheme] || MOVEMENT_SCHEMES.arrows;
    return { up: scheme.up, down: scheme.down, left: scheme.left, right: scheme.right };
  }

  var KEY_DB = {
    ArrowUp:    { key: 'ArrowUp',    code: 'ArrowUp',    keyCode: 38 },
    ArrowDown:  { key: 'ArrowDown',  code: 'ArrowDown',  keyCode: 40 },
    ArrowLeft:  { key: 'ArrowLeft',  code: 'ArrowLeft',  keyCode: 37 },
    ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
    Space:      { key: ' ',          code: 'Space',       keyCode: 32 },
    Enter:      { key: 'Enter',      code: 'Enter',       keyCode: 13 },
    ShiftLeft:  { key: 'Shift',      code: 'ShiftLeft',   keyCode: 16 },
    ShiftRight: { key: 'Shift',      code: 'ShiftRight',  keyCode: 16 },
    ControlLeft:{ key: 'Control',    code: 'ControlLeft', keyCode: 17 },
    KeyZ:       { key: 'z',          code: 'KeyZ',        keyCode: 90 },
    KeyX:       { key: 'x',          code: 'KeyX',        keyCode: 88 },
    KeyC:       { key: 'c',          code: 'KeyC',        keyCode: 67 },
    KeyA:       { key: 'a',          code: 'KeyA',        keyCode: 65 },
    KeyS:       { key: 's',          code: 'KeyS',        keyCode: 83 },
    KeyD:       { key: 'd',          code: 'KeyD',        keyCode: 68 },
    KeyW:       { key: 'w',          code: 'KeyW',        keyCode: 87 },
    KeyE:       { key: 'e',          code: 'KeyE',        keyCode: 69 },
    KeyQ:       { key: 'q',          code: 'KeyQ',        keyCode: 81 },
    KeyR:       { key: 'r',          code: 'KeyR',        keyCode: 82 },
    KeyF:       { key: 'f',          code: 'KeyF',        keyCode: 70 },
    KeyI:       { key: 'i',          code: 'KeyI',        keyCode: 73 },
    KeyJ:       { key: 'j',          code: 'KeyJ',        keyCode: 74 },
    KeyK:       { key: 'k',          code: 'KeyK',        keyCode: 75 },
    KeyL:       { key: 'l',          code: 'KeyL',        keyCode: 76 },
    Digit1:     { key: '1',          code: 'Digit1',      keyCode: 49 },
    Digit2:     { key: '2',          code: 'Digit2',      keyCode: 50 },
    Digit3:     { key: '3',          code: 'Digit3',      keyCode: 51 },
    Digit4:     { key: '4',          code: 'Digit4',      keyCode: 52 },
    Digit5:     { key: '5',          code: 'Digit5',      keyCode: 53 },
    Tab:        { key: 'Tab',        code: 'Tab',         keyCode: 9  },
    Escape:     { key: 'Escape',     code: 'Escape',      keyCode: 27 },
    Backspace:  { key: 'Backspace',  code: 'Backspace',   keyCode: 8  }
  };

  var BINDABLE_KEYS = [
    'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
    'Space','Enter','ShiftLeft','ControlLeft','KeyZ','KeyX','KeyC',
    'KeyA','KeyS','KeyD','KeyW','KeyE','KeyQ','KeyR','KeyF',
    'KeyI','KeyJ','KeyK','KeyL',
    'Digit1','Digit2','Digit3','Digit4','Digit5',
    'Tab','Escape','Backspace'
  ];

  function keyLabel(code) {
    if (!code) return '?';
    var map = {
      Space:'SPC',Enter:'ENT',ShiftLeft:'SHF',ShiftRight:'SHF',
      ControlLeft:'CTL',Tab:'TAB',Escape:'ESC',Backspace:'BKS',
      ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'
    };
    if (map[code]) return map[code];
    return code.replace('Key','').replace('Digit','');
  }

  var pressedKeys = {};

  function makeKeyEvent(type, info) {
    var evt;
    try {
      evt = new KeyboardEvent(type, { key: info.key, code: info.code, bubbles: true, cancelable: true, composed: true, view: window, repeat: false });
    } catch(e) {
      evt = document.createEvent('Event');
      evt.initEvent(type, true, true);
      try { evt.key = info.key; evt.code = info.code; } catch(e2) {}
    }
    try { Object.defineProperty(evt, 'keyCode', { get: function() { return info.keyCode; } }); } catch(e) {}
    try { Object.defineProperty(evt, 'which', { get: function() { return info.keyCode; } }); } catch(e) {}
    try { Object.defineProperty(evt, 'charCode', { get: function() { return 0; } }); } catch(e) {}
    return evt;
  }

  function fireOn(target, type, info) {
    if (!target) return;
    try { target.dispatchEvent(makeKeyEvent(type, info)); } catch(e) {}
  }

  function fireKey(code, type) {
    if (!KEY_DB[code]) return;
    if (type === 'keydown' && pressedKeys[code]) return;
    if (type === 'keyup' && !pressedKeys[code]) return;
    if (type === 'keydown') pressedKeys[code] = true;
    if (type === 'keyup') delete pressedKeys[code];

    var info = KEY_DB[code];

    var primary = document.querySelector('canvas');
    if (!primary) {
      var ae = document.activeElement;
      if (ae && ae !== document.body && !ae.classList.contains('mgp-hidden-input')) primary = ae;
    }
    if (!primary) primary = document.body || document.documentElement || document;
    fireOn(primary, type, info);

    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      try {
        var idoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
        var itarget = idoc.querySelector('canvas') || idoc.body || idoc;
        fireOn(itarget, type, info);
      } catch(e) {}
    }

    if (window.MobileGamepad && window.MobileGamepad.emit) {
      window.MobileGamepad.emit(type, { code: code, key: info.key });
    }
  }

  function releaseAllKeys() {
    Object.keys(pressedKeys).forEach(function(code) { fireKey(code, 'keyup'); });
  }

  function nowTs() {
    try { return performance.now(); } catch(e) { return 0; }
  }

  var padConnected = false;

  function ensurePadConnected() {
    if (padConnected || !M.pad) return;
    padConnected = true;
    try {
      var e;
      try { e = new Event('gamepadconnected'); } catch(e0) { e = document.createEvent('Event'); e.initEvent('gamepadconnected', false, false); }
      try { e.gamepad = M.pad; } catch(e1) { try { Object.defineProperty(e, 'gamepad', { value: M.pad }); } catch(e2) {} }
      window.dispatchEvent(e);
    } catch(err) {}
  }

  function bumpTs() {
    var t = nowTs();
    if (t <= M.pad.timestamp) t = M.pad.timestamp + 1;
    M.pad.timestamp = t;
  }

  function padButton(index, pressed) {
    if (!M.pad) return;
    var b = M.pad.buttons[index];
    if (!b) return;
    var on = !!pressed;
    if (b.pressed === on) return;
    b.pressed = on;
    b.touched = on;
    b.value = on ? 1 : 0;
    bumpTs();
    ensurePadConnected();
  }

  function padAxis(index, value) {
    if (!M.pad) return;
    if (typeof value !== 'number' || !isFinite(value)) return;
    var v = clamp(value, -1, 1);
    if (M.pad.axes[index] === v) return;
    M.pad.axes[index] = v;
    bumpTs();
    ensurePadConnected();
  }

  function padReset() {
    if (!M.pad) return;
    var changed = false;
    for (var i = 0; i < M.pad.buttons.length; i++) {
      var b = M.pad.buttons[i];
      if (b.pressed || b.touched || b.value) { b.pressed = false; b.touched = false; b.value = 0; changed = true; }
    }
    for (var a = 0; a < M.pad.axes.length; a++) {
      if (M.pad.axes[a] !== 0) { M.pad.axes[a] = 0; changed = true; }
    }
    if (changed) bumpTs();
  }

  function haptic(ms) {
    if (!state.hapticFeedback) return;
    if (navigator.vibrate) navigator.vibrate(ms || 10);
  }

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
  function dist(x1, y1, x2, y2) { return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1)); }

  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  var CSS = [
    '.mgp-overlay{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;overflow:hidden}',
    '.mgp-ctrl{pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none;position:relative;z-index:2147483646}',
    '.mgp-joystick-zone{position:absolute;bottom:12px;left:12px;transition:opacity 0.2s;z-index:2147483647}',
    '.mgp-joystick-base{width:130px;height:130px;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(255,255,255,0.12),rgba(255,255,255,0.04));border:1.5px solid rgba(255,255,255,0.18);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);position:relative;box-shadow:0 2px 16px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.08);transition:transform 0.15s,box-shadow 0.15s}',
    '.mgp-joystick-base.mgp-active{box-shadow:0 2px 24px rgba(100,180,255,0.15),inset 0 1px 0 rgba(255,255,255,0.12);border-color:rgba(100,180,255,0.3)}',
    '.mgp-joystick-knob{width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(255,255,255,0.28),rgba(255,255,255,0.1));border:1.5px solid rgba(255,255,255,0.25);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 2px 10px rgba(0,0,0,0.25);transition:box-shadow 0.1s;will-change:left,top}',
    '.mgp-joystick-knob.mgp-active{background:radial-gradient(circle at 40% 35%,rgba(255,255,255,0.4),rgba(255,255,255,0.15));box-shadow:0 2px 14px rgba(100,180,255,0.2);border-color:rgba(100,180,255,0.4)}',
    '.mgp-joystick-dir{position:absolute;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.08);transition:background 0.15s,transform 0.15s}',
    '.mgp-joystick-dir.mgp-lit{background:rgba(100,180,255,0.5);transform:scale(1.3)}',
    '.mgp-joystick-dir.mgp-dir-up{top:8px;left:50%;margin-left:-4px}',
    '.mgp-joystick-dir.mgp-dir-down{bottom:8px;left:50%;margin-left:-4px}',
    '.mgp-joystick-dir.mgp-dir-left{left:8px;top:50%;margin-top:-4px}',
    '.mgp-joystick-dir.mgp-dir-right{right:8px;top:50%;margin-top:-4px}',
    '.mgp-float-base{position:absolute;pointer-events:none;opacity:0;transition:opacity 0.12s}',
    '.mgp-float-base.mgp-visible{opacity:1}',
    '.mgp-dpad-zone{position:absolute;bottom:12px;left:12px;transition:opacity 0.2s;z-index:2147483647}',
    '.mgp-dpad{width:130px;height:130px;position:relative}',
    '.mgp-dpad-btn{position:absolute;width:42px;height:42px;border-radius:10px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;transition:background 0.1s,border-color 0.1s,transform 0.08s;box-shadow:0 1px 8px rgba(0,0,0,0.15)}',
    '.mgp-dpad-btn.mgp-pressed{background:rgba(100,180,255,0.2);border-color:rgba(100,180,255,0.4);transform:scale(0.92)}',
    '.mgp-dpad-btn svg{width:18px;height:18px;fill:none;stroke:rgba(255,255,255,0.55);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}',
    '.mgp-dpad-btn.mgp-pressed svg{stroke:rgba(100,180,255,0.8)}',
    '.mgp-dpad-up{top:0;left:50%;margin-left:-21px}',
    '.mgp-dpad-down{bottom:0;left:50%;margin-left:-21px}',
    '.mgp-dpad-left{left:0;top:50%;margin-top:-21px}',
    '.mgp-dpad-right{right:0;top:50%;margin-top:-21px}',
    '.mgp-dpad-center{position:absolute;top:50%;left:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08)}',
    '.mgp-actions{position:absolute;bottom:16px;right:16px;width:120px;height:120px;transition:opacity 0.2s;z-index:2147483647}',
    '.mgp-action-btn{position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:rgba(255,255,255,0.55);letter-spacing:0.5px;transition:background 0.1s,border-color 0.1s,transform 0.08s,color 0.1s;box-shadow:0 1px 8px rgba(0,0,0,0.15);text-transform:uppercase}',
    '.mgp-action-btn.mgp-pressed{background:rgba(100,180,255,0.2);border-color:rgba(100,180,255,0.4);color:rgba(100,180,255,0.9);transform:scale(0.9)}',
    '.mgp-action-a{bottom:0;left:50%;margin-left:-22px}',
    '.mgp-action-b{right:0;top:50%;margin-top:-22px}',
    '.mgp-action-x{left:0;top:50%;margin-top:-22px}',
    '.mgp-action-y{top:0;left:50%;margin-left:-22px}',
    '.mgp-switch-btn{position:absolute;bottom:150px;left:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 6px rgba(0,0,0,0.12);transition:background 0.15s,border-color 0.15s;z-index:2147483647}',
    '.mgp-switch-btn:active{background:rgba(100,180,255,0.15);border-color:rgba(100,180,255,0.3)}',
    '.mgp-switch-btn svg{width:16px;height:16px;fill:none;stroke:rgba(255,255,255,0.45);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.mgp-fs-btn{position:absolute;top:12px;left:12px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 6px rgba(0,0,0,0.12);transition:background 0.15s,border-color 0.15s;z-index:2147483647}',
    '.mgp-fs-btn:active{background:rgba(100,180,255,0.15);border-color:rgba(100,180,255,0.3)}',
    '.mgp-fs-btn svg{width:16px;height:16px;fill:none;stroke:rgba(255,255,255,0.45);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.mgp-gear{position:absolute;bottom:148px;right:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 6px rgba(0,0,0,0.12);transition:background 0.2s,transform 0.3s,border-color 0.2s;z-index:2147483647}',
    '.mgp-gear.mgp-open{background:rgba(100,180,255,0.12);border-color:rgba(100,180,255,0.3);transform:rotate(45deg)}',
    '.mgp-gear svg{width:16px;height:16px;fill:none;stroke:rgba(255,255,255,0.45);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
    '.mgp-panel-backdrop{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);opacity:0;pointer-events:none;transition:opacity 0.25s;z-index:2147483647}',
    '.mgp-panel-backdrop.mgp-visible{opacity:1;pointer-events:auto}',
    '.mgp-panel{position:fixed;bottom:0;left:0;right:0;max-height:85vh;background:rgba(20,22,28,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,0.1);border-radius:20px 20px 0 0;transform:translateY(100%);transition:transform 0.3s cubic-bezier(0.32,0.72,0,1);z-index:2147483647;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 0 env(safe-area-inset-bottom,24px) 0;touch-action:pan-y}',
    '.mgp-panel.mgp-visible{transform:translateY(0)}',
    '.mgp-panel-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.2);margin:10px auto 0}',
    '.mgp-panel-title{font-size:17px;font-weight:700;color:rgba(255,255,255,0.9);padding:18px 20px 10px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;letter-spacing:-0.2px}',
    '.mgp-section{padding:6px 20px 14px}',
    '.mgp-section-label{font-size:11px;font-weight:700;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.2px;padding:14px 0 8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
    '.mgp-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:14px 0;min-height:52px;border-bottom:1px solid rgba(255,255,255,0.05);gap:8px}',
    '.mgp-row:last-child{border-bottom:none}',
    '.mgp-row-label{font-size:14px;color:rgba(255,255,255,0.75);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-weight:500;flex-shrink:0}',
    '.mgp-toggle{position:relative;width:54px;height:32px;border-radius:16px;background:rgba(255,255,255,0.12);border:none;padding:0;cursor:pointer;transition:background 0.2s;flex-shrink:0;touch-action:manipulation;-webkit-tap-highlight-color:rgba(100,180,255,0.15)}',
    '.mgp-toggle.mgp-on{background:rgba(52,120,246,0.85)}',
    '.mgp-toggle-thumb{position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:left 0.2s}',
    '.mgp-toggle.mgp-on .mgp-toggle-thumb{left:25px}',
    '.mgp-seg{display:flex;background:rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);width:100%}',
    '.mgp-seg-btn{flex:1;padding:14px 10px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.45);text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:transparent;border:none;cursor:pointer;transition:background 0.15s,color 0.15s;letter-spacing:0.3px;touch-action:manipulation;min-height:48px;-webkit-tap-highlight-color:rgba(100,180,255,0.15)}',
    '.mgp-seg-btn.mgp-active{background:rgba(52,120,246,0.75);color:rgba(255,255,255,0.95)}',
    '.mgp-slider-wrap{display:flex;align-items:center;gap:10px;flex:1;max-width:160px}',
    '.mgp-slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:2px;background:rgba(255,255,255,0.12);outline:none}',
    '.mgp-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer}',
    '.mgp-slider-val{font-size:11px;color:rgba(255,255,255,0.45);min-width:28px;text-align:right;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-variant-numeric:tabular-nums}',
    '.mgp-bind-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)}',
    '.mgp-bind-row:last-child{border-bottom:none}',
    '.mgp-bind-label{font-size:14px;color:rgba(255,255,255,0.5);width:28px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
    '.mgp-bind-label.mgp-bind-label-wide{width:50px}',
    '.mgp-bind-btn{flex:1;padding:12px 14px;min-height:44px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);font-size:14px;font-weight:600;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;cursor:pointer;transition:background 0.15s,border-color 0.15s;touch-action:manipulation;-webkit-tap-highlight-color:rgba(100,180,255,0.15)}',
    '.mgp-bind-btn:active{background:rgba(52,120,246,0.15);border-color:rgba(52,120,246,0.3)}',
    '.mgp-cursor-dot{position:fixed;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:2px solid rgba(255,255,255,0.6);background:rgba(255,255,255,0.08);pointer-events:none;z-index:2147483644;transition:opacity 0.15s;box-shadow:0 0 8px rgba(0,0,0,0.3)}',
    '.mgp-cursor-dot.mgp-dragging{background:rgba(100,180,255,0.2);border-color:rgba(100,180,255,0.7)}',
    '.mgp-kbd-btn{position:absolute;bottom:70px;right:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 6px rgba(0,0,0,0.12);transition:background 0.15s,border-color 0.15s;z-index:2147483647}',
    '.mgp-kbd-btn:active{background:rgba(100,180,255,0.15);border-color:rgba(100,180,255,0.3)}',
    '.mgp-kbd-btn svg{width:16px;height:16px;fill:none;stroke:rgba(255,255,255,0.45);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
    '.mgp-hidden-input{position:fixed;top:-100px;left:-100px;opacity:0;width:1px;height:1px;border:none;outline:none;pointer-events:none}',
    '.mgp-version{position:absolute;top:8px;right:12px;font-size:9px;color:rgba(255,255,255,0.15);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;pointer-events:none}',
    '@keyframes mgp-fadein{from{opacity:0}to{opacity:1}}',
    '.mgp-overlay{animation:mgp-fadein 0.3s ease}',
    '@supports(padding:env(safe-area-inset-bottom)){.mgp-joystick-zone{bottom:calc(12px + env(safe-area-inset-bottom))}.mgp-dpad-zone{bottom:calc(12px + env(safe-area-inset-bottom))}.mgp-actions{bottom:calc(16px + env(safe-area-inset-bottom))}}',
    '@media(orientation:landscape){.mgp-joystick-zone{bottom:8px;left:8px}.mgp-dpad-zone{bottom:8px;left:8px}.mgp-actions{bottom:12px;right:12px}}',
    '.mgp-reset-btn{display:block;width:100%;padding:16px;min-height:48px;margin-top:8px;border-radius:10px;background:rgba(255,60,60,0.12);border:1px solid rgba(255,60,60,0.2);color:rgba(255,100,100,0.85);font-size:13px;font-weight:600;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;cursor:pointer;transition:background 0.15s;touch-action:manipulation}',
    '.mgp-reset-btn:active{background:rgba(255,60,60,0.25)}',
    '.mgp-divider{height:1px;background:rgba(255,255,255,0.06);margin:8px 0}',
    '.mgp-scheme-hint{font-size:11px;color:rgba(255,255,255,0.3);padding:4px 0 0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}'
  ].join('\n');

  function injectCSS() {
    var existing = document.getElementById('mgp-styles');
    if (existing) existing.parentNode.removeChild(existing);
    var s = document.createElement('style');
    s.id = 'mgp-styles';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  var ICONS = {
    gear: '<svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    keyboard: '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>',
    arrowDown: '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
    expand: '<svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
    compress: '<svg viewBox="0 0 24 24"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>'
  };

  M.store = store;
  M.load = load;
  M.defaults = defaults;
  M.state = state;
  M.saveState = saveState;
  M.MOVEMENT_SCHEMES = MOVEMENT_SCHEMES;
  M.getMovementKeys = getMovementKeys;
  M.KEY_DB = KEY_DB;
  M.BINDABLE_KEYS = BINDABLE_KEYS;
  M.keyLabel = keyLabel;
  M.pressedKeys = pressedKeys;
  M.fireKey = fireKey;
  M.releaseAllKeys = releaseAllKeys;
  M.haptic = haptic;
  M.clamp = clamp;
  M.dist = dist;
  M.el = el;
  M.injectCSS = injectCSS;
  M.ICONS = ICONS;
  M.padButton = padButton;
  M.padAxis = padAxis;
  M.padReset = padReset;
  M.ensurePadConnected = ensurePadConnected;

})();
