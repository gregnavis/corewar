/**
 * An implementation of Core War in JavaScript.
 *
 * @module corewar
 */
var corewar = (function () {
  /**
   * A MARS display helper.
   *
   * Objects of this class provide information to display the game in the
   * browser. There are two kinds of information:
   *
   *   * color, border and tooltip of memory cells (provided by
   *     {{#crossLink "CellDisplay"}}{{/crossLink}})
   *   * icons and names of warriors (provided by
   *     {{#crossLink "WarriorInstanceDisplay"}}{{/crossLink}})
   *
   * The class exposes properties
   * {{#crossLink "MarsDisplay/cellDisplays:property"}}{{/crossLink}} and
   * {{#crossLink "MarsDisplay/warriorInstanceDisplays:property"}}{{/crossLink}}
   * that are arrays of the objects mentioned above.
   *
   * Additionally the colors of warriors are elements of
   * {{#crossLink "MarsDisplay/colors:property"}}{{/crossLink}}.
   *
   * @class MarsDisplay
   * @constructor
   *
   * @param mars {Mars} the MARS to display
   */
  function MarsDisplay(mars) {
    this.mars = mars
    this.cellDisplays = []

    for (var i = 0; i < mars.core.length; i++) {
      this.cellDisplays.push(new CellDisplay(this, i))
    }

    this._warriorInstanceDisplays = []
  }

  /**
   * An array of memory cell display helpers (instances of
   * {{#crossLink "CellDisplay"}}{{/crossLink}}).
   *
   * @property cellDisplays
   * @type Array
   */

  /**
   * An array of warrior display helpers (instances of
   * {{#crossLink "WarriorInstanceDisplay"}}{{/crossLink}}).
   *
   * @property warriorInstanceDisplays
   * @type Array
   */
  Object.defineProperty(MarsDisplay.prototype, 'warriorInstanceDisplays', {
    'get': function () {
      for (var i = this._warriorInstanceDisplays.length; i < this.mars.warriorsInstances.length; i++) {
        this._warriorInstanceDisplays.push(new WarriorInstanceDisplay(this, i))
      }
      return this._warriorInstanceDisplays
    }
  })

  /**
   * Colors for each subsequent warrior.
   *
   * @property colors
   * @type Array
   */
  MarsDisplay.prototype.colors = [
    'YellowGreen',
    'Red',
    'Green',
    'GreenYellow',
    'Gold',
    'DeepPink'
  ]


  /**
   * A Memory Array Redcode Simulator (or MARS for short).
   *
   * This is the arena of battles of warriors. It consists of memory cells
   * and a list of warriors. The initial content of memory cells is
   * `DAT.F #0, #0`.
   *
   * Warriors can be spawned using
   * {{#crossLink "Mars/loadWarriorFromSource:method"}}{{/crossLink}}.
   * A single step of a battle can be made by calling
   * {{#crossLink "Mars/step:method"}}{{/crossLink}}.
   *
   * @class Mars
   * @constructor
   * @param size {Integer} the number of memory cells
   */
  function Mars(size) {
    this.core = []
    this.warriorsInstances = []

    for (var i = 0; i < size; i++) {
      this.core[i] = new Cell(Mars.initialInstruction.copy())
    }
  }

  Mars.initialInstruction = new Instruction('DAT', 'F', '#', 0, '#', 0)

  /**
   * Make a single step of the machine.
   *
   * The method does the following:
   *
   *   1. take the first warrior in the queue
   *   2. take the first task in the task queue of that warrior
   *   3. execute it
   *   4. push the warrior at the back of the warrior queue
   *
   * @method step
   */
  Mars.prototype.step = function () {
    var warriorInstance = this.warriorsInstances.shift()
    var pc = warriorInstance.taskQueue.pop()
    if (SUCCESS === EMI94(warriorInstance, pc, this.core, size, size, size) &&
        warriorInstance.taskQueue.length) {
      this.warriorsInstances.push(warriorInstance)
    }
  }

  /**
   * Spawns a new warrior from its source code.
   *
   * @method loadWarriorFromSource
   * @param name {String} the name of the warrior
   * @param source {String} the source code of the warrior
   */
  Mars.prototype.loadWarriorFromSource = function (name, source) {
    var compiler = new Compiler()
    var warrior = new Warrior(this.warriorsInstances.length,
      name,
      compiler.compile(source))
    this.spawn(warrior)
  }

  /**
   * Spawns an instance of the warrior at a random offset.
   *
   * @private
   * @method spawn
   * @param warrior {Warrior} the warrior to spawn
   */
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

  /**
   * Returns a random offset that where the warrior can be copied.
   *
   * @private
   * @method randomFreeOffsetFor
   * @param warrior {Warrior} the warrior to find place for
   * @return {Integer} the offset
   */
  Mars.prototype.randomFreeOffsetFor = function (warrior) {
    var freeOffsets = this.findFreeOffsets(warrior.instructions.length)
    if (!freeOffsets.length) {
      throw "No free offsets!"
    }
    return freeOffsets[Math.floor(Math.random() * freeOffsets.length)]
  }

  /**
   * Returns a list of offsets that are followed by the specified number of
   * free cells.
   *
   * @private
   * @method findFreeOffsets
   * @param length {Integer} the required number of free cells
   * @return {Array} an array of offsets
   */
  Mars.prototype.findFreeOffsets = function (length) {
    var freeOffsets = []

    for (var i = 0; i < this.core.length; i++) {
      var free = true

      for (var j = 0; j < length; j++) {
        if (null === this.core[(i + j) % this.core.length].instruction.modifiedBy) {
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

  /**
   * Returns the current program counter.
   *
   * The current program counter is the offset of the first task in the task
   * queue of the first warrior in the warrior queue.
   *
   * @private
   * @method getCurrentPc
   * @return {Integer} the current program counter
   */
  Mars.prototype.getCurrentPc = function () {
    if (!this.warriorsInstances.length) {
      return undefined
    }
    return this.warriorsInstances[0].taskQueue[0]
  }

  /**
   * A MARS memory cell display helper.
   *
   * This class provides information such as:
   *
   *   * background
   *     ({{#crossLink "CellDisplay/getBackground:method"}}{{/crossLink}})
   *   * border
   *     ({{#crossLink "CellDisplay/getBorder:method"}}{{/crossLink}})
   *   * tooltip
   *     ({{#crossLink "CellDisplay/getTooltip:method"}}{{/crossLink}})
   *
   * @class CellDisplay
   * @constructor
   * @param marsDisplay {MarsDisplay} the related MARS display
   * @param offset {Integer} the offset of the cell to display
   */
  function CellDisplay(marsDisplay, offset) {
    this.marsDisplay = marsDisplay
    this.offset = offset
  }

  /**
   * Returns the tooltip.
   *
   * Currently the tooltip is the instruction present at a given cell.
   *
   * @method getTooltip
   * @return {String} the tooltip
   */
  CellDisplay.prototype.getTooltip = function () {
    return this.marsDisplay.mars.core[this.offset].instruction.toString()
  }

  /**
   * Returns the background color.
   *
   * The colors are taken from
   * {{#crossLink "MarsDisplay.colors}}{{//crossLink}}.
   *
   * @method getBackground
   * @return {String} the background color
   */
  CellDisplay.prototype.getBackground = function () {
    var warriorInstance = this.marsDisplay.mars.core[this.offset].modifiedBy
    if (null === warriorInstance) {
      return 'dark-gray'
    }
    return this.marsDisplay.colors[warriorInstance.id]
  }

  /**
   * Returns the border color.
   *
   * The color is yellow when the program counter is at the cell and black
   * otherwise.
   *
   * @method getBorder
   * @return {String} the border color
   */
  CellDisplay.prototype.getBorder = function () {
    if (this.marsDisplay.mars.getCurrentPc() === this.offset) {
      return 'yellow'
    }
    return 'black'
  }

  /**
   * A MARS memory cell.
   *
   * @private
   * @class Cell
   * @constructor
   * @param instruction {Instruction} an instruction stored in the cell
   * @param modifiedBy {WarriorInstance} a warrior instance that modified the
   *        cell or `null` if no one modified it
   */
  function Cell(instruction, modifiedBy) {
    this.instruction = instruction
    this.modifiedBy = modifiedBy || null
  }

  /**
   * A single MARS instruction.
   *
   * @private
   * @class Instruction
   */
  function Instruction(opcode, modifier, aMode, aNumber, bMode, bNumber) {
    this.opcode = opcode
    this.modifier = modifier
    this.aMode = aMode
    this.aNumber = aNumber
    this.bMode = bMode
    this.bNumber = bNumber
  }

  /**
   * Returns a string representation of the instruction.
   *
   * @private
   * @method toString
   * @return {String} the string representation
   */
  Instruction.prototype.toString = function () {
    return this.opcode + '.' + this.modifier + ' ' +
      this.aMode + this.aNumber + ', ' +
      this.bMode + this.bNumber
  }

  /**
   * Returns a copy of the instruction.
   *
   * @private
   * @method copy
   * @return {Instruction} a copy
   */
  Instruction.prototype.copy = function () {
    return new Instruction(this.opcode,
      this.modifier,
      this.aMode,
      this.aNumber,
      this.bMode,
      this.bNumber,
      this.warrior)
  }

  /**
   * Tests for instruction equality.
   *
   * @private
   * @method isEqual
   * @param instruction {Instruction} the instruction to compare to
   * @return {Boolean} `true` if the instruction is equal and `false` otherwise
   */
  Instruction.prototype.isEqual = function (instruction) {
    return this.opcode === instruction.opcode &&
      this.modifier == instruction.modifier &&
      this.aMode == instruction.aMode &&
      this.aNumber == instruction.aNumber &&
      this.bMode == instruction.bMode &&
      this.bNumber == instruction.bNumber
  }

  /**
   * A Redcode compiler.
   *
   * @private
   * @class Compiler
   * @constructor
   */
  function Compiler() {
  }

  /**
   * Returns an array of instructions compiled from the given source string.
   *
   * @private
   * @method compile
   * @param source {String} the Redcode source to compile
   * @return {Array} the resulting {{#crossLink "Instruction"}}{{/crossLink}}s
   */
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

  /**
   * A warrior instance helper.
   *
   * The class provides:
   *
   *   * the name of the warrior (provided by
   *     {{#crossLink "WarriorInstanceDisplay/name:property"}}{{/crossLink}})
   *   * the style of the warrior's icon (provided by
   *     {{#crossLink "WarriorInstanceDisplay/style:property"}}{{/crossLink}})
   *
   * This information is used when displaying a list of warriors participating
   * in a battle.
   *
   * @class WarriorInstanceDisplay
   * @constructor
   * @param marsDisplay {MarsDisplay} the related MARS display
   * @param warriorInstanceId {Integer} the ID of the related warrior instance
   */
  function WarriorInstanceDisplay(marsDisplay, warriorInstanceId) {
    this.marsDisplay = marsDisplay
    this.warriorInstanceId = warriorInstanceId
  }

  /**
   * The name of the warrior.
   *
   * @property name
   * @type String
   */
  Object.defineProperty(WarriorInstanceDisplay.prototype, 'name', {
    'get': function () {
      return this.marsDisplay.mars.warriorsInstances[this.warriorInstanceId].warrior.name
    }
  })

  /**
   * The style of the warrior's icon.
   *
   * @property style
   * @type Object
   */
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

  /**
   * An instance of a warrior.
   *
   * Each warrior has a task queue that contains offsets to instructions
   * that are executed by the warrior. Each element of the task queue
   * corresponds to a separate thread of execution.
   *
   * @private
   * @class WarriorInstance
   * @constructor
   * @param id {Integer} the ID
   * @param warrior {Warrior} the warrior whose instance this object is
   * @param taskQueue {Array} the task queue
   */
  function WarriorInstance(id, warrior, taskQueue) {
    this.id = id
    this.warrior = warrior
    this.taskQueue = taskQueue
  }

  /**
   * A warrior.
   *
   * @private
   * @class Warrior
   * @constructor
   * @param id {Integer} ID of the warrior
   * @param name {String} the name of the warrior
   * @param instructions {Array} an array of
   *        {{#crossLink "Instruction"}}{{/crossLink}}s that this warrior
   *        executes
   */
  function Warrior(id, name, instructions) {
    this.id = id
    this.name = name
    this.instructions = instructions
  }

  /*
   * DISCLAIMER. The code below is an adaptation of a reference implementation
   * that can be found at http://www.koth.org/info/icws94.html. It is a C
   * converted to JavaScript with some adjustments to our data structures.
   */
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

  var UNDEFINED = 0;
  var SUCCESS = 1;

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
