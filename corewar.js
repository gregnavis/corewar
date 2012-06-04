(function (exports) {
  // Return names of own properties of an object.
  function getOwnProperties(object) {
    var result = [];
    for (var i in object) {
      if (object.hasOwnProperty(i)) {
        result.push(i);
      }
    }
    return result;
  };


  // A MARS process.
  function Process(owner, queue) {
    this.owner = owner;
    this.queue = queue;
  }

  // Test if a process has a thread at an offset.
  Process.prototype.hasThreadAt = function (offset) {
    return this.queue.indexOf(offset) !== -1;
  };


  // A MARS address.
  function Address(mode, value) {
    this.mode = mode;
    this.value = value;
  }

  // Test if addresses are equal.
  Address.prototype.isEqual = function (address) {
    return this.mode === address.mode
      && this.value === address.value;
  };

  // Clone an address.
  Address.prototype.clone = function () {
    return new Address(this.mode, this.value);
  };

  // Convert an address to a string.
  Address.prototype.toString = function () {
    return this.mode + this.value;
  };


  // A MARS instruction.
  function Instruction(opcode, a, b) {
    this.opcode = opcode;
    this.a = a;
    this.b = b;
  }

  // Test if instructions are equal.
  Instruction.prototype.isEqual = function (instruction) {
    return this.opcode === instruction.opcode
      && this.a.isEqual(instruction.a)
      && this.b.isEqual(instruction.b);
  };

  // Clone an instruction.
  Instruction.prototype.clone = function () {
    return new Instruction(this.opcode, this.a.clone(), this.b.clone());
  };

  // Convert an instruction to a string.
  Instruction.prototype.toString = function () {
    return this.opcode + " " + this.a.toString() + "," + this.b.toString();
  };


  // MARS (Memory Array Redcode Simulator)
  function Mars(coresize, steps) {
    this.core = new Array(coresize);
    this.config = {
  steps: steps
    };
    this.reboot();
  }

  // Set all memory to DAT 0,0 and remove all processes.
  Mars.prototype.reboot = function () {
    for (var i = 0; i < this.core.length; i++) {
      this.core[i] = new Instruction(
          "DAT",
          new Address("", 0),
          new Address("", 0)
          );
    }
    this.processes = [];
    this.steps = this.config.steps;
  };

  // Return a regular expression matching Redcode instructions.
  Mars.prototype.getInstructionRegex = function () {
    var opcodes = this.getOpcodes().join("|");
    var modes = this.getModes().join("|");
    var regex = "^\\s*(" + opcodes + ")\\s+(" + modes
      + ")(-?\\d+)\\s*,\\s*(" + modes + ")(-?\\d+)\\s*\\n?$";
    return regex;
  };

  // Compile a Redcode instruction into a MARS instruction.
  Mars.prototype.compileInstruction = function (line) {
    var regex = this.getInstructionRegex();
    var matches = line.toUpperCase().match(regex);
    if (!matches) {
      throw new Error("cannot compile " + line);
    }
    return new Instruction(
        matches[1],
        new Address(matches[2], parseInt(matches[3], 10)),
        new Address(matches[4], parseInt(matches[5], 10))
        );
  };

  // Compile a Redcode program into an array of MARS instructions.
  Mars.prototype.compileProgram = function (program) {
    var lines = program.split("\n");
    var instructions = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.match("^\s*$")) {
        continue;
      }
      instructions.push(this.compileInstruction(line));
    }
    return instructions;
  };

  // Addressing modes.
  Mars.prototype.modes = {
    "": function (address) { return address.value; },
    "#": function (address) { throw new Error("immediate mode cannot be used in addressing"); },
    "@": function (address) { return address.value + this.follow(address, "").b.value; },
    // TODO is < correctly implemented?
    "<": function (address) { return address.value + this.follow(address, "").b.value - 1; },
  };

  // Return symbols of addressing modes.
  Mars.prototype.getModes = function () {
    return getOwnProperties(this.modes);
  };

  // Resolve a MARS address to an offset that it points to.
  Mars.prototype.resolve = function (address, forceMode) {
    var mode;
    if (forceMode === undefined) {
      mode = address.mode;
    } else {
      mode = forceMode;
    }
    if (!this.modes.hasOwnProperty(mode)) {
      throw new Error(mode + " is not a valid addressing mode");
    }
    var offset = this.modes[mode].apply(this, [address]);
    return (this.context.ip + offset) % this.core.length;
  };

  // Resolve a MARS address to an instruction that it points to.
  Mars.prototype.follow = function (address, mode) {
    return this.core[this.resolve(address, mode)];
  };

  // MARS opcodes. They are executed by stepProcess. The arguments are
  // arguments A and B of the executed instruction.
  //
  // The meaning of return values:
  //   null - terminate the current thread
  //   undefined - increase the instruction pointer by one
  //   an integer n - increase the instruction pointer by n
  //   a MARS address - set instruction pointer to a given address
  Mars.prototype.opcodes = {
    "DAT": function () {
      return null;
    },
    "MOV": function (a, b) {
      var dst = this.follow(b);

      if (a.mode === '#') {
        dst.b.value = a.value;
      } else {
        var src = this.follow(a);
        dst.opcode = src.opcode;
        dst.a = src.a.clone();
        dst.b = src.b.clone();
      }
    },
    "ADD": function (a, b) {
      var dst = this.follow(b);

      if (a.mode === '#') {
        dst.b.value += a.value;
      } else {
        var src = this.follow(a);
        dst.a.value += src.a.value;
        dst.b.value += src.b.value;
      }
    },
    "SUB": function (a, b) {
      var dst = this.follow(b);

      if (a.mode === '#') {
        dst.b.value -= a.value;
      } else {
        var src = this.follow(a);
        dst.a.value -= src.a.value;
        dst.b.value -= src.b.value;
      }
    },
    "JMP": function (a) {
      return a;
    },
    "JMZ": function (a, b) {
      var dst = this.follow(b);
      if (this.follow(b).b.value === 0) {
        return a;
      }
    },
    "JMN": function (a, b) {
      var dst = this.follow(b);
      if (this.follow(b).b.value !== 0) {
        return a;
      }
    },
    "CMP": function (a, b) {
      var rhs = this.follow(b);
      var skip;

      if (a.mode === '#') {
        skip = (a.value === rhs.b.value);
      } else {
        var lhs = this.follow(a);
        skip = a.isEqual(b);
      }

      if (skip) {
        return 2;
      }
    },
    "SLT": function (a, b) {
      var lhs;

      if (a.mode === '#') {
        lhs = a.value;
      } else {
        lhs = this.follow(a).b.value;
      }

      if (lhs < b.value) {
        return 2;
      }
    },
    "DJN": function (a, b) {
      var jump;

      if (b.mode === '#') {
        jump = (b.value !== 1);
      } else {
        jump = (this.follow(b).b.value !== 1);
      }

      if (jump) {
        return a;
      }
    },
    "SPL": function (a) {
      this.fork(a);
    },
  };

  // Return names of opcodes.
  Mars.prototype.getOpcodes = function () {
    return getOwnProperties(this.opcodes);
  };

  // Run a single instruction of a process.
  Mars.prototype.stepProcess = function (process) {
    this.context = {
  ip: process.queue.shift(),
      fork: null
    };
    var instruction = this.core[this.context.ip % this.core.length];

    if (!this.opcodes.hasOwnProperty(instruction.opcode)) {
      throw new Error("instruction " + instruction.opcode + " is not implemented");
    }

    var offset = this.opcodes[instruction.opcode].apply(this, [ instruction.a, instruction.b ]);

    if (offset === null) {
      delete this.context;
      return;
    }

    if (this.context.fork !== null) {
      process.queue.push(this.context.fork);
    }

    if (offset === undefined) {
      offset = 1;
    } else if (offset.constructor === Address) {
      offset = this.resolve(offset) - this.context.ip;
    }
    process.queue.push((this.context.ip + offset) % this.core.length);
    delete this.context;
  };

  // Create a new thread of the current process.
  Mars.prototype.fork = function(address) {
    this.context.fork = this.resolve(address);
  };

  // Return a process running at an offset.
  Mars.prototype.getProcessAt = function (offset) {
    offset = offset % this.core.length;
    for (var i = 0; i < this.processes.length; i++) {
      var process = this.processes[i];
      if (process.hasThreadAt(offset)) {
        return process;
      }
    }
  };

  // Return random offset for a given process or undefined when out of memory.
  Mars.prototype.getRandomProcessOffset = function (instructions) {
    function hasEnoughSpaceAt(offset) {
      var dat00 = new Instruction(
          "DAT",
          new Address("", 0),
          new Address("", 0)
          );
      for (var i = offset; i < offset + instructions.length; i++) {
        if (!this.core[i % this.core.length].isEqual(dat00)) {
          return false;
        }
      }
      return true;
    }

    var random = Math.floor(Math.random() * this.core.length);
    for (var i = 0; i < this.core.length; i++) {
      var offset = (random + i) % this.core.length;
      if (hasEnoughSpaceAt.apply(this, [offset])) {
        return offset;
      }
    }
  };

  // Spawn a process.
  Mars.prototype.spawn = function (owner, instructions, offset) {
    if (offset === undefined) {
      offset = this.getRandomProcessOffset(instructions);
    }
    if (offset === undefined) {
      throw new Error("out of memory");
    }
    var process = new Process(owner, [offset]);
    for (var i = 0; i < instructions.length; i++) {
      this.core[(offset + i) % this.core.length] = instructions[i].clone();
    }
    this.processes.push(process);
  };


  // Run a single instruction of the next process in the queue.
  Mars.prototype.step = function () {
    if (!this.processes.length || !this.steps) {
      return false;
    }
    var process = this.processes.shift();
    this.stepProcess(process);
    if (process.queue.length) {
      this.processes.push(process);
    }
    this.steps--;
    return true;
  };

  // Return the winning warrior (null - draw, undefined - game in progress).
  Mars.prototype.getWinner = function () {
    if (!this.processes.length) {
      throw new Error("no processes");
    }
    if (this.processes.length === 1) {
      return this.processes[0];
    }
    if (!this.steps) {
      return null;
    }
  };

  exports.Mars = Mars;
})(typeof exports === 'undefined' ? this['corewar'] = {} : exports);
