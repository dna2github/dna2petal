var $petal;
if($petal == null) $petal = {};

(function($petal, $win, $doc) {

var ajax = {
  _nop: function () {},
  resource: function (name, path, async) {
    if (async !== true) async = false;
    return $.ajax({
      url: path,
      method: 'GET',
      async: async
    });
  }
};

var component = {
  designView: false,
  cache: {},
  load: function (name, path, async) {
    if (component.cache[name]) return null;
    return ajax.resource(name, path, async).done(function (html) {
      component.cache[name] = html;
    });
  },
  _appendDom: function (dom, elements, templates) {
    var id = $(dom).attr('tag');
    if (!id) {
      component._searchDom(dom, elements, templates);
      return;
    }
    switch (id.charCodeAt(0)) {
    case 93: // ']', array element
      id = id.substring(1);
      if (!$.isArray(elements[id])) elements[id] = [];
      elements[id].push(dom);
      component._searchDom(dom, elements, templates);
      break;
    case 43: // '+', template
      id = id.substring(1);
      if (!component.designView) {
        $(dom).removeAttr('tag');
        templates[id] = $(dom).prop('outerHTML');
        $(dom).remove();
        break;
      }
      // if in design view, we can see the template as a dom
      // in browser; thus here should not have a break
    default:
      elements[id] = dom;
      component._searchDom(dom, elements, templates);
    }
  },
  _searchDom: function (dom, elements, templates) {
    var ch = $(dom).children();
    var n = ch.length;
    if (n <= 0) return;
    var i;
    for (i=0; i<n; i++) {
      component._appendDom(ch[i], elements, templates);
    }
  },
  /* e.g.
    partial.html
      <div>
        Name: <input tag="txt_name" type="text" /><br />
        <table>
          <thead><th>A</th><th>B</th></thead>
          <tbody tag="items">
            <tr tag="+item">
              <td tag="txt_a">loading...</td>
              <td tag="txt_b">loading...</td>
            </tr>
          </tbody>
        </table>
        <hr />
        <a tag="]link">X</a><a tag="]link">Y</a><a tag="]link">Z</a>
      </div>

    index.js
      $petal.ui.load('partial', 'partial.html', false);
      var control = {};
      $petal.ui.create(control, 'partial');
      $(control.dom.txt_name).val("hello world");
      $(control.dom.link[0]).click(function () { alert("0"); });
      $(control.dom.link[1]).click(function () { alert("1"); });
      $(control.dom.link[2]).click(function () { alert("2"); });
      var item = {};
      $petal.ui.createT(item, control.template.item);
      $(item.dom.txt_a).text("hello");
      $(item.dom.txt_b).text("world");
      $(contorl.dom.items).append(item.self);
      $(document.body).append(control.self);
  */
  createT: function (control, template) {
    if (!template) return null;
    var elements = {}, templates = {};
    var dom = $(template);
    component._searchDom(dom, elements, templates);
    control.self = dom;
    control.dom = elements;
    control.template = templates;
    return control;
  },
  create: function (control, name) {
    return component.createT(control, component.cache[name]);
  },
  empty: function (id) {
    var i, n, ch;
    ch = component.dom(id).children();
    n = ch.length;
    for (i=0; i<n; i++) {
      $(ch[i]).detach();
    }
  },
  view: function (id, control) {
    component.empty(id);
    component.dom(id).append(control.self);
  },
  dom: function (id) {
    return $('#' + id);
  }
};

$petal.ui = component;

})($petal, window, document); // Module $odphouse.router

