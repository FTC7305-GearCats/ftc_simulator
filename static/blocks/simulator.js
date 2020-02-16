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
  this.max_motor_linear_speed = 113.69;

  // Maximum wheel angular speed (rad/s) (based on 435 RPM * 2).
  this.max_motor_angular_speed = 91.11;

  // Position/orientation in the svg world.
  this.x = 0;
  this.y = 0;
  // In radians, positve is clockwise.
  this.angle = 0;

  // Velocities relative to the robot.
  // x positive is forward.
  // z positive is to the right.
  // omega0 positive is counter clockwise.
  this.vx = 0;
  this.vz = 0;
  this.omega0 = 0;

  // Angular velocities of the wheels.
  // Positive values correspond to moving the robot forward.
  // Values are FL, FR, BL, BR.
  this.omega = [0.0, 0.0, 0.0, 0.0];

  // Multiplication vectors.
  this.vx_mult = [1.0, 1.0, 1.0, 1.0];
  this.vz_mult = [1.0, -1.0, -1.0, 1.0];
  this.omega0_mult= [-1/(this.l1 + this.l2),
                     1/(this.l1 + this.l2),
                     -1/(this.l1 + this.l2),
                     1/(this.l1 + this.l2)];

  this.motor_names =["FLmotorAsDcMotor",
                     "FRmotorAsDcMotor",
                     "BLmotorAsDcMotor",
                     "BRmotorAsDcMotor"];

  this.setPower = function(motor, power) {
    console.log(motor, power);
    var index = this.motor_names.indexOf(motor);
    if (index < 0) {
      return;
    }
    this.omega[index] = power * this.max_motor_angular_speed;
  };

  this.calculate_speed = function() {
    this.vx = 0;
    this.vz = 0;
    this.omega0 = 0;

    for (var i = 0; i < 4; i++) {
      this.vx += this.vx_mult[i] * this.omega[i];
      this.vz += this.vz_mult[i] * this.omega[i];
      this.omega0 += this.omega0_mult[i] * this.omega[i];
    }

    this.vx *= this.r / 4.0;
    this.vz *= this.r / 4.0;
    this.omega0 *= this.r / 40.0;
  };

  this.calculate_position = function(delta_sec) {
    // First calculate distances in robot coordinates.
    var dx = this.vx * delta_sec;
    var dz = this.vz * delta_sec;
    var dO = this.omega0 * delta_sec;

    // Now convert to svg coordinates by rotating.
    var nx = (dx * Math.cos(this.angle)) - (dz * Math.sin(this.angle));
    var ny = (dx * Math.sin(this.angle)) + (dz * Math.cos(this.angle));

    this.x += nx;
    this.y += ny;
    this.angle += dO;

    console.log(this.x, this.y);
  };

  this.update = function(delta) {
    var delta_sec = delta / 1000;

    this.calculate_speed();
    this.calculate_position(delta_sec);
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

  var robot_dom = document.getElementById('robot');

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
    } else {
      // Update the robot.
      realRobot.update(delta);
      robot_dom.setAttribute('x', realRobot.x);
      robot_dom.setAttribute('y', realRobot.y);
    }

  }
  window.requestAnimationFrame(nextStep);
}

