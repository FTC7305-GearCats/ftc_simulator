// simulator time in ms.
var simulatorTime = 0;

function getSimulatorTime() {
  return simulatorTime;
}

var linearOpMode = {
  waitForStart: function() {},
  opModeIsActive: function() {
    return true;
  },
  sleep: function(ms) {
    // XXX
    console.log("sleep", ms);
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


  function nextStep() {
    if (myInterpreter.step()) {
      window.setTimeout(nextStep, 10);
    }
  }
  nextStep();
}

