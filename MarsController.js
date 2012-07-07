function MarsController(mars, display, interval) {
  this.mars = mars;
  this.display = display;
  this.interval = interval || 100;
  this.running = false;
}

MarsController.prototype.start = function () {
  if (this.running) {
    return;
  }

  var that = this;

  function handler() {
    if (!that.running) {
      return;
    }

    that.mars.step();
    that.display.updateAll();
    setTimeout(handler, that.interval);
  }

  this.running = true;
  setTimeout(handler, that.interval);
};

MarsController.prototype.stop = function () {
  this.running = false;
};

MarsController.prototype.reboot = function () {
  this.running = false;
  this.mars.reboot();
  this.display.updateAll();
};

MarsController.prototype.spawn = function (warrior) {
  this.mars.spawn(warrior);
  this.display.updateAll();
};

MarsController.prototype.kill = function (warrior) {
  this.mars.kill(warrior);
  this.display.updateAll();
}
