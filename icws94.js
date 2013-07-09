var corewar = (function () {
  function compileLine(line) {
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

  function Compiler() {
  }

  Compiler.prototype.compile = function (source) {
    var lines = source.split("\n")
    var instructions = []

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i]

      if ('' === line) {
        continue
      }

      var instruction = compileLine(line)
      if (instruction === undefined) {
        throw "cannot compile line " + (i + 1) + ": " + line
      }

      instructions.push(instruction)
    }

    return instructions
  }

  var UNDEFINED = 0;
  var SUCCESS = 1;

  function MarsDisplay(mars) {
    this.mars = mars
    this.cellDisplays = []

    for (var i = 0; i < mars.core.length; i++) {
      this.cellDisplays.push(new CellDisplay(this, i))
    }

    this._warriorInstanceDisplays = []
  }

  MarsDisplay.prototype.colors = [
    'YellowGreen',
    'Red',
    'Green',
    'GreenYellow',
    'Gold',
    'DeepPink'
  ]

  Object.defineProperty(MarsDisplay.prototype, 'warriorInstanceDisplays', {
    'get': function () {
      for (var i = this._warriorInstanceDisplays.length; i < this.mars.warriorsInstances.length; i++) {
        this._warriorInstanceDisplays.push(new WarriorInstanceDisplay(this, i))
      }
      return this._warriorInstanceDisplays
    }
  })

  function CellDisplay(marsDisplay, offset) {
    this.marsDisplay = marsDisplay
    this.offset = offset
  }

  CellDisplay.prototype.getTooltip = function () {
    return this.marsDisplay.mars.core[this.offset].instruction.toString()
  }

  CellDisplay.prototype.getBackground = function () {
    var warriorInstance = this.marsDisplay.mars.core[this.offset].modifiedBy
    if (null === warriorInstance) {
      return 'dark-gray'
    }
    return this.marsDisplay.colors[warriorInstance.id]
  }

  CellDisplay.prototype.getBorder = function () {
    if (this.marsDisplay.mars.getCurrentPc() === this.offset) {
      return 'yellow'
    }
    return 'black'
  }

  function WarriorInstanceDisplay(marsDisplay, warriorInstanceId) {
    this.marsDisplay = marsDisplay
    this.warriorInstanceId = warriorInstanceId
  }

  Object.defineProperty(WarriorInstanceDisplay.prototype, 'name', {
    'get': function () {
      return this.marsDisplay.mars.warriorsInstances[this.warriorInstanceId].warrior.name
    }
  })

  Object.defineProperty(WarriorInstanceDisplay.prototype, 'style', {
    'get': function () {
      return {
        'background': this.marsDisplay.colors[this.warriorInstanceId],
        'display': 'inline-block',
        'height': '12px',
        'width': '12px'
      }
    }
  })

  function Mars(size) {
    this.core = []
    this.warriorsInstances = []

    for (var i = 0; i < size; i++) {
      this.core[i] = new Cell(Mars.initialInstruction.copy())
    }
  }

  Mars.initialInstruction = new Instruction('DAT', 'F', '#', 0, '#', 0)

  Mars.prototype.step = function () {
    var warriorInstance = this.warriorsInstances.shift()
    var pc = warriorInstance.taskQueue.pop()
    if (SUCCESS === EMI94(warriorInstance, pc, this.core, size, size, size) &&
        warriorInstance.taskQueue.length) {
      this.warriorsInstances.push(warriorInstance)
    }
  }

  Mars.prototype.loadWarriorFromSource = function (name, source) {
    var compiler = new Compiler()
    var warrior = new Warrior(this.warriorsInstances.length,
      name,
      compiler.compile(source))
    this.spawn(warrior)
  }

  Mars.prototype.spawn = function (warrior) {
    var offset = this.randomFreeOffsetFor(warrior)
    var warriorInstance = new WarriorInstance(this.warriorsInstances.length,
      warrior,
      [offset])

    this.warriorsInstances.push(warriorInstance)

    for (var i = 0; i < warrior.instructions.length; i++) {
      var instruction = warrior.instructions[i]
      var cell = this.core[(offset + i) % this.core.length]
      cell.instruction = instruction.copy()
      cell.modifiedBy = warriorInstance
    }
  }

  Mars.prototype.randomFreeOffsetFor = function (warrior) {
    var freeOffsets = this.findFreeOffsets(warrior.instructions.length)
    if (!freeOffsets.length) {
      throw "No free offsets!"
    }
    return freeOffsets[Math.floor(Math.random() * freeOffsets.length)]
  }

  Mars.prototype.findFreeOffsets = function (length) {
    var freeOffsets = []

    for (var i = 0; i < this.core.length; i++) {
      var free = true

      for (var j = 0; j < length; j++) {
        if (!this.core[(i + j) % this.core.length].instruction.isEqual(Mars.initialInstruction)) {
          free = false
          break
        }
      }

      if (free) {
        freeOffsets.push(i)
      }
    }

    return freeOffsets
  }

  Mars.prototype.getCurrentPc = function () {
    if (!this.warriorsInstances.length) {
      return undefined
    }
    return this.warriorsInstances[0].taskQueue[0]
  }

  function Cell(instruction, modifiedBy) {
    this.instruction = instruction
    this.modifiedBy = modifiedBy || null
  }

  function Warrior(id, name, instructions) {
    this.id = id
    this.name = name
    this.instructions = instructions
  }

  function WarriorInstance(id, warrior, taskQueue) {
    this.id = id
    this.warrior = warrior
    this.taskQueue = taskQueue
  }

  function Queue(W, TaskPointer) {
    W.taskQueue.push(TaskPointer);
  }

  function Fold(pointer, limit, M) {
    var result
    while (pointer < 0) {
      pointer += limit
    }
    result = pointer % limit;
    if (result > (limit / 2)) {
      result += M - limit;
    }
    return result;
  }

  function Instruction(opcode, modifier, aMode, aNumber, bMode, bNumber) {
    this.opcode = opcode
    this.modifier = modifier
    this.aMode = aMode
    this.aNumber = aNumber
    this.bMode = bMode
    this.bNumber = bNumber
  }

  Instruction.prototype.toString = function () {
    return this.opcode + '.' + this.modifier + ' ' +
      this.aMode + this.aNumber + ', ' +
      this.bMode + this.bNumber
  }

  Instruction.prototype.copy = function () {
    return new Instruction(this.opcode,
      this.modifier,
      this.aMode,
      this.aNumber,
      this.bMode,
      this.bNumber,
      this.warrior)
  }

  Instruction.prototype.isEqual = function (instruction) {
    return this.opcode === instruction.opcode &&
      this.modifier == instruction.modifier &&
      this.aMode == instruction.aMode &&
      this.aNumber == instruction.aNumber &&
      this.bMode == instruction.bMode &&
      this.bNumber == instruction.bNumber
  }

  function EMI94(W, PC, Core, M, ReadLimit, WriteLimit) {
    var IR, IRA, IRB, RPA, WPA, RPB, WPB, PIP;

    Core[PC].modifiedBy = W
    IR = Core[PC].instruction.copy();

    if (IR.aMode === '#') {
      RPA = WPA = 0;
    } else {
      RPA = Fold(IR.aNumber, ReadLimit, M);
      WPA = Fold(IR.aNumber, WriteLimit, M);

      if (IR.aMode != '$') {
        if (IR.aMode === '<') {
          Core[((PC + WPA) % M)].instruction.bNumber = (Core[((PC + WPA) % M)].instruction.bNumber + M - 1) % M;
          Core[((PC + WPA) % M)].modifiedBy = W;
        }
        if (IR.aMode === '>') {
          PIP = (PC + WPA) % M;
        }
        RPA = Fold((RPA + Core[((PC + RPA) % M)].instruction.bNumber), ReadLimit, M);
        WPA = Fold((WPA + Core[((PC + WPA) % M)].instruction.bNumber), WriteLimit, M);
      }
    }

    IRA = Core[((PC + RPA) % M)].instruction.copy();

    if (IR.aMode === '>') {
      Core[PIP].instruction.bNumber = (Core[PIP].instruction.bNumber + 1) % M;
      Core[PIP].modifiedBy = W
    }

    if (IR.bMode === '#') {
      RPB = WPB = 0;
    } else {
      RPB = Fold(IR.bNumber, ReadLimit, M);
      WPB = Fold(IR.bNumber, WriteLimit, M);
      if (IR.bMode != '$') {
        if (IR.bMode === '<') {
          Core[((PC + WPB) % M)].instruction.bNumber = (Core[((PC + WPB) % M)].instruction.bNumber + M - 1) % M;
          Core[((PC + WPB) % M)].modifiedBy = W
        } else if (IR.bMode === '>') {
          PIP = (PC + WPB) % M;
        }
        RPB = Fold((RPB + Core[((PC + RPB) % M)].instruction.bNumber), ReadLimit, M);
        WPB = Fold((WPB + Core[((PC + WPB) % M)].instruction.bNumber), WriteLimit, M);
      }
    }

    IRB = Core[((PC + RPB) % M)].instruction.copy();

    if (IR.bMode === '>') {
      Core[PIP].instruction.bNumber = (Core[PIP].instruction.bNumber + 1) % M;
      Core[PIP].modifiedBy = W
    }


    switch (IR.opcode) {
      case 'DAT':
        break;

      case 'MOV':
        switch (IR.modifier) {
          case 'A':
            Core[((PC + WPB) % M)].instruction.aNumber = IRA.aNumber;
            break;

          case 'B':
            Core[((PC + WPB) % M)].instruction.bNumber = IRA.bNumber;
            break;

          case 'AB':
            Core[((PC + WPB) % M)].instruction.bNumber = IRA.aNumber;
            break;

          case 'BA':
            Core[((PC + WPB) % M)].instruction.aNumber = IRA.bNumber;
            break;

          case 'F':
            Core[((PC + WPB) % M)].instruction.aNumber = IRA.aNumber;
            Core[((PC + WPB) % M)].instruction.bNumber = IRA.bNumber;
            break;

          case 'X':
            Core[((PC + WPB) % M)].instruction.bNumber = IRA.aNumber;
            Core[((PC + WPB) % M)].instruction.aNumber = IRA.bNumber;
            break;

          case 'I':
            Core[((PC + WPB) % M)].instruction = IRA;
            break;

          default:
            return(UNDEFINED);
            break;
        }

        Core[((PC + WPB) % M)].modifiedBy = W
        Queue(W, ((PC + 1) % M));
        break;

      case 'ADD':
        switch (IR.modifier) {
          case 'A':
            Core[((PC + WPB) % M)].instruction.aNumber = (IRB.aNumber + IRA.aNumber) % M;
            break;

          case 'B':
            Core[((PC + WPB) % M)].instruction.bNumber = (IRB.bNumber + IRA.bNumber) % M;
            break;

          case 'AB':
            Core[((PC + WPB) % M)].instruction.bNumber = (IRB.aNumber + IRA.bNumber) % M;
            break;

          case 'BA':
            Core[((PC + WPB) % M)].instruction.aNumber = (IRB.bNumber + IRA.aNumber) % M;
            break;

          case 'F':
          case 'I':
            Core[((PC + WPB) % M)].instruction.aNumber = (IRB.aNumber + IRA.aNumber) % M;
            Core[((PC + WPB) % M)].instruction.bNumber = (IRB.bNumber + IRA.bNumber) % M;
            break;

          case 'X':
            Core[((PC + WPB) % M)].instruction.bNumber = (IRB.aNumber + IRA.bNumber) % M;
            Core[((PC + WPB) % M)].instruction.aNumber = (IRB.bNumber + IRA.aNumber) % M;
            break;

          default:
            return UNDEFINED;
            break;
        }
        Core[((PC + WPB) % M)].modifiedBy = W
        Queue(W, ((PC + 1) % M));
        break;

      case 'SUB':
        switch (IR.modifier) {
          case 'A':
            Core[((PC + WPB) % M)].instruction.aNumber = (IRB.aNumber + M - IRA.aNumber) % M;
            break;

          case 'B':
            Core[((PC + WPB) % M)].instruction.bNumber = (IRB.bNumber + M - IRA.bNumber) % M;
            break;

          case 'AB':
            Core[((PC + WPB) % M)].instruction.bNumber = (IRB.aNumber + M - IRA.bNumber) % M;
            break;

          case 'BA':
            Core[((PC + WPB) % M)].instruction.aNumber = (IRB.bNumber + M - IRA.aNumber) % M;
            break;

          case 'F':
          case 'I':
            Core[((PC + WPB) % M)].instruction.aNumber = (IRB.aNumber + M - IRA.aNumber) % M;
            Core[((PC + WPB) % M)].instruction.bNumber = (IRB.bNumber + M - IRA.bNumber) % M;
            break;

          case 'X':
            Core[((PC + WPB) % M)].instruction.bNumber = (IRB.aNumber + M - IRA.bNumber) % M;
            Core[((PC + WPB) % M)].instruction.aNumber = (IRB.bNumber + M - IRA.aNumber) % M;
            break;

          default:
            return UNDEFINED;
            break;
        }
        Core[((PC + WPB) % M)].modifiedBy = W
        Queue(W, ((PC + 1) % M));
        break;

      case 'MUL':
        switch (IR.modifier) {
          case 'A':
            Core[((PC + WPB) % M)].instruction.aNumber = (IRB.aNumber * IRA.aNumber) % M;
            break;

          case 'B':
            Core[((PC + WPB) % M)].instruction.bNumber = (IRB.bNumber * IRA.bNumber) % M;
            break;

          case 'AB':
            Core[((PC + WPB) % M)].instruction.bNumber = (IRB.aNumber * IRA.bNumber) % M;
            break;

          case 'BA':
            Core[((PC + WPB) % M)].instruction.aNumber = (IRB.bNumber * IRA.aNumber) % M;
            break;

          case 'F':
          case 'I':
            Core[((PC + WPB) % M)].instruction.aNumber = (IRB.aNumber * IRA.aNumber) % M;
            Core[((PC + WPB) % M)].instruction.bNumber = (IRB.bNumber * IRA.bNumber) % M;
            break;

          case 'X':
            Core[((PC + WPB) % M)].instruction.bNumber = (IRB.aNumber * IRA.bNumber) % M;
            Core[((PC + WPB) % M)].instruction.aNumber = (IRB.bNumber * IRA.aNumber) % M;
            break;

          default:
            return UNDEFINED;
            break;
        }
        Core[((PC + WPB) % M)].modifiedBy = W
        Queue(W, ((PC + 1) % M));
        break;

      case 'DIV':
        switch (IR.modifier) {
          case 'A':
            if (IRA.aNumber != 0) {
              Core[((PC + WPB) % M)].instruction.aNumber = IRB.aNumber / IRA.aNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
            }
            break;

          case 'B':
            if (IRA.bNumber != 0) {
              Core[((PC + WPB) % M)].instruction.bNumber = IRB.bNumber / IRA.bNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'AB':
            if (IRA.aNumber != 0) {
              Core[((PC + WPB) % M)].instruction.bNumber = IRB.bNumber / IRA.aNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'BA':
            if (IRA.bNumber != 0) {
              Core[((PC + WPB) % M)].instruction.aNumber = IRB.aNumber / IRA.bNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'F':
          case 'I':
            if (IRA.aNumber != 0) {
              Core[((PC + WPB) % M)].instruction.aNumber = IRB.aNumber / IRA.aNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
            }
            if (IRA.bNumber != 0) {
              Core[((PC + WPB) % M)].instruction.bNumber = IRB.bNumber / IRA.bNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
            }
            if (!((IRA.aNumber === 0) || (IRA.bNumber === 0))) {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'X':
            if (IRA.aNumber != 0) {
              Core[((PC + WPB) % M)].modifiedBy = W
              Core[((PC + WPB) % M)].instruction.bNumber = IRB.bNumber / IRA.aNumber;
            }
            if (IRA.bNumber != 0) {
              Core[((PC + WPB) % M)].modifiedBy = W
              Core[((PC + WPB) % M)].instruction.aNumber = IRB.aNumber / IRA.bNumber;
            }
            if (!((IRA.aNumber === 0) || (IRA.bNumber === 0))) {
              Queue(W, ((PC + 1) % M));
            }
            break;

          default:
            return UNDEFINED;
            break;
        }
        break;

      case 'MOD':
        switch (IR.modifier) {
          case 'A':
            if (IRA.aNumber != 0) {
              Core[((PC + WPB) % M)].instruction.aNumber = IRB.aNumber % IRA.aNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
            }
            break;

          case 'B':
            if (IRA.bNumber != 0) {
              Core[((PC + WPB) % M)].instruction.bNumber = IRB.bNumber % IRA.bNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'AB':
            if (IRA.aNumber != 0) {
              Core[((PC + WPB) % M)].instruction.bNumber = IRB.bNumber % IRA.aNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'BA':
            if (IRA.bNumber != 0) {
              Core[((PC + WPB) % M)].instruction.aNumber = IRB.aNumber % IRA.bNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'F':
          case 'I':
            if (IRA.aNumber != 0) {
              Core[((PC + WPB) % M)].instruction.aNumber = IRB.aNumber % IRA.aNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
            }
            if (IRA.bNumber != 0) {
              Core[((PC + WPB) % M)].instruction.bNumber = IRB.bNumber % IRA.bNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
            }
            if (!((IRA.aNumber === 0) || (IRA.bNumber === 0))) {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'X':
            if (IRA.aNumber != 0) {
              Core[((PC + WPB) % M)].instruction.bNumber = IRB.bNumber % IRA.aNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
            }
            if (IRA.bNumber != 0) {
              Core[((PC + WPB) % M)].instruction.aNumber = IRB.aNumber % IRA.bNumber;
              Core[((PC + WPB) % M)].modifiedBy = W
            }
            if (!((IRA.aNumber === 0) || (IRA.bNumber === 0))) {
              Queue(W, ((PC + 1) % M));
            }
            break;

          default:
            return UNDEFINED;
            break;
        }
        break;

      case 'JMP':
        Queue(W, (PC + RPA) % M);
        break;

      case 'JMZ':
        switch (IR.modifier) {
          case 'A':
          case 'BA':
            if (IRB.aNumber === 0) {
              Queue(W, RPA);
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'B':
          case 'AB':
            if (IRB.bNumber === 0) {
              Queue(W, RPA);
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'F':
          case 'X':
          case 'I':
            if ((IRB.aNumber === 0) && (IRB.bNumber === 0)) {
              Queue(W, RPA);
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          default:
            return UNDEFINED;
            break;
        }
        break;

      case 'JMN':
        switch (IR.modifier) {
          case 'A':
          case 'BA':
            if (IRB.aNumber != 0) {
              Queue(W, RPA);
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'B':
          case 'AB':
            if (IRB.bNumber != 0) {
              Queue(W, RPA);
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'F':
          case 'X':
          case 'I':
            if ((IRB.aNumber != 0) || (IRB.bNumber != 0)) {
              Queue(W, RPA);
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          default:
            return UNDEFINED;
            break;
        }
        break;

      case 'DJN':
        switch (IR.modifier) {
          case 'A':
          case 'BA':
            Core[((PC + WPB) % M)].instruction.aNumber = (Core[((PC + WPB) % M)].instruction.aNumber + M - 1) % M;
            IRB.aNumber -= 1;
            if (IRB.aNumber != 0) {
              Queue(W, RPA);
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'B':
          case 'AB':
            Core[((PC + WPB) % M)].instruction.bNumber = (Core[((PC + WPB) % M)].instruction.bNumber + M - 1) % M;
            IRB.bNumber -= 1;
            if (IRB.bNumber != 0) {
              Queue(W, RPA);
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'F':
          case 'X':
          case 'I':
            Core[((PC + WPB) % M)].instruction.aNumber = (Core[((PC + WPB) % M)].instruction.aNumber + M - 1) % M;
            IRB.aNumber -= 1;
            Core[((PC + WPB) % M)].instruction.bNumber = (Core[((PC + WPB) % M)].instruction.bNumber + M - 1) % M;
            IRB.bNumber -= 1;
            if ((IRB.aNumber != 0) || (IRB.bNumber != 0)) {
              Queue(W, RPA);
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          default:
            return UNDEFINED;
            break;
        }
        break;

      case 'CMP':
        switch (IR.modifier) {
          case 'A':
            if (IRA.aNumber === IRB.aNumber) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'B':
            if (IRA.bNumber === IRB.bNumber) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'AB':
            if (IRA.aNumber === IRB.bNumber) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'BA':
            if (IRA.bNumber === IRB.aNumber) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'F':
            if ((IRA.aNumber === IRB.aNumber) &&
                (IRA.bNumber === IRB.bNumber)) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'X':
            if ((IRA.aNumber === IRB.bNumber) &&
                (IRA.bNumber === IRB.aNumber)) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'I':
            if ((IRA.opcode === IRB.opcode) &&
                (IRA.modifier === IRB.modifier) &&
                (IRA.aMode === IRB.aMode) &&
                (IRA.aNumber === IRB.aNumber) &&
                (IRA.bMode === IRB.bMode) &&
                (IRA.bNumber === IRB.bNumber)) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          default:
            return UNDEFINED;
            break;
        }
        break;

      case 'SLT' :
        switch (IR.modifier) {
          case 'A':
            if (IRA.aNumber < IRB.aNumber) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'B':
            if (IRA.bNumber < IRB.bNumber) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'AB':
            if (IRA.aNumber < IRB.bNumber) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'BA':
            if (IRA.bNumber < IRB.aNumber) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'F':
          case 'I':
            if ((IRA.aNumber < IRB.aNumber) &&
                (IRA.bNumber < IRB.bNumber)) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          case 'X':
            if ((IRA.aNumber < IRB.bNumber) &&
                (IRA.bNumber < IRB.aNumber)) {
              Queue(W, ((PC + 2) % M));
            } else {
              Queue(W, ((PC + 1) % M));
            }
            break;

          default:
            return UNDEFINED;
            break;
        }
        break;

      case 'SPL':
        Queue(W, ((PC + 1) % M));
        Queue(W, RPA);
        break;

      default:
        return UNDEFINED;
    }

    return SUCCESS;
  }

  return {
    'CellDisplay': CellDisplay,
    'MarsDisplay': MarsDisplay,
    'Mars': Mars,
    'Warrior': Warrior,
    'Instruction': Instruction
  }
})();
