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
  step: undefined,
  reboot: undefined,
  stop: undefined,

  init: function (controller) {
    buttons.start = document.getElementById("mars-start");
    buttons.step = document.getElementById("mars-step");
    buttons.reboot = document.getElementById("mars-reboot");
    buttons.stop = document.getElementById("mars-stop");

    buttons.start.addEventListener("click", function () {
      controller.start();
      buttons.hide("start", "step", "reboot");
      buttons.show("stop");
      warriors.disable();
    });

    buttons.step.addEventListener("click", function () {
      controller.step();
    });

    buttons.reboot.addEventListener("click", function () {
      controller.reboot();
    });

    buttons.stop.addEventListener("click", function () {
      controller.stop();
      buttons.show("start", "step", "reboot");
      buttons.hide("stop");
      warriors.enable();
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
    warriors.disable();

    reader.addEventListener("load", function (e) {
      var source = e.target.result;
      var name = baseName(file.name);
      var opcodes = mars.compiler.compileProgram(source);

      mars.display.placeWarrior(opcodes.length, function (offset) {
        var warrior = new corewar.Warrior(name, opcodes, offset);
        warriors.add(warrior);
        buttons.enable();
        warriors.enable();
      });
    });

    reader.readAsText(file);
  },
  add: function (warrior) {
    var li = document.createElement("LI");
    var strong = document.createElement("STRONG");
    strong.appendChild(document.createTextNode(warrior.name));
    li.appendChild(strong);
    li.appendChild(document.createTextNode(" "));
    var button = document.createElement("BUTTON");
    button.className = "btn btn-mini btn-danger";
    button.appendChild(document.createTextNode("Kill"));
    button.addEventListener("click", function () {
      li.parentNode.removeChild(li);
      mars.controller.kill(warrior);
    });
    li.appendChild(button);
    warriors.list.appendChild(li);

    mars.controller.spawn(warrior);
  },
  enable: function () {
    warriors.file.disabled = false;

    var buttons = warriors.list.getElementsByTagName("BUTTON");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = false;
    }
  },
  disable: function () {
    warriors.file.disabled = true;

    var buttons = warriors.list.getElementsByTagName("BUTTON");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
    }
  }
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
