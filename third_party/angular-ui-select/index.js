var app = angular.module('app', ['ui.select', 'ngSanitize']);

var test_list = [];

app.controller('pageIndex', ['$scope', function ($scope) {
  $scope.test_list = test_list;
  for (var i=50-1; i>=0; i--) {
    $scope.test_list.push({id:i, name:'test'+i});
  }
  $scope.selected = $scope.test_list[25]; //$scope.test_list[25];
  $scope.disabled = false;
}]);

app.directive('scrollWindow', function () {
  return {
    link: function ($scope, $elem, $attr) {
      var $select = $scope.$select,
          source = $scope.$eval($attr.scrollWindow),
          size = parseInt($attr.scrollWindowSize || 20),
          state = {
            upable: false,
            downable: true,
            upindex: 0,
            downindex: 0,
            data: []
          },
          selected = $scope.$eval($attr.scrollWindowSelected);
      initScrollWindow($elem, $select, source, size, state, selected);
      $scope.$watchCollection($attr.scrollWindow, function () {
        source = $scope.$eval($attr.scrollWindow);
        initScrollWindow($elem, $select, source, size, state, selected);
      });
    }
  };

  function initScrollWindow($elem, $select, source, size, state, selected) {
    if (!source) source = [];
    source = source.slice();
    if (source.length <= size) {
      source.forEach(function (item) { $select.items.push(item)});
      $select.refreshItems();
    } else {
      if (!selected) {
        // selected === null, load from top
        state = loadWindow(
          $select, source, 0, state.downindex, size, true);
      } else {
        // currently only support one select
        var mid = lookup(source, selected);
        state.upindex = mid - (~~((size - 1) / 2));
        if (state.upindex < 0) state.upindex = 0;
        state.downindex = state.upindex + size;
        if (state.downindex >= source.length) state.downindex = source.length - 1;
        state = loadWindow(
          $select, source, state.upindex, state.downindex, 0, true);
        $select.ngModel.$viewValue = $select.items[mid];
      }
      $elem.unbind('scroll');
      $elem.bind('scroll', function () {
        var percent =
          $elem.prop('scrollTop') /
          Math.abs($elem.prop('scrollHeight') - $elem.prop('offsetHeight'));
        var showSize = state.downindex - state.upindex,
            eachHeight = 0,
            oldState = null;
        if (showSize > 0) {
          eachHeight = $elem.prop('scrollHeight') / showSize;
        }
        // scroll one page toward top
        if (percent >= 1 && state.downable) {
          oldState = state;
          state = loadWindow(
            $select, source, state.upindex, state.downindex, size, true);
        }
        // scroll one page toward bottom
        if (percent <= 0 && state.upable) {
          oldState = state;
          state = loadWindow(
            $select, source, state.upindex, state.downindex, size, false);
          $select.activeIndex += oldState.upindex - state.upindex;
          setTimeout(function () {
            $elem.prop(
              'scrollTop',
              $elem.prop('scrollTop') +
                (oldState.upindex - state.upindex) * eachHeight
            );
          }, 0);
        }
      });
    }
  }

  function loadWindow($select, items, upindex, downindex, size, downscroll) {
    var upable = true,
        downable = true;
    if (downscroll) {
      downindex += size;
    } else {
      upindex -= size;
    }
    if (upindex < 0) upindex = 0;
    if (downindex >= items.length) downindex = items.length - 1;
    if (downindex < 0) downindex = 0;
    if (upindex === 0) upable = false;
    if (downindex === items.length - 1) downable = false;
    $select.items = items.slice(upindex, downindex + 1);
    $select.refreshItems($select.items);
    return {
      upable: upable,
      downable: downable,
      upindex: upindex,
      downindex: downindex,
      data: $select._items
    };
  }

  function lookup(items, item) {
    for (var i = 0, n = items.length; i < n; i++) {
      if (angular.equals(items[i], item)) return i;
    }
    // should not be here
    return -1;
  }
});
