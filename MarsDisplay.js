// Display a MARS in an HTML table.
function MarsDisplay(mars, containerId, width, height, colors) {
  this.mars = mars;
  this.width = width;
  this.height = height;
  this.tds = [];
  this.colors = colors || {};
  this.programColors = [ "#773F9E", "#B0CE21", "#C426D1", "#EF1E40", "#FFCC00", "#FF3300" ];

  var that = this;

  var table = document.createElement("TABLE");
  table.className = "mars";
  table.addEventListener("mouseover", function (e) {
    if ("TD" !== e.target.tagName || undefined === that._placing) {
      return;
    }

    var offset = parseInt(e.target.dataset.offset);
    for (var i = 0; i < that._placing.length; i++) {
      that.highlight(offset + i);
    }
  });
  table.addEventListener("mouseout", function (e) {
    if ("TD" !== e.target.tagName || undefined === that._placing) {
      return;
    }

    var offset = parseInt(e.target.dataset.offset);
    for (var i = 0; i < that._placing.length; i++) {
      that.unhighlight(offset + i);
    }
  });
  table.addEventListener("click", function (e) {
    if ("TD" !== e.target.tagName || undefined === that._placing) {
      return;
    }

    var offset = parseInt(e.target.dataset.offset);
    for (var i = 0; i < that._placing.length; i++) {
      that.unhighlight(offset + i);
    }

    that._placing.handler(parseInt(e.target.dataset.offset));
    delete that._placing;
  });

  for (var j = 0; j < height; j++) {
    var tr = document.createElement("TR");
    for (var i = 0; i < width; i++) {
      var td = document.createElement("TD");
      td.dataset["offset"] = j * height + i;
      this.tds.push(td);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  this.updateAll();

  document.getElementById(containerId).appendChild(table);
}

// Update the display of all memory locations.
MarsDisplay.prototype.updateAll = function () {
  for (var i = 0; i < this.width * this.height; i++) {
    this.updateAt(i);
  }
};

// Generate a program color.
MarsDisplay.prototype.generateProgramColor = function () {
  if (this.programColors.length > 1) {
    return this.programColors.shift();
  } else {
    return this.programColors[0];
  }
};

// Update the display of a memory location.
MarsDisplay.prototype.updateAt = function (offset) {
  var td = this.tds[offset];

  td.style.backgroundColor = "";

  if (this.mars.core[offset].opcode === "DAT") {
    addClass(td, "opcode-dat");
  } else {
    removeClass(td, "opcode-dat");
  }

  var process = this.mars.getProcessAt(offset);
  if (process !== undefined) {
    if (!this.colors.hasOwnProperty(process.id)) {
      this.colors[process.id] = this.generateProgramColor();
    }
    td.style.backgroundColor = this.colors[process.id];
  }
};

// Highlight a cell.
MarsDisplay.prototype.highlight = function (offset) {
  addClass(this.tds[this.mars.offset(offset)], "highlight");
};

// Unhighlight a cell.
MarsDisplay.prototype.unhighlight = function (offset) {
  removeClass(this.tds[this.mars.offset(offset)], "highlight");
};

// Select a place for a warrior.
MarsDisplay.prototype.placeWarrior = function (length, handler) {
  this._placing = { length: length, handler: handler };
};

// Check if an element has a given class.
function hasClass(element, className) {
  return element.className.match("\\b" + className + "\\b") !== null;
}

// Add a class to an element.
function addClass(element, className) {
  if (!hasClass(element, className)) {
    element.className += " " + className;
  }
}

// Remove a class from an element.
function removeClass(element, className) {
  if (hasClass(element, className)) {
    element.className = element.className.replace(new RegExp(" " + className + "\\b"), "");
  }
}
