var $petal;
if($petal == null) $petal = {};

(function($petal, $win, $doc) {

var loadedJS = []; // {name, act}

function _indexOf(array, key, val) {
   if(val == null) {
      val = key; key = null;
   }
   if(key == null) {
      return array.indexOf(val);
   }
   var m,i,n = array.length; for(i=0;i<n;i++) {
      m = array[i];
      if(m instanceof Object) {
         if(m[key] == val) return i;
      }
   }
   return -1;
}

function route() {
   var $r = $petal.router;
   var url, query;
   var re,m,arg,i,n=$r.paterns.length;
   url = $win.location.hash;
   query = null;
   i = url.indexOf('?');
   if(i>=0) {
      query = url.substring(i+1);
      url = url.substring(0,i);
   }
   for(i=0;i<n;i++) {
      m = $r.paterns[i];
      re = new RegExp(m.patern);
      arg = re.exec(url);
      if(arg == null) continue;
      arg.push(query);
      $r.loadjses(m.js, function() {
         if(m.init) m.init.apply($petal.router, arg);
      });
      return;
   }

   // TODO: handle no match
}

function PetalRouter() {
   this.paterns = []; // {patern, js, init}
}
PetalRouter.prototype.loadjs = function(js, callback, force) {
   if(force == null) force = false;
   var m,index = _indexOf(loadedJS, 'name', js);
   if(index<0) {
      m = {}; m.name = js;
      m.act = $doc.createElement('script');
      m.act.type = 'text/javascript';
      m.act.src = js;
      loadedJS.push(m);
      m.act.onload = function() {
         m.act.onload = null;
         if(callback) callback();
      };
      $doc.body.appendChild(m.act);
   } else if(force) {
      this.unloadjs(js);
      this.loadjs(js);
   }
};
PetalRouter.prototype.unloadjs = function(js, clean) {
   var m,index = _indexOf(loadedJS, 'name', js);
   if(index<0) return;
   m = loadedJS[index];
   $doc.body.removeChild(m.act);
   if(clean) clean(js);
};
PetalRouter.prototype.loadjses = function(js, callback, force) {
   if(js == null) {
      if(callback) callback();
      return;
   }
   var i=0,n=js.length,nextjs=js[i];
   var self = this;
   function seq() {
      if(nextjs == null || i>=n) {
         if(callback) callback();
      } else {
         self.loadjs(nextjs, seq, force);
         nextjs = js[++i];
      }
   }
   seq();
}
PetalRouter.prototype.ruleIn = function(name, patern, js, init) {
   this.paterns.push({
      name   : name,
      patern : patern,
      js     : js,
      init   : init
   });
};
PetalRouter.prototype.ruleOut = function(name) {
   var i,n=this.paterns.length; for(i=0;i<n;i++) {
      if(name === this.paterns[i].name) {
         this.paterns.splice(i, 1);
         --i; --n;
      }
   }
};
PetalRouter.prototype.refresh = route;

$petal.router = new PetalRouter();

})($petal, window, document); // Module $odphouse.router

