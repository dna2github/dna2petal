/*
 * @auther: Seven Lju
 * @date:   2014-12-21
 * Petal Module
 */
function PetalModule() {
  var modules = [];
  var env = {};

  function _noop() {
  }

  function _indexOf(list, key, value) {
    if (!key) {
      return list.indexOf(value);
    }
    var i, n;
    n = list.length;
    for (i = 0; i < n; i++) {
      if (list[i][key] === value) {
        return i;
      }
    }
    return -1;
  }

  function module_unload (name, callback) {
    if (!modules) return false;
    var index = _indexOf(modules, 'name', name);
    if (index < 0) return false;
    var obj = modules.splice(index, 1)[0];
    (obj.$exit || _noop)(name, env);
    document.body.removeChild(obj.$script);
    obj.$script = null;
    obj.$exit = null;
    obj.$init = null;
    obj = null;
    (callback || _noop)(name, env);
    return true;
  }

  function module_load (name, force, callback) {
    var that = this;
    if (force !== true) force = false;
    if (!modules) modules = [];
    var index = _indexOf(modules, 'name', name);
    if (index >= 0) {
      if (!force) return false;
      if (!module_unload(name)) return false;
    }
    var obj = {
      name: name,
      $init: null,
      $exit: null,
      $script: document.createElement('script')
    };
    var onload = function (e) {
      try {
        obj.$init = module_init;
        module_init = null;
      } catch(e) {}
      try {
        obj.$exit = module_exit;
        module_exit = null;
      } catch(e) {}
      (obj.$init || _noop)(name, env);
      this.removeEventListener('load', onload);
      modules.push(obj);
      obj = null;
      (callback || _noop)(name, env);
    };
    obj.$script.type = 'text/javascript';
    obj.$script.src = name;
    obj.$script.addEventListener('load', onload);
    document.body.appendChild(obj.$script);
    return true;
  }

  return {
    env:    function () {
      return env;
    },
    load:   module_load,
    unload: module_unload
  };

}
