var size = 100
var delay = 50

function CorewarController($scope) {
  $scope.mars = new corewar.Mars(size)
  $scope.marsDisplay = new corewar.MarsDisplay($scope.mars)
  $scope.warriors = $scope.mars.warriors
}

function WarriorsController($scope) {
  $scope.load = function (element) { $scope.$apply(function () {
    var reader = new FileReader()
    reader.onload = function () { $scope.$apply(function () {
      $scope.mars.loadWarriorFromSource(element.files[0].name, reader.result)
    })}
    reader.readAsText(element.files[0])
  })}
}

function BattleController($scope, $timeout) {
  var startTimeout

  $scope.start = function () {
    startTimeout = $timeout(function tick() {
      $scope.mars.step()
      $("#mars-start").hide()
      $("#mars-step").hide()
      $("#mars-stop").show()
      startTimeout = $timeout(tick, delay)
    }, delay)
  }

  $scope.stop = function () {
    if (undefined !== startTimeout) {
      $timeout.cancel(startTimeout)
    }
    $("#mars-start").show()
    $("#mars-step").show()
    $("#mars-stop").hide()
  }

  $scope.step = function () {
    $scope.mars.step()
  }
}
