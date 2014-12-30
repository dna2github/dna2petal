/*
 * @auther: Seven Lju
 * @date:   2014-12-22
 * PetalInteraction
 *   callback : mouse event callback, e.g.
 *     {mousemove: function (target, positions, extra) { ... }}
 *      mosueevent = click, dblclick, comboclick,
 *                   mousemove, mousedown, mouseup,
 *                   mousehold, mouseframe, mousegesture
 *      positions = [x, y] or [x, y, t] or [[x1, y1], [x2, y2], ...] or
 *                  [[x1, y1, t1], [x2, y2, t2], ...] or
 *                  [[[x1, y1, t1], [x2, y2, t2], ...],
                     [[x1, y1, t1], ...], ...]
 *
 * PetalMobileInteraction
 */
function PetalInteraction(callback) {

  var config = {
    axis: {
      x: 'clientX',
      y: 'clientY'
    },
    hold: { /* hold cursor in a place for some time */
      enable: true,
      last: 1000        /* ms */,
      tolerance: 5      /* px */
    },
    combo: { /* click for N times (N > 2) */
      enable: true,
      holdable: false   /* hold for seconds and combo */,
      timingable: false /* count time for combo interval */,
      tolerance: -1     /* px, combo click (x,y) diff */,
      timeout: 200      /* ms, timeout to reset counting */
    },
    frame: { /* drag-n-drop to select an area of frame (rectangle) */
      enable: true,
      minArea: 50       /* px, the minimum area that a frame will be */,
      moving: false     /* true: monitor mouse move,
                                 if (x,y) changes then triggered;
                           false:
                                 if mouse up by distance then triggered*/
    },
    gesture: { /* customized gesture recorder */
      enable: false,
      mode: 'relative'  /* absolute / relative */,
      timeout: 500      /* ms, timeout to complete gesture */,
      absolute: {
        resolution: 20  /* px, split into N*N boxes */
      },
      relative: {
        resolution: 20  /* px, mark new point over N px */
      }
    }
  };

  var target = null;
  var state = {}, lock = {};
  interaction_init();
  if (!callback) callback = {};

  function interaction_init() {
    state.hold = null;
    state.combo = null;
    state.gesture = null;
    state.frame = null;

    if (lock.checkHold !== null) clearTimeout(lock.checkHold);
    if (lock.checkCombo !== null) clearTimeout(lock.checkCombo);
    lock.holdBeatCombo = false;
    lock.mouseDown = false;
    lock.checkHold = null;
    lock.checkCombo = null;
    lock.checkGesture = null;
  }

  function clone_mouse_event(e) {
    var result = {
      type: e.type,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      button: e.which || e.button
    };
    result[config.axis.x] = e[config.axis.x];
    result[config.axis.y] = e[config.axis.y];
    return result;
  }

  function check_distance(x0, y0, x, y, d) {
    if (d < 0) return false;
    var dx = x - x0, dy = y - y0;
    return Math.sqrt(dx*dx+dy*dy) > d;
  }

  function check_combo() {
    switch (state.combo.count) {
    case 0: // move out and then in
      break;
    case 1: // click
      if (callback.click) callback.click(target, state.combo.positons[0]);
      break;
    case 2: // double click
      if (callback.dblclick) callback.dblclick(target, state.combo.positions);
      break;
    default: // combo click
      if (callback.comboclick) callback.comboclick(target, state.combo.positions);
    }
    lock.holdBeatCombo = false;
    lock.checkCombo = null;
    state.combo = null;
  }

  function check_hold() {
    if (lock.mouseDown) {
      if (callback.mousehold) callback.mousehold(target, [state.hold.x, state.hold.y]);
      if (!config.combo.holdable) lock.holdBeatCombo = true;
    }
    lock.checkHold = null;
    state.hold = null;
  }

  function check_gesture() {
    var fullpath = state.gesture.fullpath;
    if (fullpath.length) {
      if (fullpath.length > 1 || fullpath[0].length > 1) {
        if (callback.mousegesture) callback.mousegesture(target, fullpath);
      }
    }
    fullpath = null;
    lock.checkGesture = null;
    state.gesture = null;
  }

  function do_combo_down(x, y) {
    if (!lock.mouseDown) return;
    if (lock.checkCombo !== null) clearTimeout(lock.checkCombo);
    if (!state.combo) state.combo = {count: 0, positions: []};
    state.combo.x = x;
    state.combo.y = y;
    state.combo.timestamp = new Date().getTime();
    state.combo.count ++;
  }

  function do_combo_up(x, y) {
    if (!state.combo) return;
    var pos = [x, y];
    if (config.combo.timingable) {
      pos[2] = new Date().getTime() - state.combo.timestamp;
    }
    state.combo.positions.push(pos);
    if (config.combo.tolerance >= 0) {
      if (check_distance(state.combo.x, state.combo.y,
                         x, y, config.combo.tolerance)) {
        // mouse moved
        check_combo();
        return;
      }
    }
    if (!config.combo.holdable) {
      if (lock.holdBeatCombo) {
        // mouse hold
        check_combo();
        return;
      }
    }
    lock.checkCombo = setTimeout(check_combo, config.combo.timeout);
  }

  function do_hold(x, y, checkMoved) {
    // if mouse not down, skip
    if (!lock.mouseDown) return;
    if (checkMoved !== true) checkMoved = false;
    if (checkMoved && state.hold) {
      // if move a distance and stop to hold
      if (!check_distance(state.hold.x, state.hold.y,
                          x, y, config.hold.tolerance)) {
        return;
      }
    }
    // recount time
    if (lock.checkHold !== null) clearTimeout(lock.checkHold);
    if (!state.hold) state.hold = {};
    state.hold.x = x;
    state.hold.y = y;
    lock.checkHold = setTimeout(check_hold, config.hold.last);
  }

  function do_frame_down(x, y) {
    if (!state.frame) state.frame = {};
    state.frame.start = true;
    state.frame.x = x;
    state.frame.y = y;
  }

  function do_frame(x, y) {
    if (!state.frame.start) return;
    var dx, dy;
    dx = x - state.frame.x;
    dy = y - state.frame.y;
    if (Math.abs(dx*dy) >= config.frame.minArea) {
      if (callback.mouseframe) {
        callback.mouseframe(
          target,
          [ [state.frame.x, state.frame.y], [x, y] ]
        );
      }
    }
  }

  function do_frame_up(x, y) {
    do_frame(x, y);
    state.frame = null;
  }

  function do_gesture_start(x, y) {
    if (lock.checkGesture !== null) clearTimeout(lock.checkGesture);
    if (!state.gesture) state.gesture = {};
    if (!state.gesture.fullpath) state.gesture.fullpath = [];
    state.gesture.timestamp = new Date().getTime();
    state.gesture.positions = [];
    state.gesture.x = x;
    state.gesture.y = y;
  }

  var _act_gesture_move_map_mode = {
    absolute: do_gesture_absolute,
    relative: do_gesture_relative
  };
  function do_gesture_move(x, y) {
    if (!lock.mouseDown) return;
    var point = _act_gesture_move_map_mode[config.gesture.mode](x, y);
    var timestamp = new Date().getTime();
    if (!point) return;
    state.gesture.positions.push([
      point[0], point[1],
      timestamp - state.gesture.timestamp
    ]);
    state.gesture.x = point[0];
    state.gesture.y = point[1];
    state.gesture.timestamp = timestamp;
    point = null;
  }

  function do_gesture_absolute(x, y) {
    var resolution = config.gesture.absolute.resolution;
    if (resolution < 1) resolution = 1;
    if (Math.floor(x / resolution) === Math.floor(state.x /resolution) &&
        Math.floor(y / resolution) === Math.floor(state.y /resolution)) {
      return null;
    }
    return [x, y];
  }

  function do_gesture_relative(x, y) {
    if (!check_distance(state.gesture.x, state.gesture.y, x, y,
                        config.gesture.relative.resolution)) return null;
    return [x, y];
  }

  function do_gesture_break(x, y) {
    var timestamp = new Date().getTime();
    state.gesture.positions.push([
      state.gesture.x, state.gesture.y,
      timestamp - state.gesture.timestamp
    ]);
    state.gesture.fullpath.push(state.gesture.positions);
    state.gesture.positions = [];
    state.gesture.timestamp = timestamp;
    lock.checkGesture = setTimeout(check_gesture, config.gesture.timeout);
  }

  function event_mousedown(e) {
    var x = e[config.axis.x], y = e[config.axis.y];
    lock.mouseDown = true;
    if (config.hold.enable) do_hold(x, y, false);
    if (config.combo.enable) do_combo_down(x, y);
    if (config.frame.enable) do_frame_down(x, y);
    if (config.gesture.enable) do_gesture_start(x, y);
    if (callback.mousedown) callback.mousedown(target, [x, y], clone_mouse_event(e));
  }

  function event_mousemove(e) {
    var x = e[config.axis.x], y = e[config.axis.y];
    if (config.hold.enable) do_hold(x, y, true);
    if (config.frame.enable && config.frame.moving) do_frame(x, y);
    if (config.gesture.enable) do_gesture_move(x, y);
    if (callback.mousemove) callback.mousemove(target, [x, y], clone_mouse_event(e));
  }

  function event_mouseup(e) {
    var x = e[config.axis.x], y = e[config.axis.y];
    lock.mouseDown = false;
    if (config.combo.enable) do_combo_up(x, y);
    if (config.frame.enable) do_frame_up(x, y);
    if (config.gesture.enable) do_gesture_break(x, y);
    state.hold = null;
    if (callback.mouseup) callback.mouseup(target, [x, y], clone_mouse_event(e));
  }

  function event_mouseout(e) {
    var x = e[config.axis.x], y = e[config.axis.y];
    if (lock.mouseDown) {
      if (lock.checkHold !== null) clearTimeout(lock.checkHold);
      if (lock.checkCombo !== null) clearTimeout(lock.checkCombo);
      if (config.combo.enable && state.combo) {
        check_combo();
      }
      state.hold = null;
      state.combo = null;
      lock.mouseDown = false;
    }
    if (callback.mouseout) callback.mouseout(target, [x, y], clone_mouse_event(e));
  }

  function event_mouseenter(e) {
    var x = e[config.axis.x], y = e[config.axis.y];
    var button = e.which || e.button;
    if (button > 0) {
      lock.mouseDown = true;
      if (config.hold.enable) do_hold(x, y, false);
      if (config.combo.enable) state.combo = {count: 0, positions: []};
    }
    if (callback.mouseenter) callback.mouseenter(target, [x, y], clone_mouse_event(e));
  }

  return {
    config: function () {
      return config;
    },
    bind: function (element) {
      target = element;
      interaction_init();
      element.addEventListener('mousedown', event_mousedown);
      element.addEventListener('mousemove', event_mousemove);
      element.addEventListener('mouseup', event_mouseup);
      element.addEventListener('mouseout', event_mouseout);
      element.addEventListener('mouseenter', event_mouseenter);
    },
    unbind: function () {
      target.removeEventListener('mousedown', event_mousedown);
      target.removeEventListener('mousemove', event_mousemove);
      target.removeEventListener('mouseup', event_mouseup);
      target.removeEventListener('mouseout', event_mouseout);
      target.removeEventListener('mouseenter', event_mouseenter);
      interaction_init();
      target = null;
    }
  };
}

function PetalMobileInteraction() {

  var target = null;

  var _event_touch_map_mouse = {
    touchstart: 'mousedown',
    touchmove:  'mousemove',
    touchend:   'mouseup'
  };
  function event_touch_to_mouse(e) {
    e.preventDefault();
    var touches = e.changedTouches;
    if (touches.length > 1) {
      // TODO: pinch action
      return;
    }
    var touch = touches[0];
    var type = _event_touch_map_mouse[e.type];
    var f = document.createEvent("MouseEvents");
    f.initMouseEvent(type, true, true,
                     target.ownerDocument.defaultView, 0,
                     touch.screenX, touch.screenY,
                     touch.clientX, touch.clientY,
                     e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
                     0, null);
    target.dispatchEvent(f);
  }

  return {
    bind: function (element) {
      target = element;
      element.addEventListener('touchstart', event_touch_to_mouse);
      element.addEventListener('touchmove', event_touch_to_mouse);
      element.addEventListener('touchend', event_touch_to_mouse);
    },
    unbind: function () {
      target.removeEventListener('touchstart', event_touch_to_mouse);
      target.removeEventListener('touchmove', event_touch_to_mouse);
      target.removeEventListener('touchend', event_touch_to_mouse);
      target = null;
    }
  };
}
