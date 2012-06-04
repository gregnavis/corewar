// Display a MARS in an HTML table.
function MarsDisplay(mars, containerId, previewId, width, height, colors) {
  this.mars = mars;
  this.width = width;
  this.height = height;
  this.tds = [];
  this.colors = colors || {};
  this.programColors = [ "#773F9E", "#B0CE21", "#C426D1", "#EF1E40", "#FFCC00", "#FF3300" ];

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

  td.className = "mars-cell ";
  if (this.mars.core[offset].opcode === "DAT") {
    td.className += "mars-dat";
  }

  var process = this.mars.getProcessAt(offset);
  if (process !== undefined) {
    if (!this.colors.hasOwnProperty(process.owner)) {
      this.colors[process.owner] = this.generateProgramColor();
    }
    td.style.backgroundColor = this.colors[process.owner];
  }
};
