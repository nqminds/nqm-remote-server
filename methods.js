/**
 * Created by toby on 17/10/15.
 */

module.exports = (function() {
  var log = require("debug")("methods");
  var shortId = require("shortid");

  return function(config, appServer, xrhConnection) {
  
    var _setAppStatus = function(status, app) {
      // Create action.
      var action = {
        id: shortId.generate(),
        appId: app.id,
        action: status,
        timestamp: Date.now(),
        status: "pending"
      };

      // Execute the action.
      return appServer.executeAction(action);
    };
    
    var _completeAction = function(instId, actionId, err, result) {
      return appServer.completeAppAction(instId, actionId, err, result);
    };
  
    var _appStartedNotification = function(instId) {
      return appServer.appStartedCallback(instId);
    };
    
    return {
      appStarted: _appStartedNotification,
      setAppStatus: _setAppStatus,
      completeAction: _completeAction
    }
  };
}());