var size = 10

function WarriorsController($scope) {
  $scope.mars = new Mars(size)

  $scope.warriors = $scope.mars.warriors
  $scope.core = $scope.mars.core

  $scope.load = function (element) { $scope.$apply(function () {
    var reader = new FileReader()
    reader.onload = function () { $scope.$apply(function () {
      $scope.mars.loadWarriorFromSource(element.files[0].name, reader.result)
    })}
    reader.readAsText(element.files[0])
  })}

  $scope.step = function () {
    $scope.mars.step()
  }
}
