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

  // Points on the trail that the robot has traversed.
  this.trail_add_point = false;
  this.trail = [];

  this.setPower = function(motor, power) {
    console.log(motor, power);
    var index = this.motor_names.indexOf(motor);
    if (index < 0) {
      return;
    }
    this.omega[index] = power * this.max_motor_angular_speed;

    // Potentially changing or direction, add a new point.
    this.trail_add_point = true;
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
    var nx = (dz * Math.cos(this.angle)) - (dx * Math.sin(this.angle));
    var ny = (dz * Math.sin(this.angle)) + (dx * Math.cos(this.angle));

    this.x += nx;
    this.y += ny;
    this.angle += dO;
  };

  this.update_trail = function() {
    if (this.trail_add_point) {
      this.trail_add_point = false;
    } else {
      this.trail.pop();
    }
    this.trail.push([this.x, this.y]);
  };

  this.update = function(delta) {
    var delta_sec = delta / 1000;

    this.calculate_speed();
    this.calculate_position(delta_sec);
    this.update_trail();
  };
}

var realRobot = new Robot();

function Camera() {
  this.world_dom = document.getElementById('world');
  this.grid_dom = document.getElementById('world_grid');

  // Bounding box where the robot has been.
  this.min_x = 0;
  this.max_x = 0;
  this.min_y = 0;
  this.max_y = 0;

  this.update = function(x, y) {
    var delta, width, height, first, second;

    this.min_x = Math.min(this.min_x, x);
    this.max_x = Math.max(this.max_x, x);
    this.min_y = Math.min(this.min_y, y);
    this.max_y = Math.max(this.max_y, y);

    width = this.max_x - this.min_x;
    height = this.max_y - this.min_y;

    // Preserve the aspect ratio.
    if (width > height) {
      delta = width - height;
      first = Math.floor(delta / 20) * 10;
      second = delta - first;
      this.min_y -= first;
      this.max_y += second;
    } else if (height > width) {
      delta = height - width;
      first = Math.floor(delta / 20) * 10;
      second = delta - first;
      this.min_x -= first;
      this.max_x += second;
    }

    // Round to multiples of 10.
    this.min_x = Math.floor(this.min_x / 10) * 10;
    this.max_x = Math.ceil(this.max_x / 10) * 10;
    this.min_y = Math.floor(this.min_y / 10) * 10;
    this.max_y = Math.ceil(this.max_y / 10) * 10;

    // Add some padding.
    width = this.max_x - this.min_x + 20;
    height = this.max_y - this.min_y + 20;

    this.world_dom.setAttribute(
      'viewBox', `${this.min_x - 10} ${this.min_y - 10} ${width} ${height}`);
    this.grid_dom.setAttribute('x', this.min_x - 10);
    this.grid_dom.setAttribute('y', this.min_y - 10);
    this.grid_dom.setAttribute('width', width);
    this.grid_dom.setAttribute('height', height);
  };
}

var camera = new Camera();

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

  var highlightBlock = function(id) {
    workspace.highlightBlock(id);
  };
  interpreter.setProperty(scope, 'highlightBlock',
      interpreter.createNativeFunction(highlightBlock));
};

function update_trail(dom) {
  // XXX Are arrow functions portable?
  var points = realRobot.trail.map(p => `L ${p[0]} ${p[1]}`);
  dom.setAttribute('d', "M 0 0 " + points.join(' '));
}

function runSimulator() {
  var robot_dom = document.getElementById('robot');
  var trail_dom = document.getElementById('robot_trail');

  Blockly.JavaScript.addReservedWords('code');
  Blockly.JavaScript.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
  Blockly.JavaScript.addReservedWords('highlightBlock');
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
      // Stop highlighting blocks.
      workspace.highlightBlock(null);
    } else {
      // Update the robot.
      realRobot.update(delta);
      robot_dom.setAttribute('x', realRobot.x);
      robot_dom.setAttribute('y', realRobot.y);

      update_trail(trail_dom);
      camera.update(realRobot.x, realRobot.y);
    }

  }
  window.requestAnimationFrame(nextStep);
}

