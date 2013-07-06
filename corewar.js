var size = 100

function WarriorsController($scope) {
  $scope.mars = new corewar.Mars(size)
  $scope.display = new corewar.Display($scope.mars)

  $scope.warriors = $scope.mars.warriors

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
