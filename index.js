/**
 * Created by toby on 13/10/15.
 */

var log = require("debug")("index");
var _config = require("./config.json");
var Application = require("./application");
var _env ={appname:'SECD', homepath:process.env['HOME']};
Application.start(_env, _config);

