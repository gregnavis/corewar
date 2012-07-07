var mars = {
  mars: undefined,
  compiler: undefined,
  display: undefined,
  controller: undefined,

  init: function () {
    mars.mars = new corewar.Mars(50 * 50, 10000);
    mars.compiler = new corewar.Compiler(mars.mars);
    mars.display = new MarsDisplay(mars.mars, "mars-display", 50, 50);
    mars.controller = new MarsController(mars.mars, mars.display);
  },
};

var buttons = {
  start: undefined,
  stop: undefined,
  reboot: undefined,

  init: function (controller) {
    buttons.start = document.getElementById("mars-start");
    buttons.stop = document.getElementById("mars-stop");
    buttons.reboot = document.getElementById("mars-reboot");

    buttons.start.addEventListener("click", function () {
      controller.start();
      buttons.hide("start", "reboot");
      buttons.show("stop");
    });

    buttons.stop.addEventListener("click", function () {
      controller.stop();
      buttons.show("start", "reboot");
      buttons.hide("stop");
    });

    buttons.reboot.addEventListener("click", function () {
      controller.reboot();
    });

    buttons.hide("stop");
  },
  show: function () {
    for (var i = 0; i < arguments.length; i++) {
      var name = arguments[i];
      buttons[name].style.display = "";
    }
  },
  hide: function () {
    for (var i = 0; i < arguments.length; i++) {
      var name = arguments[i];
      buttons[name].style.display = "none";
    }
  },
  enable: function () {
    buttons.start.disabled = false;
    buttons.stop.disabled = false;
    buttons.reboot.disabled = false;
  },
  disable: function () {
    buttons.start.disabled = true;
    buttons.stop.disabled = true;
    buttons.reboot.disabled = true;
  },
};

var warriors = {
  file: undefined,
  list: undefined,

  init: function () {
    warriors.list = document.getElementById("warriors");
    warriors.file = document.getElementById("file");
  },
  load: function () {
    var file = warriors.file.files[0];
    var reader = new FileReader();

    buttons.disable();

    reader.addEventListener("load", function (e) {
      var source = e.target.result;
      var name = baseName(file.name);
      var opcodes = mars.compiler.compileProgram(source);

      mars.display.highlight(opcodes.length, function (offset) {
        var warrior = new corewar.Warrior(name, opcodes, offset);
        warriors.add(warrior);
        mars.display.unhighlight();
        buttons.enable();
      });
    });

    reader.readAsText(file);
  },
  add: function (warrior) {
    var li = document.createElement("LI");
    var strong = document.createElement("STRONG");
    strong.appendChild(document.createTextNode(warrior.name));
    li.appendChild(strong);
    warriors.list.appendChild(li);

    mars.controller.spawn(warrior);
  },
};

function baseName(path) {
  var matches = path.match(/^(?:.*\/)?(.*)/);
  return matches[1];
}

function init() {
  mars.init();
  buttons.init(mars.controller);
  warriors.init();
}
