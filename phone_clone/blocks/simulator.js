function runSimulator() {
  Blockly.JavaScript.addReservedWords('code');
  var code = Blockly.JavaScript.workspaceToCode(workspace);
  code = code + `

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

runOpMode();
`;
  try {
    eval(code);
  } catch (e) {
    console.log(e);
  }
}

