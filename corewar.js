Object.prototype.getOwnProperties = function () {
    var result = [];
    for (var i in this) {
        if (this.hasOwnProperty(i)) {
            result.push(i);
        }
    }
    return result;
};


function Process(queue) {
    this.queue = queue;
}


function Address(mode, value) {
    this.mode = mode;
    this.value = value;
}

Address.prototype.isEqual = function (address) {
    return this.mode == address.mode && this.value == address.value;
};

Address.prototype.clone = function () {
    return new Address(this.mode, this.value);
};


Address.prototype.toString = function () {
    return this.mode + this.value;
};


function Cell(opcode, a, b) {
    this.opcode = opcode;
    this.a = a;
    this.b = b;
}

Cell.prototype.isEqual = function (cell) {
    return this.opcode === cell.opcode && this.a.isEqual(cell.a) && this.b.isEqual(cell.b);
};

Cell.prototype.clone = function () {
    return new Cell(this.opcode, this.a.clone(), this.b.clone());
};

Cell.prototype.toString = function () {
    return this.opcode + " " + this.a.toString() + "," + this.b.toString();
};


function Mars(coresize) {
    this.core = new Array(coresize);
    this.reboot();
}

Mars.prototype.reboot = function () {
    for (var i = 0; i < this.core.length; i++) {
        this.core[i] = new Cell("DAT", new Address("", 0), new Address("", 0));
    }
    this.processes = [];
};

// Compilation

Mars.prototype.compileLine = function (line) {
    var opcodes = this.getOpcodes().join("|");
    var modes = this.getModes().join("|");
    var regex = "^\\s*(" + opcodes + ")\\s+(" + modes + ")(-?\\d+)\\s*,\\s*(" + modes + ")(-?\\d+)\\s*\\n?$";
    var matches = line.match(regex);
    if (!matches) {
        throw "invalid Redcode instruction: " + line;
    }
    return new Cell(matches[1],
        new Address(matches[2], parseInt(matches[3], 10)),
        new Address(matches[4], parseInt(matches[5], 10)));
};

Mars.prototype.compileLines = function (input) {
    var lines = input.split("\n");
    var opcodes = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.match("^\s*$")) {
            continue;
        }
        opcodes.push(this.compileLine(line));
    }
    return opcodes;
};

// Addressing

Mars.prototype.modes = {
    "": function (address) { return address.value; },
    "#": function (address) { throw "immediate mode cannot be used in addressing"; },
    "@": function (address) { return address.value + this.follow(address, "").b.value; },
    // TODO is < correctly implemented?
    "<": function (address) { return address.value + this.follow(address, "").b.value - 1; },
};

Mars.prototype.getModes = function () {
    return this.modes.getOwnProperties();
};

Mars.prototype.resolve = function (address, mode) {
    if (mode === undefined) {
        mode = address.mode;
    }
    if (!this.modes.hasOwnProperty(mode)) {
        throw mode + " is not a valid addressing mode";
    }
    var offset = this.modes[mode].apply(this, [address]);
    return (this.context.ip + offset) % this.core.length;
};

Mars.prototype.follow = function (address, mode) {
    return this.core[this.resolve(address, mode)];
};

// Instructions

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

Mars.prototype.getOpcodes = function () {
    return this.opcodes.getOwnProperties();
};

Mars.prototype.processStep = function (process) {
    this.context = {
        ip: process.queue.shift(),
        fork: null
    };
    var cell = this.core[this.context.ip % this.core.length];

    if (!this.opcodes.hasOwnProperty(cell.opcode)) {
        throw "instruction " + cell.opcode + " is not implemented";
    }

    var offset = this.opcodes[cell.opcode].apply(this, [ cell.a, cell.b ]);

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

Mars.prototype.isProcessIp = function (address) {
    address = address % this.core.length;
    for (var i = 0; i < this.processes.length; i++) {
        var process = this.processes[i];
        if (process.queue.indexOf(address) !== -1) {
            return true;
        }
    }
    return false;
};

Mars.prototype.spawn = function (opcodes) {
    if (!opcodes.length) {
        return;
    }
    var address = Math.floor(Math.random() * this.core.length);
    for (var i = 0; i < opcodes.length; i++) {
        this.core[(address + i) % this.core.length] = opcodes[i].clone();
    }
    this.processes.push(new Process([address]));
};

Mars.prototype.fork = function(address) {
    this.context.fork = this.resolve(address);
};


// Execution

Mars.prototype.step = function () {
    var process;

    while (this.processes.length) {
        process = this.processes.shift();
        if (process.queue.length) {
            break;
        }
    }

    if (process !== undefined) {
        this.processStep(process);
        if (process.queue.length) {
            this.processes.push(process);
        }
    }

    return this.processes.length > 0;
};


function MarsDisplay(mars, containerId, previewId, width, height) {
    this.mars = mars;
    this.width = width;
    this.height = height;
    this.cells = [];

    var table = document.createElement("TABLE");
    table.className = "mars";

    function addEventHandlers(element, x, y) {
        element.addEventListener("mouseover",
            function () {
                document.getElementById(previewId).innerHTML =
                    mars.core[y * width + x].toString();
            }
        );
        element.addEventListener("mouseout",
            function () {
                document.getElementById(previewId).innerHTML = "";
            }
        );
    }

    for (var j = 0; j < height; j++) {
        var tr = document.createElement("TR");
        for (var i = 0; i < width; i++) {
            var td = document.createElement("TD");
            addEventHandlers(td, i, j);
            this.cells.push(td);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    this.updateAllCells();

    document.getElementById(containerId).appendChild(table);
}

MarsDisplay.prototype.updateAllCells = function () {
    for (var i = 0; i < this.width * this.height; i++) {
        this.updateCell(i);
    }
};

MarsDisplay.prototype.updateCell = function (address) {
    className = "mars-cell ";

    if (this.mars.core[address].opcode === "DAT") {
        className += "mars-dat";
    }
    if (this.mars.isProcessIp(address)) {
        className += " mars-program";
    }

    this.cells[address].className = className;
};
