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
  }
};

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

