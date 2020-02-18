var realRobot;
var camera;
var simController;

var linearOpMode = {
  waitForStart: function() {},
  opModeIsActive: function() {
    return true;
  },
};

var telemetry = {
  update: function() {}
};

function Robot() {
  // Lengths are in cm.

  // Radius: assume wheel is 100mm in diameter.
  // https://www.gobilda.com/3606-series-mecanum-wheel-set-bearing-supported-rollers-100mm-diameter/
  this.r = 5.0;
  // Center point to middle of wheels in z dimension (width).
  this.l1 = 6.0;
  // Center point to middle of wheels in x dimension (length).
  this.l2 = 16.8;

  // Maximum wheel linear speed (cm/s) (based on 3.73'/sec).
  // this.max_motor_linear_speed = 113.69;

  // Maximum wheel angular speed (rad/s) (based on 435 RPM * 2).
  // https://www.gobilda.com/strafer-chassis-kit/
  //this.max_motor_angular_speed = 91.11;

  // Maximum wheel angular speed (rad/s) based on 100 RPM.
  // https://www.pitsco.com/TETRIX-MAX-TorqueNADO-Motor-with-Encoder
  this.max_motor_angular_speed = 10.47;

  // Number of quadurature encoder ticks per revolution.
  this.quad_encoder_ticks = 1440;

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
  // Positive values correspond to positive motor rotation:
  //  right => moves the robot forward.
  //  left => moves the robot backard.
  // Order is FL, FR, BL, BR.
  this.omega = [0.0, 0.0, 0.0, 0.0];

  // Directions of each motor, either -1 or 1.
  // Relative to motor itself.
  // Right motors, positive direction moves the robot forward.
  // Left motors, positive direction moves the robot backward.
  this.direction = [1, 1, 1, 1];

  // Current tick count for each motor.
  this.encoder_ticks = [0.0, 0.0, 0.0, 0.0];
  // Target position for each motor.
  this.target_position = [null, null, null, null];
  // Mode of each motor.
  this.mode = ["RUN_WITHOUT_ENCODER",
               "RUN_WITHOUT_ENCODER",
               "RUN_WITHOUT_ENCODER",
               "RUN_WITHOUT_ENCODER"];
  // Busy flag for each motor.
  this.motorIsBusy = [false, false, false, false];

  // Multiplication vectors.
  // Positive values move the robot forward.
  this.vx_mult = [-1.0, 1.0, -1.0, 1.0];
  // Positive values move the robot to the right (XXX Is this correct?).
  this.vz_mult = [-1.0, -1.0, 1.0, 1.0];
  // XXX Check signs
  this.omega0_mult= [1/(this.l1 + this.l2),
                     1/(this.l1 + this.l2),
                     1/(this.l1 + this.l2),
                     1/(this.l1 + this.l2)];

  this.motor_names =["FLmotorAsDcMotor",
                     "FRmotorAsDcMotor",
                     "BLmotorAsDcMotor",
                     "BRmotorAsDcMotor"];

  // Points on the trail that the robot has traversed.
  this.trail_add_point = false;
  this.trail = [];

  this.setDirection = function(motor, dir) {
    var index = this.motor_names.indexOf(motor);
    if (index < 0) {
      return;
    }
    if (dir == "FORWARD") {
      this.direction[index] = 1;
    } else if (dir == "REVERSE") {
      this.direction[index] = -1;
    }
  };

  this.setMode = function(motor, mode) {
    console.log("Mode", motor, mode);
    var index = this.motor_names.indexOf(motor);
    if (index < 0) {
      return;
    }

    if (mode == "STOP_AND_RESET_ENCODER") {
      this.omega[index] = 0;
      this.encoder_ticks[index] = 0;
    } else if (mode == "RUN_TO_POSITION") {
      this.motorIsBusy[index] = true;
    }
    this.mode[index] = mode;
  };

  this.setTargetPosition = function(motor, position) {
    console.log("Target", motor, position);
    var index = this.motor_names.indexOf(motor);
    if (index < 0) {
      return;
    }
    this.target_position[index] = position;
  };

  this.setPower = function(motor, power) {
    console.log("Power", motor, power);
    var index = this.motor_names.indexOf(motor);
    if (index < 0) {
      return;
    }
    this.omega[index] = power * this.max_motor_angular_speed;

    // Potentially changing or direction, add a new point.
    this.trail_add_point = true;
  };

  this.isBusy = function(motor) {
    var index = this.motor_names.indexOf(motor);
    if (index < 0) {
      return false;
    }
    return this.motorIsBusy[index];
  };

  this.calculate_speed = function() {
    this.vx = 0;
    this.vz = 0;
    this.omega0 = 0;

    for (var i = 0; i < 4; i++) {
      this.vx += this.vx_mult[i] * this.omega[i] * this.direction[i];
      this.vz += this.vz_mult[i] * this.omega[i] * this.direction[i];
      this.omega0 += this.omega0_mult[i] * this.omega[i] * this.direction[i];
    }

    this.vx *= this.r / 4.0;
    this.vz *= this.r / 4.0;
    this.omega0 *= this.r / 4.0;
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

  this.update_encoders = function(delta_sec) {
    // Check for encoder state.
    for (var i = 0; i < 4; i++) {
      if (this.mode[i] == 'RUN_WITHOUT_ENCODER') {
        // Nothing to do, go to the next motor.
        continue;
      }
      var revs = this.omega[i] * this.direction[i] * delta_sec / ( 2 * Math.PI);
      this.encoder_ticks[i] += revs * this.quad_encoder_ticks;
      if (this.mode[i] == 'RUN_TO_POSITION') {
        // Don't worry about sign on the encoders.
        if (Math.abs(this.encoder_ticks[i]) >=
            Math.abs(this.target_position[i])) {
          console.log("Stopping!", i, this.target_position, this.encoder_ticks);
          // Mark the motor as not busy, and stop it.
          this.motorIsBusy[i] = false;
          this.omega[i] = 0.0;
        }
      }
    }
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
    this.update_encoders(delta_sec);
    this.update_trail();
  };
}

function Camera() {
  this.world_dom = document.getElementById('world');
  this.grid_dom = document.getElementById('world_grid');

  // Bounding box where the robot has been.
  this.min_x = 0;
  this.max_x = 0;
  this.min_y = 0;
  this.max_y = 0;

  // Last set of points for the camera.
  this.last_min_x = Infinity;
  this.last_max_x = -Infinity;
  this.last_min_y = Infinity;
  this.last_max_y = -Infinity;

  this.update = function(x, y) {
    var delta, width, height;
    var min_x, max_x, min_y, max_y;

    this.min_x = Math.min(this.min_x, x);
    this.max_x = Math.max(this.max_x, x);
    this.min_y = Math.min(this.min_y, y);
    this.max_y = Math.max(this.max_y, y);

    if (this.min_x < this.last_min_x ||
        this.max_x > this.last_max_x ||
        this.min_y < this.last_min_y ||
        this.max_y > this.last_max_y) {
      // We've exceed the previous bounds, compute new bounds.
      var center_x = (this.min_x + this.max_x) / 2;
      var center_y = (this.min_y + this.max_y) / 2;

      width = this.max_x - this.min_x;
      height = this.max_y - this.min_y;
      var half_length = Math.max(width, height) / 2;

      // Switch to local variables rather than updating the saved values.
      min_x = center_x - half_length;
      max_x = center_x + half_length;
      min_y = center_y - half_length;
      max_y = center_y + half_length;

      // Round to multiples of 10.
      min_x = Math.floor(min_x / 10) * 10;
      max_x = Math.ceil(max_x / 10) * 10;
      min_y = Math.floor(min_y / 10) * 10;
      max_y = Math.ceil(max_y / 10) * 10;

      // Add some padding.
      width = max_x - min_x + 20;
      height = max_y - min_y + 20;

      this.last_min_x = min_x - 10;
      this.last_max_x = max_x + 10;
      this.last_min_y = min_y - 10;
      this.last_max_y = max_y + 10;
    } else {
      // Reuse the existing bounds.
      min_x = this.last_min_x;
      max_x = this.last_max_x;
      min_y = this.last_min_y;
      max_y = this.last_max_y;

      width = max_x - min_x;
      height = max_y - min_y;
    }

    this.world_dom.setAttribute(
      'viewBox', `${min_x} ${min_y} ${width} ${height}`);
    this.grid_dom.setAttribute('x', min_x);
    this.grid_dom.setAttribute('y', min_y);
    this.grid_dom.setAttribute('width', width);
    this.grid_dom.setAttribute('height', height);
  };
}

function SimController() {
  this.time_secs = 0.0;
  this.last_timestamp = null;

  this.sleepCallback = null;
  this.sleepRemaining = 0;

  this.robot_dom = document.getElementById('robot');
  this.trail_dom = document.getElementById('robot_trail');

  this.myInterpreter = null;

  this.init = function() {
    // Generate the code.
    Blockly.JavaScript.addReservedWords('code');
    Blockly.JavaScript.addReservedWords('highlightBlock');
    Blockly.JavaScript.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
    var code = Blockly.JavaScript.workspaceToCode(workspace);
    this.myInterpreter = new Interpreter(code, initFunc);
    this.myInterpreter.appendCode('runOpMode();');
  };

  this.sleep = function(ms, callback) {
    this.sleepCallback = callback;
    this.sleepRemaining = ms;
  };

  this.handleAsync = function(delta) {
    // Handle sleep.
    if (this.sleepCallback) {
      this.sleepRemaining -= delta;
      if (this.sleepRemaining <= 0) {
        console.log("done sleeping");
        this.sleepCallback();
        this.sleepCallback = null;
        this.sleepRemaining = 0;
      }
    }
  };

  this.nextStep = function(timestamp) {
    var stop = window.requestAnimationFrame(this.nextStep.bind(this));

    if (!this.last_timestamp) {
      this.last_timestamp = timestamp;
    }
    // Don't use a delta larger than 16ms (60 fps).
    var delta = Math.min(timestamp - this.last_timestamp, 16);
    this.last_timestamp = timestamp;
    this.time_secs += delta / 1000;

    this.handleAsync(delta);

    // Run 10 instructions.  This should prevent getting half the motors set.
    for (var i = 0; i < 10; i++) {
      if (!this.myInterpreter.step()) {
        // It's done running, abort the next frame.
        window.cancelAnimationFrame(stop);
        // Stop highlighting blocks.
        workspace.highlightBlock(null);
        // Break out of the loop.
        break;
      }
    }

    // Update the robot.
    realRobot.update(delta);
    this.robot_dom.setAttribute('x', realRobot.x);
    this.robot_dom.setAttribute('y', realRobot.y);
    var deg = realRobot.angle * 180 / Math.PI;
    this.robot_dom.setAttribute('transform',
        `rotate(${deg} ${realRobot.x} ${realRobot.y}) translate(-1 -0.5)`);

    update_trail(this.trail_dom);
    camera.update(realRobot.x, realRobot.y);
  };
}

var createDcMotor = function(interpreter, scope, name) {
  var motor = interpreter.nativeToPseudo({});
  interpreter.setProperty(scope, name, motor);

  interpreter.setProperty(motor, 'name', name);

  var setDirection = function(dir) {
    realRobot.setDirection(name, dir);
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

  var setMode = function(mode) {
    realRobot.setMode(name, mode);
  };
  interpreter.setProperty(motor, 'setMode',
      interpreter.createNativeFunction(setMode));

  var setDualMode = function(self_mode, other, other_mode) {
    realRobot.setMode(name, self_mode);
    realRobot.setMode(other.properties.name, other_mode);
  };
  interpreter.setProperty(motor, 'setDualMode',
      interpreter.createNativeFunction(setDualMode));

  var setTargetPosition = function(position) {
    realRobot.setTargetPosition(name, position);
  };
  interpreter.setProperty(motor, 'setTargetPosition',
      interpreter.createNativeFunction(setTargetPosition));

  var setDualTargetPosition = function(self_position, other, other_position) {
    realRobot.setTargetPosition(name, self_position);
    realRobot.setTargetPosition(other.properties.name, other_position);
  };
  interpreter.setProperty(motor, 'setDualTargetPosition',
      interpreter.createNativeFunction(setDualTargetPosition));

  var isBusy = function() {
    return realRobot.isBusy(name);
  };
  interpreter.setProperty(motor, 'isBusy',
      interpreter.createNativeFunction(isBusy));
};

var initFunc = function(interpreter, scope) {
  var lom = interpreter.nativeToPseudo(linearOpMode);
  interpreter.setProperty(scope, 'linearOpMode', lom);
  var sleep = function(ms, callback) {
    console.log("sleep", ms);
    simController.sleep(ms, callback);
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
  realRobot = new Robot();
  camera = new Camera();
  simController = new SimController;

  simController.init();

  // Start the simulation.
  window.requestAnimationFrame(simController.nextStep.bind(simController));
}

