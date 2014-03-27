# petalJS

Version 0.0.1
A JavaScript framework for web development

## State Machine

`$petal.state.PetalMachine` A class to define workflow in a state machine.

- `register` Register a state named as `id` in the machine. When the state is activated from another one, `event_in` will be triggered; Going out of the state will make `event_out` take place; if `commit` is true, it means that once the state is activated, it should transfer to another state immediately. The whole process from State A to State B as below:

```js
/* A --> B */
remain = A.event_out(B, extraData);
result = B.event_in (A, extraData, remain);
```

- `unregister` Remove a state by `id`.
- `connect` Make a path from a state `from` to another one `to` with specified `condition`; if the inverse way is also available, `directed` should be false.
- `disconnect` Remove the path from a state `from` to another `to`; if remove the inverse way also, `directed` should be false.
- `initialize` `jump` Set current state to a specified one immediately.
- `transfer` Transfer current state to another one `id`. Extra `data` are passed through the process. If `checkcond` is false, it makes the current state transfer to another forcedly.
- `wander` Randomly select one state that current state can reach for (with condition satisfied) and transfer current state to that state.

Examples for how to use the state machine:

- Modal Dialog

```js
// include jQuery
// include $petal.state.PetalMachine

(function($petal, $win, $doc, $){
   /* common function  */
   function centeralize(act) {
      var scrw = $win.innerWidth,
          scrh = $win.innerHeight,
          scrtop = $win.scrollTop,
          scrleft = $win.scrollLeft,
          actw = $(act).innerWidth(),
          acth = $(act).innerHeight();
      if(!scrtop) scrtop = 0;
      if(!scrleft) scrleft = 0;
      act.style.position = 'absolute';
      act.style.top = Math.max(0, (scrh-acth)/2+scrtop) + 'px';
      act.style.left = Math.max(0, (scrw-actw)/2+scrleft) + 'px';
   }

   /* state machine */
   var $m = new $petal.state.PetalMachine();
   $m.register('active', function() {
      $doc.body.style.overflow = "auto";
      $m.ui.mask.style.display = "none";
   });
   $m.register('wait', function() {
      $doc.body.style.overflow = "hidden";
      $m.ui.mask.style.display = "block";
   });
   $m.connect('active', 'wait');
   $m.connect('wait', 'active');

   /* user interface */
   $m.ui = {
      mask  : $doc.createElement('div'),
      style : $doc.createElement('style')
   };
   $m.ui.style.innerHTML = ".global-modal-mask"
   +" { position: fixed; opacity: 0.5; z-index: 9000;"
   +"   top: 0; left: 0; width: 100%; height: 100%;"
   +"   background-color: white;}";
   $m.ui.mask.appendChild($m.ui.style);
   $m.ui.mask.className = 'global-modal-mask';

   function uiDialog() {
      this.dom = {};
   }
   uiDialog.prototype.init = function() {
      var div = $doc.createElement('div');
      div.style.zIndex = '9090';
      div.style.display = 'none';
      this.dom.main = div;
   };
   uiDialog.prototype.show = function(message) {
      var main,tmp;
      main = this.dom.main;
      tmp = $doc.createElement('p');
      tmp.appendChild($doc.createTextNode(message));
      $(this.dom.main).empty();
      main.appendChild(tmp);
      tmp = $doc.createElement('button');
      tmp.innerHTML = 'Close';
      $(tmp).click({dialog:this}, function(e) {
         var dialog = e.data.dialog;
         dialog.hide();
      });
      main.appendChild(tmp);
      centeralize(main);
      main.style.display = 'block';
      $m.transfer('wait');
      $doc.body.style.overflow = 'hidden';
   };
   uiDialog.prototype.hide = function() {
      var main;
      main = this.dom.main;
      main.style.display = 'none';
      $m.transfer('active');
      $doc.body.style.overflow = '';
   };

   /* assembler */
   $m.initialize('active');

   var $dialog;
   $dialog = new uiDialog(); $dialog.init();
   $doc.body.appendChild($doc.createTextNode('Under the water...'));
   $doc.body.appendChild($dialog.dom.main);
   $doc.body.appendChild($m.ui.mask);

   $dialog.show('Hello World!');

   /* publishment */
})($petal, window, document, jQuery);
```

