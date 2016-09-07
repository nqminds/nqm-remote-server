module.exports = (function() {
  "use strict";

  var log = require("debug")("nqm:action-handler");
  var _appServer = require("./appServer");

  var _process = function(action) {
    if (action.status === "pending") {
      // Perform the action.
      log("perform pending action: %j", action);
      _appServer.executeAction(action, function(err, status) {
        log("_processAction: finished: %s", status);
      });
    }
  };

  return function(datasetId) {
    return {
      getCollection: function(doc) {
        return _appServer.getPublication("actions-" + doc.appId);
      },
      getKey: function(doc) {
        // For actions we need to use the self-generated id.
        return doc.id;
      },
      added: function(action) {
        _process(action);
      },
      changed: function(action) {
        _process(action);
      },
      removed: function() {
      }
    };
  };
}());