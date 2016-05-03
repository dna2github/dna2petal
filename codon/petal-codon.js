/**
 @author: Seven Lju
 @date: 2016-04-29
 */
'use strict';

(function (window, document) {

function pointLookAt(sx, sy, tx, ty) {
  var dxgt0 = (tx - sx > 0),
      dygt0 = (ty - sy >= 0);
  if (tx - sx == 0) {
    if (dygt0) return Math.PI / 2;
    return -Math.PI / 2;
  }
  var alpha = Math.atan((ty - sy) / (tx - sx));
  if (!dxgt0 && dygt0) alpha += Math.PI;
  else if (!dxgt0 && !dygt0) alpha -= Math.PI;
  return alpha;
}

function pointSidePoint(sx, sy, alpha, direction, length) {
  var cosa = Math.cos(alpha + direction),
      sina = Math.sin(alpha + direction);
  return [sx + length * cosa, sy + length * sina];
}

function pointDistance(sx, sy, tx, ty) {
  var dx = tx - sx, dy = ty - sy;
  return Math.sqrt(dx * dx + dy * dy);
}

function rectNodeCenter(rect) {
  return [rect[0] + rect[2]/2.0, rect[1] + rect[3]/2.0];
}

const CODE_NODE = 0, CODE_LINK = 1;

/*
  obj = {name, view, parent_view, code, extra}
  view = [x, y, w, h]
  code = 0: node, 1: link
 */
var size = [0, 0],
    view = [0, 0, 1, 1],
    zoom = 1.0,
    translate = [0, 0],
    pen = null,
    all_objs = [],
    visible_objs = [];

function codonPaper(canvas) {
  // initialize for canvas
  pen = canvas.getContext('2d');
  size[0] = canvas.clientWidth;
  size[1] = canvas.clientHeight;
  view[2] = size[0];
  view[3] = size[1];
  return this;
}

function codonZoom(scale) {
  if (!scale) {
    zoom = 1.0;
  } else {
    zoom *= scale;
  }
  view[0] = view[0] + size[0] * (1 - zoom) / 2.0;
  view[1] = view[1] + size[1] * (1 - zoom) / 2.0;
  view[2] = size[0] * zoom;
  view[3] = size[1] * zoom;
  return this;
}

function codonTranslate(dx, dy) {
  if (dx === undefined || dy === undefined) {
    view[0] = view[1] = 0.0;
    tranlsate[0] = translate[1] = 0.0;
    return;
  }
  view[0] += dx;
  view[1] += dy;
  translate[0] += dx;
  translate[1] += dy;
  return this;
}

function codonRectViewHits(view, objview) {
  // check rect intersects
  if (view[0] > objview[0] + objview[2]) return false;
  if (view[0] + view[2] < objview[0]) return false;
  if (view[1] > objview[1] + objview[3]) return false;
  if (view[1] + view[3] < objview[1]) return false;
  return true;
}

function codonObjs(objs) {
  all_objs = [];
  for (var n = objs.length, i = 0; i < n; i++) {
    all_objs.push(objs[i]);
  }
  return this;
}

function codonObjsRef(objs) {
  all_objs = objs;
  return this;
}

function codonGetNodeRef(index) {
  return all_objs[index];
}

function codonGetVisibleNodeRef(index) {
  return visible_objs[index];
}

function codonVisibleObjs() {
  var cur, p1, p2;
  visible_objs = [];
  for (var n = all_objs.length, i = 0; i < n; i++) {
    cur = all_objs[i];
    if (cur.code === CODE_LINK) {
      // recalc link rect
      p1 = rectNodeCenter(cur.extra[1].view);
      p2 = rectNodeCenter(cur.extra[2].view);
      cur.view = [p1[0], p1[1], p2[0] - p1[0], p2[1] - p1[1]];
      if (cur.view[2] < 0) {
        cur.view[0] += cur.view[2];
        cur.view[2] = -cur.view[2];
      }
      if (cur.view[3] < 0) {
        cur.view[1] += cur.view[3];
        cur.view[3] = -cur.view[3];
      }
    }
    if (codonRectViewHits(view, cur.view))
      visible_objs.push(cur);
  }
  return this;
}

// TODO paint order
function codonPaintOrder() {
  return this;
}

function _moveDueToParent(parent_obj) {
  if (!parent_obj.children) return;
  if (parent_obj._move_) {
    var n, i, cur, offset;
    offset = [
      parent_obj.view[0] - parent_obj._move_.origin_view[0],
      parent_obj.view[1] - parent_obj._move_.origin_view[1],
      parent_obj.view[2] - parent_obj._move_.origin_view[2],
      parent_obj.view[3] - parent_obj._move_.origin_view[3]
    ];
    for (n = parent_obj.children.length, i = 0; i < n; i++) {
      cur = parent_obj.children[i];
      if (!cur._move_) {
        cur._move_ = {};
        cur._move_.origin_view = [cur.view[0], cur.view[1], cur.view[2], cur.view[3]];
        cur.view[0] += offset[0] + offset[2] / 2.0;
        cur.view[1] += offset[1] + offset[3] / 2.0;
        cur._move_.target_view = [cur.view[0], cur.view[1], cur.view[2], cur.view[3]];
      }
    }
  }
  for (n = parent_obj.children.length, i = 0; i < n; i++) {
    cur = parent_obj.children[i];
    _moveDueToParent(cur);
  }
}

function _adjustLevel(parent_obj) {
  // fit parent size for children position changes
  if (!parent_obj.children) return;
  if (!parent_obj.view) return;
  var n, i, t, cur, area = null;
  for (n = parent_obj.children.length, i = 0; i < n; i++) {
    cur = parent_obj.children[i];
    if (area) {
      if (area[0] > cur.view[0]) area[0] = cur.view[0];
      if (area[1] > cur.view[1]) area[1] = cur.view[1];
      t = cur.view[0] + cur.view[2];
      if (area[2] < t) area[2] = t;
      t = cur.view[1] + cur.view[3];
      if (area[3] < t) area[3] = t;
    } else {
      area = [
        cur.view[0],
        cur.view[1],
        cur.view[0] + cur.view[2],
        cur.view[1] + cur.view[3]
      ];
    }
  }
  var padding = [20, 20, 20, 20];
  parent_obj.view = [
    area[0] - padding[0],
    area[1] - padding[1],
    area[2] - area[0] + padding[0] + padding[2],
    area[3] - area[1] + padding[1] + padding[3]
  ];
}

function _rearrangeLevel(objs, base_obj) {
  var n,
      i,
      complete = [base_obj],
      cross = [],
      cur;
  for (n = objs.length, i = 0; i < n; i++) {
    cur = objs[i];
    if (cur === base_obj) continue;
    if (!codonRectViewHits(base_obj.view, cur.view)) continue;
    cross.push(cur);
  }
  var low,
      high,
      expand_search = true,
      reduce_max_times,
      cur_center,
      cur_try_view,
      base_center = rectNodeCenter(base_obj.view);
  while (cross.length) {
    cur = cross.pop();
    cur_center = rectNodeCenter(cur.view);
    cur_try_view = cur.view;
    // find available place for maximum move
    low = 1.0;
    high = 1.0;
    reduce_max_times = 0;
    do {
      for (n = complete.length, i = 0; i < n; i++) {
        if (codonRectViewHits(cur_try_view, complete[i].view)) break;
      }
      if (n <= i) { // some intersects
        expand_search = false;
        break;
      }
      cur_try_view = [
        base_center[0] + (cur_center[0] - base_center[0]) * 2 - cur.view[2] / 2.0,
        base_center[1] + (cur_center[1] - base_center[1]) * 2 - cur.view[3] / 2.0,
        cur.view[2], cur.view[3]
      ];
      cur_center = rectNodeCenter(cur_try_view);
      low = high;
      high *= 2.0;
      reduce_max_times = Math.floor(
        pointDistance(
          cur_center[0],
          cur_center[1],
          base_center[0],
          base_center[1]
        ) / pointDistance(0, 0, cur_try_view[2], cur_try_view[3]) / 2.0
      ) + 2;
    } while (expand_search);
    // find available place for nearer move
    if (low > 1) low /= 2.0;
    while (reduce_max_times > 0) {
      // cur_center should not changed for this loop
      cur_try_view = [
        base_center[0] + (cur_center[0] - base_center[0]) * (low + high) / 2.0 - cur.view[2] / 2.0,
        base_center[1] + (cur_center[1] - base_center[1]) * (low + high) / 2.0 - cur.view[3] / 2.0,
        cur.view[2], cur.view[3]
      ]
      for (n = complete.length, i = 0; i < n; i++) {
        if (codonRectViewHits(cur_try_view, complete[i].view)) break;
      }
      if (n > i) {
        low = (low + high) / 2.0;
      } else {
        high = (low + high) / 2.0;
        reduce_max_times --;
        if (!reduce_max_times) {
          cur_try_view = [
            base_center[0] + (cur_center[0] - base_center[0]) * low - cur.view[2] / 2.0,
            base_center[1] + (cur_center[1] - base_center[1]) * low - cur.view[3] / 2.0,
            cur.view[2], cur.view[3]
          ]
        }
      }
    }
    if (!cur._move_) {
      cur._move_ = {};
      cur._move_.origin_view = [cur.view[0], cur.view[1], cur.view[2], cur.view[3]];
    }
    cur.view = cur_try_view;
    cur._move_.target_view = [cur.view[0], cur.view[1], cur.view[2], cur.view[3]];
  }
}

function codonNodeMove(node, x, y) {
  var root = {parent:null, children:[]},
      n,
      i,
      cur;
  for (n = all_objs.length, i = 0; i < n; i++) {
    cur = all_objs[i];
    if (!cur.parent && cur.code === CODE_NODE) {
      root.children.push(cur);
    }
  }

  node._move_ = {};
  node._move_.origin_view = [node.view[0], node.view[1], node.view[2], node.view[3]];
  node.view[0] = x;
  node.view[1] = y;
  node._move_.target_view = [node.view[0], node.view[1], node.view[2], node.view[3]];
  var parent;
  parent = node.parent || root;
  cur = node;
  while (parent) {
    _rearrangeLevel(parent.children, cur);
    _adjustLevel(parent);
    cur = parent;
    parent = parent.parent;
    if (cur !== root && !parent) parent = root;
  }

  for (n = root.children.length, i = 0; i < n; i++) {
    _moveDueToParent(root.children[i]);
  }
  // then need codonVisibleObjs()
  //           codonRepaint()
  return this;
}

function _drawNode(obj) {
  pen.fillStyle = '#ddd';
  pen.fillRect(obj.view[0], obj.view[1], obj.view[2], obj.view[3]);
  pen.strokeStyle = '#777';
  pen.strokeRect(obj.view[0], obj.view[1], obj.view[2], obj.view[3]);
  // draw text
  if (obj.name) {
    pen.font = '12px calibri';
    pen.fillStyle = 'black';
    pen.textAlign = 'center';
    // var metrics = context.measureText(string);
    pen.fillText(obj.name, obj.view[0] + obj.view[2] / 2.0, obj.view[1] + obj.view[3] + 12);
  }
}

function _drawLink(obj) {
  var dflag = obj.extra[0],
      p1 = rectNodeCenter(obj.extra[1].view),
      p2 = rectNodeCenter(obj.extra[2].view),
      pc = [(p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0];
  if (dflag & 0x2) {
    pen.strokeStyle = '#000';
  } else {
    pen.strokeStyle = '#ccc';
  }
  pen.beginPath();
    pen.moveTo(p1[0], p1[1]);
    pen.lineTo(pc[0], pc[1]);
  pen.stroke();
  if (dflag & 0x1) {
    pen.strokeStyle = '#000';
  } else {
    pen.strokeStyle = '#ccc';
  }
  pen.beginPath();
    pen.moveTo(pc[0], pc[1]);
    pen.lineTo(p2[0], p2[1]);
  pen.stroke();
  //pen.quadraticCurveTo(p2[0], p2[1], p3[0], p3[1]);
  //pen.bezierCurveTo(p2[0], p2[1], p3[0], p3[1], p4[0], p4[1]);
}

// window.requestAnimationFrame(codonRepaint)
function codonRepaint(frame) {
  var cur = null;
  pen.clearRect(0, 0, size[0], size[1]);
  for (var n = visible_objs.length, i = 0; i < n; i++) {
    cur = visible_objs[i];
    switch (cur.code) {
    case CODE_NODE:
      _drawNode(cur);
      break;
    case CODE_LINK:
      _drawLink(cur);
      break;
    }
  }
}

function codonAnimateMove(frames) {
  if (frames === undefined) frames = 10;
  var ifr = frames;
  window.requestAnimationFrame(_paint);
  function _paint(frame) {
    if (ifr < 0) {
      // post-process
      for (var n = all_objs.length, i = 0; i < n; i++) {
        cur = all_objs[i];
        if (cur._move_) {
          cur._move_ = null;
          delete cur._move_;
        }
      }
      codonVisibleObjs();
      codonRepaint();
      return;
    }
    var cur, tv, ov;
    for (var n = visible_objs.length, i = 0; i < n; i++) {
      cur = visible_objs[i];
      if (!cur._move_) continue;
      ov = cur._move_.origin_view;
      tv = cur._move_.target_view;
      cur.view[0] = tv[0] - (tv[0] - ov[0]) * (ifr / frames);
      cur.view[1] = tv[1] - (tv[1] - ov[1]) * (ifr / frames);
    }
    codonRepaint();
    ifr --;
    window.requestAnimationFrame(_paint);
  }
  return this;
}

window.$codon = {
  Paper: codonPaper,
  set: codonObjs,
  node: codonGetNodeRef,
  setRef: codonObjsRef,
  strip: codonVisibleObjs,
  order: codonPaintOrder,
  repaint: codonRepaint,
  move: codonNodeMove,
  zoom: codonZoom,
  translate: codonTranslate,
  cross: codonRectViewHits,
  moveAnimate: codonAnimateMove,
  debug: {
    link: _drawLink,
    node: _drawNode
  }
}

})(window, document);
