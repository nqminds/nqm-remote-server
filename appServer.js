/**
 * Created by toby on 17/10/15.
 */

module.exports = (function() {
  "use strict";
  var log = require("debug")("nqm:appServer");
  var DDPServer = require("ddp-server-reactive");
  var fs = require("fs");
  var path = require("path");
  var util = require("util");
  var _ = require("lodash");
  var _config;
  var _ddpServer;
  var _xrh;
  var _heartbeat;
  var _methods = require("./methods");
  var _publications = {};
  var _actionCallbacks = {};
  var _appStartCallbacks = {};
  
  var _start = function(config, httpServer, xrh) {
    _config = config;
    _xrh = xrh;
    _ddpServer = new DDPServer({ httpServer: httpServer });

    _startHeartbeat(_config.heartbeatInterval);
    
    // Add methods
    var methods = _methods(config, this, _xrh);
    _ddpServer.methods(methods);
  };

  var _startHeartbeat = function(interval) {
    // Publish heartbeat collection.
    _heartbeat = _ddpServer.publish("heartbeat");
  
    // Start heartbeat.
    setInterval(function() {
      log("sending heartbeat");
      _heartbeat[0] = { hb: 1 };
    }, interval);
  };
  
  var _getPublication = function(name) {
    if (!_publications[name]) {
      _publications[name] = _ddpServer.publish(name);
    }
    return _publications[name];
  };
  
  var _completeAppAction = function(instId, actionId, err, result) {
    log("completing action %s", actionId);
    if (err) {
      log("action error: %s",err.message);
    } else {
      log("action result: ",result);
    }
    if (_actionCallbacks[actionId]) {
      _actionCallbacks[actionId](err, result);
      delete _actionCallbacks[actionId];
    }
    var appActions = _getPublication("actions-" + instId);
    delete appActions[actionId];
  };
  
  var _installApp = function(app, cb) {
    var http = require('http');
    var path = require("path");
    var fs = require('fs');
    var unzip = require("extract-zip");
    
    var filePath = path.join(_config.appDownloadPath,app.id);
    var file = fs.createWriteStream(filePath);
    var request = http.get(app.installUrl, function(response) {
      response.pipe(file);
      file.on("finish", function() {
        log("file downloaded");
        file.close(function() {
          var appPath = path.join(_config.appsPath,app.id);
          unzip(filePath, { dir: appPath }, function(err) {
            fs.unlink(filePath);
            cb(err);
          });
        })
      });
    });
    
    request.on("error", function(err) {
      log("failed to download: %s", err.message);
      fs.unlink(filePath);
      cb(err);
    });
  };
  
  var _removeApp = function(app,cb) {
    var rimraf = require("rimraf");
    var appPath = path.join(_config.appsPath,app.id);
    rimraf(appPath,cb);
  };
  
  var _startApp = function(app, cb) {
    _startAppActions(app.id);
    
    var spawn = require('child_process').spawn;
    var nodePath = util.format("%snode",_config.nodePath);
    var appArgs = util.format("index.js --appInst=%s --server=%s --port=%d", app.id, _config.hostname, _config.port).split(" ");
    appArgs = appArgs.concat(app.params.split(" "));
    var cwd = path.resolve(util.format("%s/%s",_config.appsPath,app.id));
  
    var out = fs.openSync(path.join(cwd,'./out.log'), 'a');
    var err = fs.openSync(path.join(cwd,'./out.log'), 'a');
    
    _appStartCallbacks[app.id] = cb;
    log("starting app:");
    log("%s %j", nodePath, appArgs);
    log("cwd: %s", cwd);
    var child = spawn(nodePath, appArgs, { cwd: cwd, stdio: ["ignore", out, err], detached: true });
    child.unref();
  };

  var _startAppActions = function(appId) {
    //var appActions = _getPublication("actions-" + appId);

    //// Clear any existing actions.
    //log("clearing existing app actions for %s",appId);
    //for (var k in appActions) {
    //  delete appActions[k];
    //}
  };
  
  var _appStartedCallback = function(instId) {
    // This may be called in 2 scenarios: 
    // 1 - in response to a start action we've issued.
    // 2 - if the app is already running when we start up - it will re-connect.
    _startAppActions(instId);
    if (_appStartCallbacks[instId]) {
      _appStartCallbacks[instId]();
    }
  };
  
  var _sendActionToApp = function(action, cb) {
    _actionCallbacks[action.id] = cb;
    _updateLocalCaches(action);
  };
  
  var _sendAppStatusToXRH = function(app) {
    _xrh.call("/app/dataset/data/update", [_config.appsInstalledDatasetId, app], function(err, result) {
      if (err) {
        log("_sendAppStatusToXRH failed: %s", err.message);
      } else {
        log("_sendAppStatusToXRH OK: %j", result);
      }
      // Update local cache while waiting for sync.
      var publication = _getPublication("data-" + _config.appsInstalledDatasetId);
      publication[app.id].status = app.status;
    });
  };
  
  var _sendActionToXRH = function(action, forceUpdate) {
    var command = (action._id || forceUpdate) ? "update" : "create";
    _xrh.call("/app/dataset/data/" + command, [_config.actionsDatasetId, action], function(err, result) {
      if (err) {
        log("_sendActionToXRH failed: %s", err.message);
      } else {
        log("_sendActionToXRH OK: %j", result);
      }
    });
  };

  var _updateLocalCaches = function(action) {
    var appActions = _getPublication("actions-" + action.appId);
    if (appActions[action.id]) {
      appActions[action.id].status = action.status;
    } else {
      appActions[action.id] = action;
    }
  };
  
  var _executeAction = function(action, cb) {
    // Get the app.
    var appDataCollection = _getPublication("data-" + _config.appsInstalledDatasetId);
    var app = appDataCollection[action.appId];
    if (app) {
      var result = false;
      switch (action.action) {
        case "install":
          result = _installApp(app, function(err) {
            if (err) {
              action.status = "error - " + err.message;
            } else {
              app.status = "stopped";
              _sendAppStatusToXRH(app);
              action.status = "complete";
            }
            _sendActionToXRH(action);
            _updateLocalCaches(action);
          });
          break;
        case "uninstall":
          result = _removeApp(app, function(err) {
            if (err) {
              action.status = "error - " + err.message;
            } else {
              action.status = "complete";
              app.status = "pendingInstall";
              _sendAppStatusToXRH(app);
            }
            _sendActionToXRH(action);
            _updateLocalCaches(action);
          });
          break;
        case "start":
          if (app.status === "stopped") {
            result = _startApp(app, function(err) {
              if (err) {
                action.status = "error - " + err.message;
              } else {
                action.status = "complete";
                app.status = "running";
                _sendAppStatusToXRH(app);
              }
              _sendActionToXRH(action);
              _updateLocalCaches(action);
            });
          } else {
            log("attempt to start app already running");
          }
          break;
        case "stop":
          if (app.status === "running") {
            result = _sendActionToApp(action, function(err, result) {
              // At this point the client will have completed the action.
              if (err) {
                action.status = "error - " + err.message;
              } else {
                action.status = "complete";
                app.status = "stopped";
                _sendAppStatusToXRH(app);
              }
              _sendActionToXRH(action);
              _updateLocalCaches(action);
            });
          } else {
            log("attempt to stop app that is not running");
          }
          break;
      }
      return result;
    } else {
      log("action for unknown app: %s",action.appId);
      return false;
    }
  };
  
  return {
    start:             _start,
    getPublication:    _getPublication,
    completeAppAction: _completeAppAction,
    appStartedCallback: _appStartedCallback,
    executeAction: _executeAction
  }
}());

