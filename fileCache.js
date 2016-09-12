"use strict";

module.exports = (function() {
  var console = { log: require("debug")("fileCache") }

  var pendingPath = "pending";
  var transmitPath = "transmit";
  var archivePath = "archive";
  var fs = require("fs");
  var path = require("path");
  var _ = require("lodash");
  var _workingDir = null;

  function createFolder(name) {
    var folderPath = path.join(_workingDir, name);
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
    } catch (e) {
      console.log("createFolder: ",e);
    }
  }

  function findNextPendingFile() {
    var pendingFile, transmitFile;
    do {
      this._pendingFileCount++;
      pendingFile = path.join(_workingDir, this._config.rootPath, pendingPath, this._pendingFileCount + '.log');
      transmitFile = path.join(_workingDir, this._config.rootPath, transmitPath, this._pendingFileCount + '.log');
    } while(fs.existsSync(pendingFile) || fs.existsSync(transmitFile));

    return pendingFile;
  }

  function movePendingFiles(rootPath) {
    // Clear pending folder.
    console.log("moving pending logs to transmit folder");
    var pendingFiles = fs.readdirSync(path.join(_workingDir, rootPath, pendingPath));

    // Move files from pending to transmit folder.
    for (var i = 0, len = pendingFiles.length; i < len; i++) {
      var pendingFile = path.join(_workingDir, rootPath, pendingPath, pendingFiles[i]);
      pendingToTransmit(rootPath,pendingFile);
    }
  }

  function pendingToTransmit(rootPath, file) {
    var fileOnly = path.basename(file);
    var transmitFile = path.join(_workingDir,rootPath, transmitPath, fileOnly);
    try {
      if (!fs.existsSync(transmitFile)) {
        fs.renameSync(file,transmitFile);
      } else {
        //logger.info("couldn't move file to transmit - file already exists");
      }
    } catch (e) {
      logger.error("failed to move file from pending to transmit");
    }
  }

  function deleteFiles(files) {
    console.log("deleting successfully transmitted files");
    files.forEach(function(f) {
      try {
        fs.unlink(f);
        console.log("deleted file " + f);
      } catch (e) {
        console.log("failed to delete file: " + f);
      }
    });
  }

  function onTransportTimeOut(cb) {
    console.log("sync timed out - aborting transmit files");
    this._transmitFiles = [];
    this._timeoutTimer = 0;
    cb(false);
  }

  /*
   * Send the given payload via the sync transport.
   * Start a timer to monitor sync timeouts (e.g. if the server fails to respond, retry).
   */
  function doSync(transmitId,transmitPayload,cb) {
    var self = this;

    if (self._timeoutTimer === 0) {
      // Set a timer to determine timeout.
      self._timeoutTimer = setTimeout(function() { onTransportTimeOut.call(self,cb); }, self._config.transportTimeout);

      console.log("transmitting data: " + transmitPayload.length + " bytes");
      self._sync.sendData(transmitId,transmitPayload, function(err, resp) {
        // Cancel timeout.
        if (self._timeoutTimer !== 0) {
          clearTimeout(self._timeoutTimer);
          self._timeoutTimer = 0;
        }
        if (err) {
          console.log("failed to post data to server: " + err.message);
          if (resp && resp.error) {
            var errors = resp.error.split("|");
            // Error from remote server.
            if (errors.length > 0) {
              // Filter out duplicate key errors (we don't care).
              var dupKeyErrors = _.filter(errors, function(e) { return e == "duplicate key"; });
              if (dupKeyErrors.length > 0) {
                console.log("ignored %d duplicate key errors", dupKeyErrors.length);
              }
              cb(dupKeyErrors.length === errors.length);
            } else {
              console.log("sync error: " + JSON.stringify(resp));
              cb(false);
            }
          } else {
            cb(false);
          }
        } else {
          console.log("data sent - server response: %j", resp);
          cb(true);
        }
      });
    } else {
      console.log("timeoutTimer running - ignoring request");
      cb(false);
    }
  }

  function startTransmitTimer() {
    stopTransmitTimer.call(this);
    this._transmitTimer = setTimeout(transmitData.bind(this),this._config.transmitCheckFrequency);
  }

  function stopTransmitTimer() {
    if (this._transmitTimer !== 0) {
      clearTimeout(this._transmitTimer);
      this._transmitTimer = 0;
    }
  }

  /*
   * Look for files in transmit folder and concatenate their contents
   * to form a payload for transmission.
   * Only delete the local files if the transmission is successful.
   */
  function transmitData() {
    var self = this;


    self._transmitFiles = [];
    var directory = path.join(_workingDir, self._config.rootPath, transmitPath);

    var transmitDirectory = function(directory, err, files) {
      var transmitCandidates = files.map(function(f) { return path.join(directory, f); });

      if (transmitCandidates.length > 0) {

        var transmitPayload = "";
        var oldId = "";
        var transmitFile = function(i, cb) {
          var file = transmitCandidates[i];

          fs.readFile(file, { encoding: "utf8", flag: "r"}, function(err, fileData) {
            if (err) {
              // Continue processing subsequent files?
              console.log("failed to read file %s [%s]", file, err.message);
            } else {
              // Accumulate the contents of the files into a single payload string, no larger than config.maximumTransmitKB

              if (fileData.length > 0) {
                console.log(fileData);
                if(oldId.length <= 0){
                  console.log('transmitData called');
                  oldId = JSON.parse(fileData)["id"];
                }
                console.log('oldid is '+oldId);
                if (transmitPayload.length > 0 && oldId == JSON.parse(fileData)["id"]) {
                  transmitPayload += ",";
                  oldId = JSON.parse(fileData)["id"];
                }
                transmitPayload += JSON.stringify(JSON.parse(fileData)["d"]);
              }
              self._transmitFiles.push(file);
            }
            i++;
            if (i >= transmitCandidates.length || transmitPayload.length >= self._config.maximumTransmitKB*1024) {
              cb(null);
            } else {
              process.nextTick(function() { transmitFile(i, cb); });
            }
          });
        };

        transmitFile(0, function(err) {
          if (err) {
            console.log("failure reading files for transmission: [%s]", err.message);
            startTransmitTimer.call(self);
          } else {
            console.log("transmitting " + transmitPayload.length + " bytes");
            doSync.call(self, oldId,"[" + transmitPayload + "]", function(ok) {
              if (ok === true) {
                console.log("transmit success");
                deleteFiles(self._transmitFiles);
                self._transmitFiles = [];
              } else {
                console.log("transmit failed");
              }
              startTransmitTimer.call(self);
            });
          }
        });
      } else {
        // No files to transmit - set timer for next check.
        startTransmitTimer.call(self);
      }
    };

    // Get the list of files waiting to be transmitted.
    fs.readdir(directory, function(err, files) {
      transmitDirectory(directory, err, files);
    });
  }

  function FileCache(config,workingDir) {
    this._config = config;
    this._sync = null;
    this._transmitTimer = 0;
    this._pendingFileCount = 0;
    this._pendingPacketCount = 0;
    this._transmitFiles = [];
    this._timeoutTimer = 0;
    _workingDir = workingDir;

    this._config.rootPath = this._config.rootPath || "";
    createFolder(this._config.rootPath);
    createFolder(path.join(this._config.rootPath, pendingPath));
    createFolder(path.join(this._config.rootPath, transmitPath));
    createFolder(path.join(this._config.rootPath, archivePath));

    findNextPendingFile.call(this);
  }

  FileCache.prototype.setSyncHandler = function(sync) {
    this._sync = sync;
    startTransmitTimer.call(this);
  };

  FileCache.prototype.cacheThis = function(dataIn,cb) {
    var data = JSON.stringify(dataIn);

    // Add packet to archive file.
    if (this._config.archive) {
      var archiveFile = path.join(_workingDir, this._config.rootPath, archivePath,'store.json');
      fs.appendFileSync(archiveFile,data + "\n");
    }

    // Add packet to pending file
    var pendingFile = path.join(_workingDir, this._config.rootPath, pendingPath, this._pendingFileCount + '.log');
    try{
      fs.appendFileSync(pendingFile,data);
    }catch(e){
      cb(e);
    }
    cb(null);
    if (this._pendingPacketCount > 0) {
      fs.appendFileSync(pendingFile,",");
    }

    this._pendingPacketCount++;

    if (this._pendingPacketCount === this._config.pendingPacketThreshold) {
      movePendingFiles(this._config.rootPath);
      findNextPendingFile.call(this);
      this._pendingPacketCount = 0;
    }
  };

  FileCache.prototype.stop = function() {
    stopTransmitTimer.call(this);
  };

  return FileCache;
}());