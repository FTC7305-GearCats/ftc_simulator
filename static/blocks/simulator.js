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
  // Lengths are in cm.

  // Radius: assume wheel is 100mm in diameter.
  this.r = 5.0;
  // Center point to middle of wheels in z dimension (width).
  this.l1 = 6.0;
  // Center point to middle of wheels in x dimension (length).
  this.l2 = 16.8;

  // Maximum wheel linear speed (cm/s) (based on 3.73'/sec).
  self.max_motor_linear_speed = 113.69;

  // Maximum wheel angular speed (rad/s) (based on 435 RPM * 2).
  self.max_motor_angular_speed = 91.11;

  // Position in the svg world.
  this.x = 0;
  this.y = 0;

  // Velocities relative to the robot.
  // x positive is forward.
  // z positive is to the right.
  // omega0 positive is counter clockwise.
  this.vx = 0;
  this.vy = 0;
  this.omega0 = 0;

  // Angular velocities of the wheels.
  // Positive values correspond to moving the robot forward.
  // Values are FL, FR, BL, BR.
  this.omega = [0.0, 0.0, 0.0, 0.0];

  // Multiplication vectors.
  this.vx_mult = [1.0, 1.0, 1.0, 1.0];
  this.vz_mult = [1.0, -1.0, -1.0, 1.0];
  this.omega0_mult= [-1/(self.l1 + self.l2),
                     1/(self.l1 + self.l2),
                     -1/(self.l1 + self.l2),
                     1/(self.l1 + self.l2)];

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
  document.getElementById('simulatorModal').style.display = 'block';

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

