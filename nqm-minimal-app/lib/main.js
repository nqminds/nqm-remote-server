/**
 * Created by toby on 18/10/15.
 */

module.exports = (function() {
  var log = require("debug")("AppProcess");
  var util = require("util");
  var config = require("./config.json");
  var TDX_API = require("nqm-api-tdx");
  
  function AppProcess(args, watchdog) {
    this._args = require("minimist")(args);
    this._watchdog = watchdog;
    this._temperature = 20;
    this._api = new TDX_API({
      baseCommandURL: config.commandURL || "https://cmd.nqminds.com",
      baseQueryURL: config.queryURL || "https://q.nqminds.com/v1"
    });
  }
  
  var simulateData = function() {
    var self = this;
    self._temperature += (0.5 - Math.random());
    var data = {
      timestamp: Date.now(),
      temperature: self._temperature 
    };

    self._api.addDatasetData(this._accessToken, this._args.datasetId, data, function(err,result) {
      if (err) {
        log("failed to send temperature data: %s", err.message);
      } else {
        log("sent temperature data: %j", data);
      }
    });
  };
  
  AppProcess.prototype.run = function() {
    var self = this;

    this._api.authenticate(config.token, config.secret, function(err, token) {
      if (err) {
        log("failed to authenticate tdx api: [%s]", err.message);
      } else {
        self._accessToken = token;
        setInterval(function() { simulateData.call(self); }, config.simulateInterval || 10000);
      }
    });
  };
  
  return AppProcess;
}())