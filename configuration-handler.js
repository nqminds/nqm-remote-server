module.exports = (function() {
  "use strict";

  var log = require("debug")("nqm:configuration-handler");
  var _appServer = require("./appServer");

  return function(datasetId) {
    return {
      getCollection: function(doc) {
        return _appServer.getPublication("data-" + datasetId);
      },
      getKey: function(doc) {
        return doc._id;
      },
      added: function(doc) {
        log("new configuration: ", doc);
      },
      changed: function(doc) {
        log("configuration changed: ", doc);
      },
      removed: function(doc) {
        log("configuration removed: ", doc);
      }
    };
  };
}());