var size = 100
var delay = 50

function CorewarController($scope) {
  $scope.mars = new corewar.Mars(size)
  $scope.marsDisplay = new corewar.MarsDisplay($scope.mars)
}

function WarriorsController($scope) {
  $scope.load = function (element) { $scope.$apply(function () {
    var reader = new FileReader()
    reader.onload = function () { $scope.$apply(function () {
      $scope.mars.loadWarriorFromSource(element.files[0].name, reader.result)
    })}
    reader.readAsText(element.files[0])

    $(element).replaceWith($(element).clone(true))
  })}
}

function BattleController($scope, $timeout) {
  var startTimeout

  function isPlayable() {
    return $scope.mars.warriorsInstances.length >= 2
  }

  function isStarted() {
    return undefined !== startTimeout
  }

  $scope.start = function () {
    startTimeout = $timeout(function tick() {
      $scope.mars.step()
      startTimeout = $timeout(tick, delay)
    }, delay)
  }

  $scope.canStart = function () {
    return isPlayable() && !isStarted()
  }

  $scope.stop = function () {
    if (undefined !== startTimeout) {
      $timeout.cancel(startTimeout)
      startTimeout = undefined
    }
  }

  $scope.canStop = function () {
    return isPlayable() && isStarted()
  }

  $scope.step = function () {
    $scope.mars.step()
  }

  $scope.canStep = function () {
    return $scope.canStart()
  }
}
