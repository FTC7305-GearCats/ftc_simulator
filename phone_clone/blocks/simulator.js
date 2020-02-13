var linearOpMode = {
  count: 20,
  waitForStart: function() {},
  opModeIsActive: function() {
    linearOpMode.count -= 1;
    console.log(linearOpMode.count);
    if (linearOpMode.count >= 0) {
      return true;
    } else {
      return false;
    }
  },
  sleep: async function(ms) {
    // XXX
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

var FLmotorAsDcMotor = new DcMotor("FLmotor");
var FRmotorAsDcMotor = new DcMotor("FRmotor");
var BLmotorAsDcMotor = new DcMotor("BLmotor");
var BRmotorAsDcMotor = new DcMotor("BRmotor");

var telemetry = {
  update: function() {}
};

function runSimulator() {
  Blockly.JavaScript.addReservedWords('code');
  var code = Blockly.JavaScript.workspaceToCode(workspace);
  code = Function(code + "runOpMode();");
  try {
    code();
  } catch (e) {
    console.log(e);
  }
}

