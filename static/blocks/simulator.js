var last = null;
var sleepCallback = null;
var sleepRemaining = 0;

var linearOpMode = {
  waitForStart: function() {},
  opModeIsActive: function() {
    return true;
  },
};

function DcMotor(name) {
  this.name = name;

  this.setDirection = function(dir) {
    this.direction = dir;
  };

  this.setPower = function(power) {
    this.power = power;
  };

  this.setDualPower = function(self_power, other, other_power) {
    this.setPower(self_power);
    other.setPower(other_power);
  };
};

var telemetry = {
  update: function() {}
};

function Robot() {
  this.setPower = function(motor, power) {
    console.log(motor, power);
  };
}

var realRobot = new Robot();

var createDcMotor = function(interpreter, scope, name) {
  var motor = interpreter.nativeToPseudo({});
  interpreter.setProperty(scope, name, motor);

  interpreter.setProperty(motor, 'name', name);

  var setDirection = function(dir) {
    console.log("setDirection");
  };
  interpreter.setProperty(motor, 'setDirection',
      interpreter.createNativeFunction(setDirection));

  var setPower = function(power) {
    realRobot.setPower(name, power);
  };
  interpreter.setProperty(motor, 'setPower',
      interpreter.createNativeFunction(setPower));

  var setDualPower = function(self_power, other, other_power) {
    realRobot.setPower(name, self_power);
    realRobot.setPower(other.properties.name, other_power);
  };
  interpreter.setProperty(motor, 'setDualPower',
      interpreter.createNativeFunction(setDualPower));
};

var initFunc = function(interpreter, scope) {
  var lom = interpreter.nativeToPseudo(linearOpMode);
  interpreter.setProperty(scope, 'linearOpMode', lom);
  var sleep = function(ms, callback) {
    console.log("sleep", ms);
    sleepCallback = callback;
    sleepRemaining = ms;
  };
  interpreter.setProperty(lom, 'sleep',
      interpreter.createAsyncFunction(sleep));

  var tel = interpreter.nativeToPseudo(telemetry);
  interpreter.setProperty(scope, 'telemetry', tel);

  createDcMotor(interpreter, scope, "FLmotorAsDcMotor");
  createDcMotor(interpreter, scope, "FRmotorAsDcMotor");
  createDcMotor(interpreter, scope, "BLmotorAsDcMotor");
  createDcMotor(interpreter, scope, "BRmotorAsDcMotor");
};

function runSimulator() {
  Blockly.JavaScript.addReservedWords('code');
  var code = Blockly.JavaScript.workspaceToCode(workspace);
  var myInterpreter = new Interpreter(code, initFunc);
  myInterpreter.appendCode('runOpMode();');

  function nextStep(timestamp) {
    var stop = window.requestAnimationFrame(nextStep);

    if (!last) {
      last = timestamp;
    }
    var delta = timestamp - last;
    last = timestamp;
    if (sleepCallback) {
      sleepRemaining -= delta;
      if (sleepRemaining <= 0) {
        console.log("done sleeping");
        sleepCallback();
        sleepCallback = null;
        sleepRemaining = 0;
      }
    }
    if (!myInterpreter.step()) {
      // It's done running, abort the next frame.
      window.cancelAnimationFrame(stop);
    }
  }
  window.requestAnimationFrame(nextStep);
}

