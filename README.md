# petalJS

Version 0.1.1

A set of JavaScript utils for web development

## Large File Uploader

Apply HTML5 File API to realize a uploader that support large file (tested with GB level file). The implementation is compatible in IE 10+, Chrome, Firefox, Safari and Opera.

## Template

Make coding web site as doing with desktop application.

```html
<!-- partial.html -->
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
```

```js
// index.js
// @include jQuery

// load template HTML
$petal.ui.load('partial', 'partial.html', false);
// create component with the template
var control = {};
$petal.ui.create(control, 'partial');

// link the element with tag="txt_name" to an object
$(control.dom.txt_name).val("hello world");
// tag="]link" yields an array of elements with name "link"
$(control.dom.link[0]).click(function () { alert("0"); });
$(control.dom.link[1]).click(function () { alert("1"); });
$(control.dom.link[2]).click(function () { alert("2"); });
// tag="+item" makes a sub template named "item"
var item = {};
$petal.ui.createT(item, control.template.item);
$(item.dom.txt_a).text("hello");
$(item.dom.txt_b).text("world");
$(contorl.dom.items).append(item.self);
$(document.body).append(control.self);
```

## Visualization

`PetalModule` A function to load javascript file dynamically in DOM.

`PetalInteraction` A function to wrap mouse events.

- `comboclick` click for N times ( N > 2 )
- `mousehold`  hold for N ms
- `mouseframe` select a frame by drag-n-drop
- `mousegesture` record mouse move trace

`PetalMobileInteraction` A function to wrap touch events, mapping them to mouse events.

- `touchpinch` pinch with multiple fingers
- touchstart ==> mousedown
- touchmove  ==> mousemove
- touchend   ==> mouseup

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

- Fast try:

```js
var m = new $petal.state.PetalMachine();
m.register("1", function() {alert("in:p1");}, function() {alert("out:p1");});
m.register("2", function() {alert("in:p2");}, function() {alert("out:p2");});
m.register("3", function() {alert("in:p3");}, function() {alert("out:p3");});
m.register("4", function() {alert("in:p4");}, function() {alert("out:p4");});

m.connect("1", "2", null);
m.connect("1", "3", null);
m.connect("2", "2", null);
m.connect("2", "4", null);
m.connect("3", "1", null);
m.connect("3", "4", null);
m.connect("4", "1", null);

m.initialize("1");
m.transfer("4"); // no effect, stay at "1"
m.transfer("3"); // goto "3"
var i;for(i=0;i<10;i++) m.wander();
```

- Modal Dialog: /sampels/modal-dialog.html

## Router

`$petal.router` An instance to route the URL for web application with single page.

The router will split `window.location.hash` into two parts. One starts with '#' and the other is for query which begin with '?'. The fomer part will be tested by the rules registered in the router, load necessary JavaScript resources and invoke an initial function.

```
url   = #(hash);
query = ?(hash);

foreach rule in router.rules
   rule.patern.test(url);
   if pass
      load(rule.jses);
      rule.init();
      return;
```

- `loadjs` Load a JavaScript resource `js` and then invoke `callback`; if `force` is true and the specified JavaScript resource is loaded, it will make the resource reloaded.
- `loadjses` Load several JavaScript resources in an array of `js` and then invoke `callback'.
- `unloadjs` Unload a specified JavaScript resource `js` and then invoke `clean`.
- `ruleIn` Register a rule with `name` as ID, `patern`, an array `js` to declare what JavaScript resources needed and a function `init`.
- `ruleOut` Remove a rule by `name`.
- `refresh` Do routing once; attach to `window` to monitor URL changes as below:

```js
window.onhashchange = $petal.router.refresh;
```

Examples for how to use the router:

- Fast try:

```js
$petal.router.ruleIn('home', '^#?/?$', null,
   function() {
      // redirect to real home
      window.location.hash = '/home';
   });
$petal.router.ruleIn('home', '^#/home$', null,
   function() {
      alert('hello world!');
   });
$petal.router.ruleIn('number', '^#/number/([0-9]+)$', null,
   function(url, num) {
      alert(num);
   });
$petal.router.ruleIn('word', '^#/word/([A-Za-z]+])$' null,
   function(url, word, query) { // e.g. #/word/hello?world
      alert(word+'\n'+query);
   });
window.onhashchange = $petal.router.refresh;
$petal.router.refresh();
```

- Router: /sampels/router.html (+ /samples/router-extra.js)

