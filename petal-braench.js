/**
  @author: Seven Lju
  @date: 2015-09-20

  a generator for visulizing graph with <div>.
  for canvas and svg, it is hard to manipulate and take much time on
  calculating layout. a simple and clean visualization can be fit for
  desktop and mobile browser.

  A -> B, A -> C
  --------------
  | A          |
  | ---------- |
  | | B      | |
  | ---------- |
  | ---------- |
  | | C      | |
  | ---------- |
  --------------
 */
'use strict;'

function $braench(config) {

  /*
   config {
     maxNested: if exceeds, will display outside the boxes. (should not be 1)
     graph: [
       [id, to_list]
     ]
     callback {
       dom: function (node: {index, id, toList, children, graph, flatGraph}) return dom(default=div)
     }
   }
   */

  if (!config) config = {};
  if (!config.callback) config.callback = {};
  if (!config.maxNested) config.maxNested = 0;

  if (!config.graph) config.graph = [];

  var cache_flat_graph = null;

  var exports = {
    config: function () {
      return config;
    },
    graph: function () {
      return config.graph;
    },
    generate: function () {
      cache_flat_graph = _generate_flat_graph(config.graph);
      return exports;
    },
    divtree: function () {
      return _generate_div_tree(config.graph, cache_flat_graph);
    }
  };

  return exports;

  function _generate_flat_graph (graph) {
    if (!graph.length) return [];

    var result = [], visited = [];
    var n = graph.length, i;
    for (i=0; i<n; i++) {
      visited[i] = false;
    }

    while (_once_with_start_node());
    return result;

    function _once_with_start_node() {
      var queue = [];
      var n = graph.length, i;
      for (i=0; i<n; i++) {
        if (!visited[i]) break;
      }
      if (i >= n) return false;
      visited[i] = true;

      var queue = [ [i, result, 1] ];
      while (queue.length > 0) {
        var node_parent_deep = queue.shift();
        var node   = node_parent_deep[0],
            parent = node_parent_deep[1],
            deep   = node_parent_deep[2];
        var id = graph[node][0], to_list = graph[node][1];

        var current = [node];
        current._braench_type = 'tree';
        if (to_list.length == 0 || config.maxNested <= 1 || deep < config.maxNested) {
          parent.push(current);
        } else {
          // to avoid too many <div> nested
          parent.push(node);
          result.push(current);
          deep = 1;
        }

        if (!to_list.length) continue;

        for (var m=to_list.length, j=0, k=0; j<m; j++) {
          k = to_list[j];
          if (visited[k]) {
            current.push(k);
          } else {
            visited[k] = true;
            queue.push([k, current, deep+1]);
          }
        }
      }
      return true;
    }
  }

  function _generate_div_tree(graph, flat_graph) {
    // @include document
    if (!graph.length) return null;
    if (!flat_graph) return null;

    var div = document.createElement('div');
    for (var n=flat_graph.length, i=0; i<n; i++) {
      div.appendChild(_once_with_node(flat_graph[i]));
    }
    return div;

    function _once_with_node(node) {
      var index, cur, children;
      if (node._braench_type === 'tree') {
        index = node[0];
        cur = graph[index];
        children = node.slice(1);
      } else {
        index = node;
        cur = graph[index];
        children = [];
      }
      var div = (config.callback.dom || _create_dom)({
        index: index,
        id: cur[0],
        toList: cur[1],
        children: children,
        graph: graph,
        flatGraph: flat_graph
      });
      for (var n=children.length, i=0; i<n; i++) {
        div.appendChild(_once_with_node(children[i]));
      }
      return div;
    }

    function _create_dom(node) {
      var div = document.createElement('div');
      div.style.border = 'solid 1px black';
      div.style.margin = '8px';
      div.appendChild(document.createTextNode('graph-node-' + node.id));
      return div;
    }
  }

  function _nop () {}
}

/*
  e.g.:
        -------\
       /        v
      |     --> B ----
      |    /          \
      |   /            v
      |  A --> C ----> E ----
      |  |^             \    \
      |   \\---- D -\    v   |
      |    \     ^   --> F   |
      |     \    |       ^   |
       \     --> G -----/    /
        \       /^          /
         ------/  \---------

    var demo = $braench({
      graph: [
        ['A', [1,2,6]], // A->B,C,G
        ['B', [4]],     // B->E
        ['C', [4]],     // C->E
        ['D', [0,5]],   // D->A,F
        ['E', [5,6]],   // E->F,G
        ['F', []],
        ['G', [1,3,5]]  // G->B,D,F
      ],
      maxNested: 3
    });
    document.body.appendChild(demo.generate().divtree());
 */
