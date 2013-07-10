var size = 100
var delay = 50

/*
 * The root controller containing the MARS. It is shared between the
 * WarriorsController and BattleController. The former spawns new warriors.
 * The latter runs the battle.
 */
function CorewarController($scope) {
  $scope.mars = new corewar.Mars(size)
}

/*
 * The WarriorsController is responsible for spawning warriors read from files.
 */
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

/*
 * The BattleController is responsible for running and presenting the battle.
 */
function BattleController($scope, $timeout) {
  var startTimeout

  $scope.marsDisplay = new corewar.MarsDisplay($scope.mars)

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
