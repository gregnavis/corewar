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
    $scope.core[i] = Instruction.initial.copy()
  }

  $scope.load = function (element) { $scope.$apply(function () {
    var reader = new FileReader()
    reader.onload = function () { $scope.$apply(function () {
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

      var freeOffsets = []

      for (var i = 0; i < $scope.core.length; i++) {
        var free = true

        for (var j = 0; j < instructions.length; j++) {
          if (!$scope.core[(i + j) % $scope.core.length].isFree()) {
            free = false
            break
          }
        }

        if (free) {
          freeOffsets.push(i)
        }
      }

      if (!freeOffsets.length) {
        throw "No free offsets!"
      }

      var offset = freeOffsets[Math.floor(Math.random() * freeOffsets.length)]
      var warrior = new Warrior(element.files[0].name, [offset])

      $scope.warriors.push(warrior)

      for (var i = 0; i < instructions.length; i++) {
        instructions[i].warrior = warrior
        $scope.core[(offset + i) % $scope.core.length] = instructions[i]
      }
    })}
    reader.readAsText(element.files[0])
  })}

  $scope.step = function () {
    var warrior = $scope.warriors.shift()
    var pc = warrior.taskQueue.pop()
    if (SUCCESS === EMI94(warrior, pc, $scope.core, size, size, size)) {
      $scope.warriors.push(warrior)
    }
  }
}
