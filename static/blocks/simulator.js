var realRobot;
var camera;
var simController;

var linearOpMode = {
  waitForStart: function() {
    self._startTime = Date.now();
    console.log(self._startTime);
  },
  opModeIsActive: function() {
    return true;
  },
  getRuntime: function() {
    const now = Date.now();
    const delta = (now - self._startTime) / 1000;
    return delta;
  },
};

var telemetry = {
  update: function() {},
  // XXX This should really show up on the screen, maybe even a graph.
  addNumericData: function(name, value) {
    console.log("telemetry", name, value);
  },
  // XXX Why is this not inside telemetry?
  addTextData: function(name, value) {
    console.log("telemetry", name, value);
  }
};

function Gamepad() {
  this.gamepads = {};

  /* Probably only useful on firefox.
  window.addEventListener("gamepadconnected", function(e) {
    console.log("Gamepad connected");
    gamepadController.gamepad = e.gamepad;
  });

  window.addEventListener("gamepaddisconnected", function(e) {
    console.log("Gamepad disconnected");
    gamepadController.gamepad = null;
  });
  */

  this.poll = function() {
    // XXX Handle disconnecting.
    var all_gamepads = navigator.getGamepads();
    for (var i = 0; i < all_gamepads.length; i++) {
      if (all_gamepads[i]) {
        // XXX Handle multiple controllers.
        this.gamepads["gamepad1"] = all_gamepads[i];
        break;
      }
    }
  };

  // Mapping of buttons/axes.
  // https://w3c.github.io/gamepad/#remapping

  // Test pages
  // https://luser.github.io/gamepadtest/
  // https://html5gamepad.com/

  this.getAxis = function(name, index) {
    var gamepad = this.gamepads[name];
    if (!gamepad) {
      return 0;
    }
    return gamepad.axes[index];
  };

  this.getLeftStickX = function(name) {
    return this.getAxis(name, 0);
  };

  this.getLeftStickY = function(name) {
    return this.getAxis(name, 1);
  };

  this.getRightStickX = function(name) {
    return this.getAxis(name, 2);
  };

  this.getRightStickY = function(name) {
    return this.getAxis(name, 3);
  };

  this.getButtonValue = function(name, index) {
    this.getAxis(name, 3);
    var gamepad = this.gamepads[name];
    if (!gamepad) {
      return 0;
    }
    return gamepad.buttons[index].value;
  };

  this.getLeftTrigger = function(name) {
    return this.getButtonValue(name, 6);
  };

  this.getRightTrigger = function(name) {
    return this.getButtonValue(name, 7);
  };

  this.getButtonPressed = function(name, index) {
    var gamepad = this.gamepads[name];
    if (!gamepad) {
      return false;
    }
    return gamepad.buttons[index].pressed;
  };

  this.getA = function(name) {
    return this.getButtonPressed(name, 0);
  };

  this.getB = function(name) {
    return this.getButtonPressed(name, 1);
  };

  this.getX = function(name) {
    return this.getButtonPressed(name, 2);
  };

  this.getY = function(name) {
    return this.getButtonPressed(name, 3);
  };

  this.getLeftBumper = function(name) {
    return this.getButtonPressed(name, 4);
  };

  this.getRightBumper = function(name) {
    return this.getButtonPressed(name, 5);
  };

  // 6 and 7 are the triggers, not treated as buttons.

  this.getBack = function(name) {
    return this.getButtonPressed(name, 8);
  };

  this.getStart = function(name) {
    return this.getButtonPressed(name, 9);
  };

  this.getLeftStickButton = function(name) {
    return this.getButtonPressed(name, 10);
  };

  this.getRightStickButton = function(name) {
    return this.getButtonPressed(name, 11);
  };

  this.getDpadUp = function(name) {
    return this.getButtonPressed(name, 12);
  };

  this.getDpadDown = function(name) {
    return this.getButtonPressed(name, 13);
  };

  this.getDpadLeft = function(name) {
    return this.getButtonPressed(name, 14);
  };

  this.getDpadRight = function(name) {
    return this.getButtonPressed(name, 15);
  };

  this.getGuide = function(name) {
    // Not implemented in html5.
    return false;
  };

  this.getAtRest = function(name) {
    // "Returns true if all analog sticks and triggers are in their
    //  rest position."
    var i;

    var gamepad = this.gamepads[name];
    if (!gamepad) {
      return 0;
    }
    // Analog joysticks.
    for (i = 0; i < gamepad.axes.length; i++) {
      if (Math.abs(gamepad.axes[i]) > 0.05) {
        console.log(i, gamepad.axes[i]);
        return false;
      }
    }
    // Triggers.
    for (i = 6; i < 8; i++) {
      if (gamepad.buttons[i].value != 0) {
        return false;
      }
    }
    return true;
  };
};

function Keyboard() {
  this.keysPressed = {};

  this.handleKeyDown = function(e) {
    this.keysPressed[e.code] = true;
  };

  this.handleKeyUp = function(e) {
    this.keysPressed[e.code] = false;
  };

  document.addEventListener('keydown', this.handleKeyDown.bind(this));
  document.addEventListener('keyup', this.handleKeyUp.bind(this));

  this.poll = function() {
    // Look for a gamepad and switch if it shows up.
    var all_gamepads = navigator.getGamepads();
    for (var i = 0; i < all_gamepads.length; i++) {
      if (all_gamepads[i]) {
        gamepadController = new Gamepad();
        gamepadController.poll();
        return;
      }
    }
  };

  this.getAnalog = function(fk, sk) {
    var value = 0;
    if (this.keysPressed[fk]) {
      value -= 1;
    }
    if (this.keysPressed[sk]) {
      value += 1;
    }
    return value;
  };

  this.getLeftStickX = function(name) {
    return this.getAnalog("KeyA", "KeyD");
  };

  this.getLeftStickY = function(name) {
    return this.getAnalog("KeyW", "KeyS");
  };

  this.getRightStickX = function(name) {
    return this.getAnalog("ArrowLeft", "ArrowRight");
  };

  this.getRightStickY = function(name) {
    return this.getAnalog("ArrowUp", "ArrowDown");
  };

  this.getLeftTrigger = function(name) {
    return this.getAnalog("DoesNotExist", "ShiftLeft");
  };

  this.getRightTrigger = function(name) {
    return this.getAnalog("DoesNotExist", "ShiftRight");
  };

  this.getA = function(name) {
    return this.keysPressed["KeyK"] || false;
  };

  this.getB = function(name) {
    return this.keysPressed["KeyL"] || false;
  };

  this.getX = function(name) {
    return this.keysPressed["KeyJ"] || false;
  };

  this.getY = function(name) {
    return this.keysPressed["KeyI"] || false;
  };

  this.getLeftBumper = function(name) {
    return this.keysPressed["KeyQ"] || false;
  };

  this.getRightBumper = function(name) {
    return this.keysPressed["KeyE"] || false;
  };

  // 6 and 7 are the triggers, not treated as buttons.

  this.getBack = function(name) {
    return this.keysPressed["Digit1"] || false;
  };

  this.getStart = function(name) {
    return this.keysPressed["Digit3"] || false;
  };

  this.getLeftStickButton = function(name) {
    return this.keysPressed["KeyX"] || false;
  };

  this.getRightStickButton = function(name) {
    return this.keysPressed["Slash"] || false;
  };

  this.getDpadUp = function(name) {
    return this.keysPressed["KeyT"] || false;
  };

  this.getDpadDown = function(name) {
    return this.keysPressed["KeyG"] || false;
  };

  this.getDpadLeft = function(name) {
    return this.keysPressed["KeyF"] || false;
  };

  this.getDpadRight = function(name) {
    return this.keysPressed["KeyH"] || false;
  };

  this.getGuide = function(name) {
    return this.keysPressed["Digit2"] || false;
  };

  this.getAtRest = function(name) {
    // "Returns true if all analog sticks and triggers are in their
    //  rest position."
    if (this.keysPressed["KeyA"] ||
        this.keysPressed["KeyD"] ||
        this.keysPressed["KeyW"] ||
        this.keysPressed["KeyS"] ||
        this.keysPressed["ArrowLeft"] ||
        this.keysPressed["ArrowRight"] ||
        this.keysPressed["ArrowUp"] ||
        this.keysPressed["ArrowDown"] ||
        this.keysPressed["ShiftRight"] ||
        this.keysPressed["ShiftLeft"]) {
      return false;
    }
    return true;
  };
};

var gamepadController = new Keyboard();

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
  this.angle = Math.PI;

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
  // Order is FL, FR, BL, BR plus extras Motor1, Motor2, Motor3.
  this.omega = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

  // Directions of each motor, either -1 or 1.
  // Relative to motor itself.
  // Right motors, positive direction moves the robot forward.
  // Left motors, positive direction moves the robot backward.
  this.direction = [1, 1, 1, 1, 1, 1, 1];

  // Current tick count for each motor.
  this.encoder_ticks = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
  // Target position for each motor.
  this.target_position = [null, null, null, null, null, null, null];
  // Mode of each motor.
  this.mode = ["RUN_WITHOUT_ENCODER",
               "RUN_WITHOUT_ENCODER",
               "RUN_WITHOUT_ENCODER",
               "RUN_WITHOUT_ENCODER",
               "RUN_WITHOUT_ENCODER",
               "RUN_WITHOUT_ENCODER",
               "RUN_WITHOUT_ENCODER"];
  // Busy flag for each motor.
  this.motorIsBusy = [false, false, false, false, false, false, false];

  // Multiplication vectors.
  // Positive values move the robot forward.
  this.vx_mult = [-1.0, 1.0, -1.0, 1.0];
  // Positive values move the robot to the right (XXX Is this correct?).
  this.vz_mult = [-1.0, -1.0, 1.0, 1.0];
  // XXX Check signs
  this.omega0_mult= [-1/(this.l1 + this.l2),
                     -1/(this.l1 + this.l2),
                     -1/(this.l1 + this.l2),
                     -1/(this.l1 + this.l2)];

  this.motor_names =["FLmotorAsDcMotor",
                     "FRmotorAsDcMotor",
                     "BLmotorAsDcMotor",
                     "BRmotorAsDcMotor",
                     "Motor1AsDcMotor",
                     "Motor2AsDcMotor",
                     "Motor3AsDcMotor"];

  // Servo config.

  // Picked a random servo:
  // 0.20 sec/60 degrees
  this.servo_speed = 60 / 0.20;

  // This must only be for continuous rotation servos.
  this.servo_direction = [1, 1];

  // Positions are in degrees.
  this.servo_commanded_position = [0.0, 0.0];
  this.servo_actual_position = [0.0, 0.0];

  this.servo_names = ["Servo1AsServo",
                      "Servo2AsServo"];

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

    // Remember that this block changed the power.
    simController.setPower = true;
  };

  this.isBusy = function(motor) {
    var index = this.motor_names.indexOf(motor);
    if (index < 0) {
      return false;
    }
    return this.motorIsBusy[index];
  };

  this.setServoDirection = function(servo, dir) {
    var index = this.servo_names.indexOf(servo);
    if (index < 0) {
      return;
    }
    if (dir == "FORWARD") {
      this.servo_direction[index] = 1;
    } else if (dir == "REVERSE") {
      this.servo_direction[index] = -1;
    }
  };

  this.setServoPosition = function(servo, target) {
    var index = this.servo_names.indexOf(servo);
    if (index < 0) {
      return;
    }
    this.servo_commanded_position[index] = target * 180.0;
  };

  this.getServoCommandedPosition = function(servo) {
    var index = this.servo_names.indexOf(servo);
    if (index < 0) {
      return 0;
    }
    return this.servo_commanded_position[index] / 180.0;
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

    // If the angle has changed, need to add a point.
    if (dO >= 0.001 || dO <= 0.001) {
      this.trail_add_point = true;
    }
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

  // Delta is in milliseconds.
  this.update_servos = function(delta_sec) {
    var delta = this.servo_speed * delta_sec;
    for (var i = 0; i < 2; i++) {
      if (this.servo_actual_position[i] < this.servo_commanded_position[i]) {
        this.servo_actual_position[i] += delta;
        this.servo_actual_position[i] = Math.min(
          this.servo_actual_position[i],
          this.servo_commanded_position[i],
          180.0);
        console.log(i, this.servo_actual_position[i], this.servo_commanded_position[i]);
      } else if (this.servo_actual_position[i] >
                 this.servo_commanded_position[i]) {
        this.servo_actual_position[i] -= delta;
        this.servo_actual_position[i] = Math.max(
          this.servo_actual_position[i],
          this.servo_commanded_position[i],
          0.0);
      }
    }
  };

  this.update = function(delta) {
    var delta_sec = delta / 1000;

    this.calculate_speed();
    this.calculate_position(delta_sec);
    this.update_encoders(delta_sec);
    this.update_trail();

    this.update_servos(delta_sec);
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
      width = max_x - min_x + 100;
      height = max_y - min_y + 100;

      this.last_min_x = min_x - 50;
      this.last_max_x = max_x + 50;
      this.last_min_y = min_y - 50;
      this.last_max_y = max_y + 50;
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
  this.servo1_dom = document.getElementById('servo1');
  this.servo2_dom = document.getElementById('servo2');

  this.asyncWait = false;

  this.myInterpreter = null;

  this.init = function() {
    // Generate the code.
    Blockly.JavaScript.addReservedWords('code');
    Blockly.JavaScript.addReservedWords('highlightBlock');
    Blockly.JavaScript.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
    var code = Blockly.JavaScript.workspaceToCode(workspace);
    console.log(code);
    this.myInterpreter = new Interpreter(code, initFunc);
    this.myInterpreter.appendCode('runOpMode();');
  };

  this.sleep = function(ms, callback) {
    this.sleepCallback = callback;
    this.sleepRemaining = ms;
    this.asyncWait = true;
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
        this.asyncWait = false;
      }
    }
  };

  this.nextStep = function(timestamp) {
    this.anim_handle = window.requestAnimationFrame(this.nextStep.bind(this));

    if (!this.last_timestamp) {
      this.last_timestamp = timestamp;
    }
    // Don't use a delta larger than 16ms (60 fps).
    var delta = Math.min(timestamp - this.last_timestamp, 16);
    this.last_timestamp = timestamp;
    this.time_secs += delta / 1000;

    this.handleAsync(delta);

    // Chrome requires us to poll for gamepads every loop.
    gamepadController.poll();

    // Allow up to 4 power set blocks at once.
    var power_set_count = 0;
    loop1:
    while (power_set_count < 4) {
      // Run until we hit another block.
      this.setPower = false;
      this.highlightPause = false;
      while (!this.highlightPause && !this.asyncWait) {
        if (!this.myInterpreter.step()) {
          // It's done running, abort the next frame.
          window.cancelAnimationFrame(this.anim_handle);
          this.anim_handle = null;
          // Stop highlighting blocks.
          workspace.highlightBlock(null);
          // Clear setPower so we don't run the next block.
          this.setPower = false;
          // Break out of the loop.
          break loop1;
        }
      }

      // If we set power this block, then keep going (up to 4 times).
      if (this.setPower) {
        power_set_count += 1;
      } else {
        // Else let the simulation continue.
        break;
      }
    }

    // Update the robot.
    realRobot.update(delta);
    this.robot_dom.setAttribute('x', realRobot.x);
    this.robot_dom.setAttribute('y', realRobot.y);
    var deg = realRobot.angle * 180 / Math.PI;
    this.robot_dom.setAttribute('transform',
        `rotate(${deg} ${realRobot.x} ${realRobot.y}) translate(-21.77 -20.95)`);

    update_trail(this.trail_dom);
    camera.update(realRobot.x, realRobot.y);

    this.servo1_dom.setAttribute('transform',
        `rotate(${realRobot.servo_actual_position[0]}, 40, 30)`);
    this.servo2_dom.setAttribute('transform',
        `rotate(${realRobot.servo_actual_position[1]}, 100, 30)`);
  };

  this.stop = function() {
    if (this.anim_handle) {
      window.cancelAnimationFrame(this.anim_handle);
    }
    this.anim_handle = null;
    // Stop highlighting blocks.
    workspace.highlightBlock(null);
  };
}

var createGamepad = function(interpreter, scope, name) {
  var i, fn, fnname;

  var gamepad = interpreter.nativeToPseudo({});
  interpreter.setProperty(scope, name, gamepad);

  interpreter.setProperty(gamepad, 'name', name);

  var getFunctionNames = [
    "LeftStickX", "LeftStickY",
    "RightStickX", "RightStickY",
    "LeftTrigger", "RightTrigger",
    "A", "B", "X", "Y",
    "LeftBumper", "RightBumper",
    "Back", "Start",
    "LeftStickButton", "RightStickButton",
    "DpadUp", "DpadDown", "DpadLeft", "DpadRight",
    "Guide", "AtRest"
  ];
  // XXX This is a potential security risk?
  for (i = 0; i < getFunctionNames.length; i++) {
    fnname = "get" + getFunctionNames[i];
    fn = Function(`return gamepadController.${fnname}("${name}");`);
    interpreter.setProperty(gamepad, fnname,
        interpreter.createNativeFunction(fn));
  }
};

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

var createServoMotor = function(interpreter, scope, name) {
  var motor = interpreter.nativeToPseudo({});
  interpreter.setProperty(scope, name, motor);

  interpreter.setProperty(motor, 'name', name);

  var setDirection = function(dir) {
    realRobot.setServoDirection(name, dir);
  };
  interpreter.setProperty(motor, 'setDirection',
      interpreter.createNativeFunction(setDirection));

  var setPosition = function(position) {
    realRobot.setServoPosition(name, position);
  };
  interpreter.setProperty(motor, 'setPosition',
      interpreter.createNativeFunction(setPosition));

  var scaleRange = function(min_val, max_val) {
    console.log("scaleRange", min_val, max_val, name);
  };
  interpreter.setProperty(motor, 'scaleRange',
      interpreter.createNativeFunction(scaleRange));

  var getPosition = function() {
    return realRobot.getServoCommandedPosition(name);
  };
  interpreter.setProperty(motor, 'getPosition',
      interpreter.createNativeFunction(getPosition));
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
  interpreter.setProperty(scope, 'telemetryAddTextData',
      interpreter.createNativeFunction(telemetry.addTextData));

  createDcMotor(interpreter, scope, "FLmotorAsDcMotor");
  createDcMotor(interpreter, scope, "FRmotorAsDcMotor");
  createDcMotor(interpreter, scope, "BLmotorAsDcMotor");
  createDcMotor(interpreter, scope, "BRmotorAsDcMotor");
  createDcMotor(interpreter, scope, "Motor1AsDcMotor");
  createDcMotor(interpreter, scope, "Motor2AsDcMotor");
  createDcMotor(interpreter, scope, "Motor3AsDcMotor");

  createServoMotor(interpreter, scope, "Servo1AsServo");
  createServoMotor(interpreter, scope, "Servo2AsServo");

  createGamepad(interpreter, scope, "gamepad1");

  var highlightBlock = function(id) {
    workspace.highlightBlock(id);
    simController.highlightPause = true;
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
  // Make sure we stop first, just in case.
  stopSimulator();

  realRobot = new Robot();
  camera = new Camera();
  simController = new SimController;

  simController.init();

  // Start the simulation.
  window.requestAnimationFrame(simController.nextStep.bind(simController));
}

function stopSimulator() {
  if (simController) {
    simController.stop();
  }
  simController = null;
}
