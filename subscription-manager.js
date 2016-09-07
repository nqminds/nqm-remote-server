module.exports = (function() {
  "use strict";

  var log = require("debug")("nqm:subscription-manager");
  var _tdxObservers = {};
  var _datasets = {};
  var _config = null;
  var _tdxConnection = null;
  var _appServer = null;
  var actionHandler = require("./action-handler");
  var appHandler = require("./application-handler");
  var configurationHandler = require("./configuration-handler");

  var _initialise = function(cfg, tdxConnection, appServer) {
    _config = cfg;
    _tdxConnection = tdxConnection;
    _appServer = appServer;
  };

  var _observeDataset = function(datasetId, handler) {
    var observeName = "AS.Resource-" + datasetId;
    if (!_tdxObservers[observeName]) {
      _tdxObservers[observeName] = _tdxConnection.observe("AS.Resource", _tdxDatasetObserver(datasetId, handler));
      _tdxConnection.subscribe("resources", { id: datasetId });    
    }
  };
  
  var _tdxLogin = function(accessToken, cb) {
    cb = cb || function() {};
    if (accessToken.length > 0) {
      _tdxConnection.authenticate(accessToken, function(err, result) {
        if (err) {
          log("tdx connection auth error %s", err.message);
          accessToken = "";
        } else {
          log("tdx connection auth result ", result);
          var datasetCollection = _appServer.getPublication("AS.Resource");
          _startSync(datasetCollection);
          _observeDataset(_config.appsInstalledDatasetId, appHandler(_config.appsInstalledDatasetId));
          _observeDataset(_config.actionsDatasetId, actionHandler(_config.actionsDatasetId));
          _observeDataset(_config.configurationDatasetId, configurationHandler(_config.configurationDatasetId));
        }
        cb(accessToken);
      });
    } else {
      // TODO - notify ddp clients that tdx is down?
    }
  };
  
  var _startSync = function(collection) {
    for (var k in collection) {
      delete collection[k];
    }
  };
  
  var _tdxDatasetObserver = function(datasetId, handler) {
    return {
      added: function(id) {
        log("got dataset %s", id);
        var dataset = _tdxConnection.collection("AS.Resource")[id];
        if (dataset.id === datasetId) {
          log("content is ", dataset);
          // Store dataset in local cache.
          var collection = _appServer.getPublication("AS.Resource");
          collection[id] = dataset;
          _datasets[dataset.id] = dataset;
          var dataCollectionName = "data-" + dataset.id;
          var dataCollection = _appServer.getPublication(dataCollectionName);
          if (!_tdxObservers[dataCollectionName]) {
            _tdxObservers[dataCollectionName] = _tdxConnection.observe("DatasetData", _tdxDatasetDataObserver(dataset, handler));
          }
          _startSync(dataCollection);
          // Subscribe to dataset data 
          _tdxConnection.subscribe("datasetData", [dataset.id]);
        }
      },
      changed: function(id, oldFields, clearedFields, newFields) {
        var dataset = _tdxConnection.collection("AS.Resource")[id];
        if (dataset.id === datasetId) {
          var collection = _appServer.getPublication("AS.Resource");
          collection[id] = dataset;
          _datasets[dataset.id] = dataset;
        }
      },
      removed: function(id, oldValue) {
        var collection = _appServer.getPublication("AS.Resource");
        var dataset = collection[id];
        if (dataset.id === datasetId) {
          delete _datasets[dataset.id];
          delete collection[id];
        }
      }
    }
  };
  
  var _tdxDatasetDataObserver = function(dataset, handler) {
    return {
      added: function (dataId) {
        // Copy the new document from the tdx collection.
        var newDoc = _tdxConnection.collection("DatasetData")[dataId];
  
        if (newDoc._d === dataset.id) {
          
          // Publish the new data.
          var collection = handler.getCollection(newDoc);
          var key = handler.getKey(newDoc);
          collection[key] = newDoc; 
          
          // Store in local cache.
          handler.added(newDoc); 
        }
      },
      changed: function(dataId, oldFields, clearedFields, newFields) {
        // Update the document using the data from the tdx collection.
        var current = _tdxConnection.collection("DatasetData")[dataId];
        
        if (current._d === dataset.id) {
          // Get the publication.
          var collection = handler.getCollection(current);
          var key = handler.getKey(current);
                    
          // Update publication and local cache.
          for (var clear in clearedFields) {
            delete collection[key][clear];
          }
          for (var add in newFields) {
            collection[key][add] = current[add];
          }
          handler.changed(current);
        }
      },
      removed: function(dataId, oldValue) {
        if (oldValue._d === dataset.id) {
          var collection = handler.getCollection(oldValue);
          var key = handler.getKey(oldValue);
          handler.removed(oldValue);
          delete collection[key];
        }
      }
    };
  };
    
  return {
    initialise: _initialise,
    setAccessToken: _tdxLogin
  };

}());