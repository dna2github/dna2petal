var $petal;
if($petal == null) $petal = {};

(function($petal) { // START: Module $petal.state

/* common function */
function PetalState(id, event_in, event_out, commit) {
   if(commit==null) commit = false;

   this.id = id;
   this.event_in = event_in;
   this.event_out = event_out;
   this.commit = commit;

   // item: {id: string, where: PetalState, condition: PetalCondition}
   this.to = new PetalStateSet();
}
PetalState.prototype.come = function(prev, data, remain) {
   // remain = prev.event_out(this, data);
   if(!this.event_in) return null;
   return this.event_in(prev, data, remain);
};
PetalState.prototype.go = function(next, data) {
   if(!this.event_out) return null;
   return this.event_out(next, data);
};

function PetalCondition(from, to, condition, directed) {
   if(directed==null) directed = true;

   this.from = from;
   this.to = to;
   this.condition = condition;
   this.directed = directed;
}
PetalCondition.prototype.match = function(from, to) {
   if(this.from == from && this.to == to) return true;
   if(!this.directed && this.from == to && this.to == from) return true;
   return false;
};
PetalCondition.prototype.check = function(data) {
   if(!this.condition) return true; // no condition
   return this.condition(this.from, this.to, data);
};

function PetalStateSet() {
   this.states = [];
}
PetalStateSet.prototype.get = function(id) {
   var index=-1,i,n=this.states.length; for(i=0;i<n;i++) {
      if(this.states[i].id == id) {
         index = i; break;
      }
   }
   if(index<0) return null;
   return {index: index, state: this.states[index]};
};
PetalStateSet.prototype.foreach = function(action, saveresult) {
   if(saveresult==null) saveresult = false;

   var i,n;
   if(saveresult) {
      var r, result = [];
      n=this.states.length; for(i=0;i<n;i++) {
         r = action(this.states[i]);
         result.push(r);
      }
      return result;
   } else {
      n=this.states.length; for(i=0;i<n;i++) {
         action(this.states[i]);
      }
   }
};
PetalStateSet.prototype.put = function(one, force) {
   if(force==null) force = false;

   var search = this.get(one.id);
   if(search) {
      if(force) {
         this.states[search.index] = one;
         return true;
      }
      return false;
   }
   this.states.push(one);
   return true;
};
PetalStateSet.prototype.take = function(id) {
   var search = this.get(id);
   if(!search) {
      return null;
   }
   this.states.splice(search.index, 1);
   return search.state;
};

function PetalMachine() {
   this.state = new PetalStateSet();
   this.current = null;
   this.lastTransferResult = null;
}
PetalMachine.prototype.register = function(id, event_in, event_out, commit) {
   if(commit==null) commit = false;

   var one = new PetalState(id, event_in, event_out, commit);
   return this.state.put(one);
};
PetalMachine.prototype.unregister = function(id) {
   var state = this.state.take(id);
   if(!state) return null;
   this.state.foreach(function(one) {
      one.to.take(id);
   });
};
PetalMachine.prototype.initialize = function(id, config) {
   var state = this.state.get(id);
   if(!state) {
      this.current = null;
      return false;
   }
   state = state.state; // {index, state}
   if(state.event_in) state.event_in(this.current, config, {init: true});
   this.current = state;
   if(state.commit) {
      var r = this.wander(config);
      return r.result;
   }
   return true;
};
PetalMachine.prototype.jump = function(id, config) {
   return this.initialize(id, config);
};
PetalMachine.prototype.connect = function(from, to, condition, directed) {
   if(directed==null) directed = true;

   var prev = this.state.get(from);
   var next = this.state.get(to);
   if(!prev || !next) {
      return false;
   }
   prev = prev.state;
   next = next.state;
   var cond = new PetalCondition(from, to, condition, directed);
   prev.to.put({id: to, where: next, condition: cond}, true);
   if(!directed) {
      next.to.put({id: from, where: prev, condition: cond}, true);
   }
   return true;
};
PetalMachine.prototype.disconnect = function(from, to, directed) {
   if(directed==null) directed = true;

   var prev = this.state.get(from);
   var next = this.state.get(to);
   if(!prev || !next) {
      return false;
   }
   prev = prev.state;
   next = next.state;
   prev.to.take(to);
   if(!directed) next.to.take(from);
   return true;
};
PetalMachine.prototype.transfer = function(id, data, checkcond) {
   if(checkcond==null) checkcond = true;

   if(!this.current) {
      return {result: false, error: 1, message: "uninit"};
   }
   var way = this.current.to.get(id);
   if(!way) {
      // TODO: deal with no way to the next state
      return {result: false, error: 2, message: "noway"};
   }
   way = way.state;
   if(checkcond) {
      if(!way.condition.check(data)) {
         // TODO: deal with the unsatisfied condition
         return {result: false, error: 3, message: "unsatisfied"};
      }
   }
   var prev = this.current;
   var next = way.where;
   var remain = prev.go(next, data);
   this.current = next;
   var result = next.come(prev, data, remain);
   this.lastTransferResult = result;
   if(this.current.commit) {
      return this.wander(data);
   }
   return {result: true, current: this.current};
};
PetalMachine.prototype.wander = function(data) {
   // wander is a special function
   // step 1. get the set of available next states from current state
   // step 2. transfer to a random next state

   if(!this.current) {
      return {result: false, error: 1, message: "uninit"};
   }
   var next = [];
   this.current.to.foreach(function(one) {
      if(one.condition.check(data)) next.push(one);
   });
   if(next.length==0) {
      return {result: false, error: 3, message: "unsatisfied"};
   }
   var way = next[Math.floor(Math.random()*next.length)];
   var r = this.transfer(way.id, data, false);
   r.available = next;
   return r;
};
PetalMachine.prototype.cursor = function() {
   if(!this.current) return null;
   return this.current.id;
}

/* publishment */
$petal.state = {};
$petal.state.PetalMachine = PetalMachine;

})($petal); // END: Module $petal.state


/*
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
*/
