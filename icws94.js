var UNDEFINED = 0;
var SUCCESS = 1;

function Warrior(name, taskQueue) {
  this.name = name;
  this.taskQueue = taskQueue || [];
  this.color = 'red'
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

function Instruction(Opcode, Modifier, AMode, ANumber, BMode, BNumber) {
  this.Opcode = Opcode;
  this.Modifier = Modifier;
  this.AMode = AMode;
  this.ANumber = ANumber;
  this.BMode = BMode;
  this.BNumber = BNumber;
  this.warrior = undefined
}

Instruction.initial = new Instruction('DAT', 'F', '#', 0, '#', 0)

Instruction.prototype.background = function () {
  if (undefined === this.warrior) {
    return ''
  }
  return this.warrior.color
}

Instruction.prototype.isFree = function () {
  return this.warrior === undefined
}

Instruction.prototype.toString = function () {
  return this.Opcode + '.' + this.Modifier + ' ' + this.AMode + this.ANumber + ', ' + this.BMode + this.BNumber
}

Instruction.prototype.copy = function () {
  return new Instruction(this.Opcode, this.Modifier, this.AMode, this.ANumber, this.BMode, this.BNumber)
}

Instruction.prototype.isEqual = function (instruction) {
  return this.Opcode === instruction.Opcode &&
    this.Modifier == instruction.Modifier &&
    this.AMode == instruction.AMode &&
    this.ANumber == instruction.ANumber &&
    this.BMode == instruction.BMode &&
    this.BNumber == instruction.BNumber
}

function EMI94(W, PC, Core, M, ReadLimit, WriteLimit) {
  var IR, IRA, IRB, RPA, WPA, RPB, WPB, PIP;

  IR = Core[PC].copy();

  if (IR.AMode === '#') {
    RPA = WPA = 0;
  } else {
    RPA = Fold(IR.ANumber, ReadLimit, M);
    WPA = Fold(IR.ANumber, WriteLimit, M);

    if (IR.AMode != '$') {
      if (IR.AMode === '<') {
        Core[((PC + WPA) % M)].BNumber = (Core[((PC + WPA) % M)].BNumber + M - 1) % M;
      }
      if (IR.AMode === '>') {
        PIP = (PC + WPA) % M;
      }
      RPA = Fold((RPA + Core[((PC + RPA) % M)].BNumber), ReadLimit, M);
      WPA = Fold((WPA + Core[((PC + WPA) % M)].BNumber), WriteLimit, M);
    }
  }

  IRA = Core[((PC + RPA) % M)].copy();

  if (IR.AMode === '>') {
    Core[PIP].BNumber = (Core[PIP].BNumber + 1) % M;
  }

  if (IR.BMode === '#') {
    RPB = WPB = 0;
  } else {
    RPB = Fold(IR.BNumber, ReadLimit, M);
    WPB = Fold(IR.BNumber, WriteLimit, M);
    if (IR.BMode != '$') {
      if (IR.BMode === '<') {
        Core[((PC + WPB) % M)].BNumber = (Core[((PC + WPB) % M)].BNumber + M - 1) % M;
      } else if (IR.BMode === '>') {
        PIP = (PC + WPB) % M;
      }
      RPB = Fold((RPB + Core[((PC + RPB) % M)].BNumber), ReadLimit, M);
      WPB = Fold((WPB + Core[((PC + WPB) % M)].BNumber), WriteLimit, M);
    }
  }

  IRB = Core[((PC + RPB) % M)].copy();

  if (IR.BMode === '>') {
    Core[PIP].BNumber = (Core[PIP].BNumber + 1) % M;
  }


  switch (IR.Opcode) {
    case 'DAT':
      break;

    case 'MOV':
      switch (IR.Modifier) {
        case 'A':
          Core[((PC + WPB) % M)].ANumber = IRA.ANumber;
          break;

        case 'B':
          Core[((PC + WPB) % M)].BNumber = IRA.BNumber;
          break;

        case 'AB':
          Core[((PC + WPB) % M)].BNumber = IRA.ANumber;
          break;

        case 'BA':
          Core[((PC + WPB) % M)].ANumber = IRA.BNumber;
          break;

        case 'F':
          Core[((PC + WPB) % M)].ANumber = IRA.ANumber;
          Core[((PC + WPB) % M)].BNumber = IRA.BNumber;
          break;

        case 'X':
          Core[((PC + WPB) % M)].BNumber = IRA.ANumber;
          Core[((PC + WPB) % M)].ANumber = IRA.BNumber;
          break;

        case 'I':
          Core[((PC + WPB) % M)] = IRA;
          break;

        default:
          return(UNDEFINED);
          break;
      }

      Queue(W, ((PC + 1) % M));
      break;

    case 'ADD':
      switch (IR.Modifier) {
        case 'A':
          Core[((PC + WPB) % M)].ANumber = (IRB.ANumber + IRA.ANumber) % M;
          break;

        case 'B':
          Core[((PC + WPB) % M)].BNumber = (IRB.BNumber + IRA.BNumber) % M;
          break;

        case 'AB':
          Core[((PC + WPB) % M)].BNumber = (IRB.ANumber + IRA.BNumber) % M;
          break;

        case 'BA':
          Core[((PC + WPB) % M)].ANumber = (IRB.BNumber + IRA.ANumber) % M;
          break;

        case 'F':
        case 'I':
          Core[((PC + WPB) % M)].ANumber = (IRB.ANumber + IRA.ANumber) % M;
          Core[((PC + WPB) % M)].BNumber = (IRB.BNumber + IRA.BNumber) % M;
          break;

        case 'X':
          Core[((PC + WPB) % M)].BNumber = (IRB.ANumber + IRA.BNumber) % M;
          Core[((PC + WPB) % M)].ANumber = (IRB.BNumber + IRA.ANumber) % M;
          break;

        default:
          return UNDEFINED;
          break;
      }
      Queue(W, ((PC + 1) % M));
      break;

    case 'SUB':
      switch (IR.Modifier) {
        case 'A':
          Core[((PC + WPB) % M)].ANumber = (IRB.ANumber + M - IRA.ANumber) % M;
          break;

        case 'B':
          Core[((PC + WPB) % M)].BNumber = (IRB.BNumber + M - IRA.BNumber) % M;
          break;

        case 'AB':
          Core[((PC + WPB) % M)].BNumber = (IRB.ANumber + M - IRA.BNumber) % M;
          break;

        case 'BA':
          Core[((PC + WPB) % M)].ANumber = (IRB.BNumber + M - IRA.ANumber) % M;
          break;

        case 'F':
        case 'I':
          Core[((PC + WPB) % M)].ANumber = (IRB.ANumber + M - IRA.ANumber) % M;
          Core[((PC + WPB) % M)].BNumber = (IRB.BNumber + M - IRA.BNumber) % M;
          break;

        case 'X':
          Core[((PC + WPB) % M)].BNumber = (IRB.ANumber + M - IRA.BNumber) % M;
          Core[((PC + WPB) % M)].ANumber = (IRB.BNumber + M - IRA.ANumber) % M;
          break;

        default:
          return UNDEFINED;
          break;
      }
      Queue(W, ((PC + 1) % M));
      break;

    case 'MUL':
      switch (IR.Modifier) {
        case 'A':
          Core[((PC + WPB) % M)].ANumber = (IRB.ANumber * IRA.ANumber) % M;
          break;

        case 'B':
          Core[((PC + WPB) % M)].BNumber = (IRB.BNumber * IRA.BNumber) % M;
          break;

        case 'AB':
          Core[((PC + WPB) % M)].BNumber = (IRB.ANumber * IRA.BNumber) % M;
          break;

        case 'BA':
          Core[((PC + WPB) % M)].ANumber = (IRB.BNumber * IRA.ANumber) % M;
          break;

        case 'F':
        case 'I':
          Core[((PC + WPB) % M)].ANumber = (IRB.ANumber * IRA.ANumber) % M;
          Core[((PC + WPB) % M)].BNumber = (IRB.BNumber * IRA.BNumber) % M;
          break;

        case 'X':
          Core[((PC + WPB) % M)].BNumber = (IRB.ANumber * IRA.BNumber) % M;
          Core[((PC + WPB) % M)].ANumber = (IRB.BNumber * IRA.ANumber) % M;
          break;

        default:
          return UNDEFINED;
          break;
      }
      Queue(W, ((PC + 1) % M));
      break;

    case 'DIV':
      switch (IR.Modifier) {
        case 'A':
          if (IRA.ANumber != 0)
            Core[((PC + WPB) % M)].ANumber = IRB.ANumber / IRA.ANumber;
          break;

        case 'B':
          if (IRA.BNumber != 0) {
            Core[((PC + WPB) % M)].BNumber = IRB.BNumber / IRA.BNumber;
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'AB':
          if (IRA.ANumber != 0) {
            Core[((PC + WPB) % M)].BNumber = IRB.BNumber / IRA.ANumber;
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'BA':
          if (IRA.BNumber != 0) {
            Core[((PC + WPB) % M)].ANumber = IRB.ANumber / IRA.BNumber;
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'F':
        case 'I':
          if (IRA.ANumber != 0)
            Core[((PC + WPB) % M)].ANumber = IRB.ANumber / IRA.ANumber;
          if (IRA.BNumber != 0)
            Core[((PC + WPB) % M)].BNumber = IRB.BNumber / IRA.BNumber;
          if (!((IRA.ANumber === 0) || (IRA.BNumber === 0))) {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'X':
          if (IRA.ANumber != 0)
            Core[((PC + WPB) % M)].BNumber = IRB.BNumber / IRA.ANumber;
          if (IRA.BNumber != 0)
            Core[((PC + WPB) % M)].ANumber = IRB.ANumber / IRA.BNumber;
          if (!((IRA.ANumber === 0) || (IRA.BNumber === 0))) {
            Queue(W, ((PC + 1) % M));
          }
          break;

        default:
          return UNDEFINED;
          break;
      }
      break;

    case 'MOD':
      switch (IR.Modifier) {
        case 'A':
          if (IRA.ANumber != 0)
            Core[((PC + WPB) % M)].ANumber = IRB.ANumber % IRA.ANumber;
          break;

        case 'B':
          if (IRA.BNumber != 0) {
            Core[((PC + WPB) % M)].BNumber = IRB.BNumber % IRA.BNumber;
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'AB':
          if (IRA.ANumber != 0) {
            Core[((PC + WPB) % M)].BNumber = IRB.BNumber % IRA.ANumber;
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'BA':
          if (IRA.BNumber != 0) {
            Core[((PC + WPB) % M)].ANumber = IRB.ANumber % IRA.BNumber;
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'F':
        case 'I':
          if (IRA.ANumber != 0)
            Core[((PC + WPB) % M)].ANumber = IRB.ANumber % IRA.ANumber;
          if (IRA.BNumber != 0)
            Core[((PC + WPB) % M)].BNumber = IRB.BNumber % IRA.BNumber;
          if (!((IRA.ANumber === 0) || (IRA.BNumber === 0))) {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'X':
          if (IRA.ANumber != 0)
            Core[((PC + WPB) % M)].BNumber = IRB.BNumber % IRA.ANumber;
          if (IRA.BNumber != 0)
            Core[((PC + WPB) % M)].ANumber = IRB.ANumber % IRA.BNumber;
          if (!((IRA.ANumber === 0) || (IRA.BNumber === 0))) {
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
      switch (IR.Modifier) {
        case 'A':
        case 'BA':
          if (IRB.ANumber === 0) {
            Queue(W, RPA);
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'B':
        case 'AB':
          if (IRB.BNumber === 0) {
            Queue(W, RPA);
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'F':
        case 'X':
        case 'I':
          if ((IRB.ANumber === 0) && (IRB.BNumber === 0)) {
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
      switch (IR.Modifier) {
        case 'A':
        case 'BA':
          if (IRB.ANumber != 0) {
            Queue(W, RPA);
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'B':
        case 'AB':
          if (IRB.BNumber != 0) {
            Queue(W, RPA);
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'F':
        case 'X':
        case 'I':
          if ((IRB.ANumber != 0) || (IRB.BNumber != 0)) {
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
      switch (IR.Modifier) {
        case 'A':
        case 'BA':
          Core[((PC + WPB) % M)].ANumber = (Core[((PC + WPB) % M)].ANumber + M - 1) % M;
          IRB.ANumber -= 1;
          if (IRB.ANumber != 0) {
            Queue(W, RPA);
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'B':
        case 'AB':
          Core[((PC + WPB) % M)].BNumber = (Core[((PC + WPB) % M)].BNumber + M - 1) % M;
          IRB.BNumber -= 1;
          if (IRB.BNumber != 0) {
            Queue(W, RPA);
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'F':
        case 'X':
        case 'I':
          Core[((PC + WPB) % M)].ANumber = (Core[((PC + WPB) % M)].ANumber + M - 1) % M;
          IRB.ANumber -= 1;
          Core[((PC + WPB) % M)].BNumber = (Core[((PC + WPB) % M)].BNumber + M - 1) % M;
          IRB.BNumber -= 1;
          if ((IRB.ANumber != 0) || (IRB.BNumber != 0)) {
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
      switch (IR.Modifier) {
        case 'A':
          if (IRA.ANumber === IRB.ANumber) {
            Queue(W, ((PC + 2) % M));
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'B':
          if (IRA.BNumber === IRB.BNumber) {
            Queue(W, ((PC + 2) % M));
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'AB':
          if (IRA.ANumber === IRB.BNumber) {
            Queue(W, ((PC + 2) % M));
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'BA':
          if (IRA.BNumber === IRB.ANumber) {
            Queue(W, ((PC + 2) % M));
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'F':
          if ((IRA.ANumber === IRB.ANumber) &&
              (IRA.BNumber === IRB.BNumber)) {
            Queue(W, ((PC + 2) % M));
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'X':
          if ((IRA.ANumber === IRB.BNumber) &&
              (IRA.BNumber === IRB.ANumber)) {
            Queue(W, ((PC + 2) % M));
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'I':
          if ((IRA.Opcode === IRB.Opcode) &&
              (IRA.Modifier === IRB.Modifier) &&
              (IRA.AMode === IRB.AMode) &&
              (IRA.ANumber === IRB.ANumber) &&
              (IRA.BMode === IRB.BMode) &&
              (IRA.BNumber === IRB.BNumber)) {
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
      switch (IR.Modifier) {
        case 'A':
          if (IRA.ANumber < IRB.ANumber) {
            Queue(W, ((PC + 2) % M));
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'B':
          if (IRA.BNumber < IRB.BNumber) {
            Queue(W, ((PC + 2) % M));
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'AB':
          if (IRA.ANumber < IRB.BNumber) {
            Queue(W, ((PC + 2) % M));
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'BA':
          if (IRA.BNumber < IRB.ANumber) {
            Queue(W, ((PC + 2) % M));
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'F':
        case 'I':
          if ((IRA.ANumber < IRB.ANumber) &&
              (IRA.BNumber < IRB.BNumber)) {
            Queue(W, ((PC + 2) % M));
          } else {
            Queue(W, ((PC + 1) % M));
          }
          break;

        case 'X':
          if ((IRA.ANumber < IRB.BNumber) &&
              (IRA.BNumber < IRB.ANumber)) {
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
