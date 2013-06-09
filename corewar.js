var size = 10

function compile(line) {
  line = line.trim()
  if (line === '') {
    return
  }

  var match = /^([A-Z]+)\.([A-Z]+)\s*(#|\$|@|<|>)(-?\d+)\s*,\s*(#|\$|@|<|>)(-?\d+)$/.exec(line)
  if (match === null) {
    throw "Invalid line " + line
  }

  return new Instruction(match[1], match[2], match[3], parseInt(match[4]), match[5], parseInt(match[6]))
}

function WarriorsController($scope) {
  $scope.warriors = []
  $scope.core = []

  for (var i = 0; i < size; i++) {
    $scope.core[i] = new Instruction('DAT', 'F', '#', 0, '#', 0)
  }

  $scope.load = function (element) {
    var reader = new FileReader()
    reader.onload = function () {
      var lines = reader.result.split("\n")
      var instructions = []

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i]

        if ('' === line) {
          continue
        }

        var instruction = compile(line)
        if (instruction === undefined) {
          throw "cannot compile line " + (i + 1) + ": " + line
        }

        instructions.push(instruction)
      }

      $scope.warriors.push(new Warrior(element.files[0].name, [0]))

      for (var i = 0; i < instructions.length; i++) {
        $scope.core[i] = instructions[i]
      }

      $scope.$apply()
    }
    reader.readAsText(element.files[0])
  }

  $scope.step = function () {
    var warrior = $scope.warriors[0]
    var pc = warrior.taskQueue.pop()
    EMI94(warrior, pc, $scope.core, size, size, size)
    $scope.$apply()
  }
}
