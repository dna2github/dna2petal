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

- Modal Dialog: /sampels/modal-dialog.html


