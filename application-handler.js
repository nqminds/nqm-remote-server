module.exports = (function() {
  "use strict";

  var log = require("debug")("nqm:application-handler");
  var _appServer = require("./appServer");

  return function(datasetId) {
    return {
      getCollection: function(doc) {
        return _appServer.getPublication("data-" + datasetId);
      },
      getKey: function(doc) {
        return doc.id;
      },
      added: function(doc) {
        log("new application: ", doc);
      },
      changed: function(doc) {
        log("application changed: ", doc);
      },
      removed: function() {
        log("application removed: ", doc);
      }
    };
  };
}());