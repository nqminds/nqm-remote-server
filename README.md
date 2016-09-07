# nqm-remote-device #

## introduction
Runtime server for remote devices sync'd to an nquiringMinds Trusted Data Exchange (TDX).

Provides the following functionality:

* Pulls configuration data from a TDX data stream
* Pulls list of apps available for installation from a TDX data stream
* Allows user to install, start, stop and uninstall apps
* Syncs app status and actions with TDX
* TDX streams are configurable

## install
Clone this repository onto target device.

```
git clone https://github.com/nqminds/nqm-remote-device
cd nqm-remote-device
npm install
```

Identify or create a set of data streams on your TDX, you will need one based on each of the schemas "secd actions", "secd apps" and "secd configuration".

Configure config.json to specify the data stream IDs:

```
nano config.json
```

```
  ...
  "actionsDatasetId": "<INSERT ACTION DATASET ID>",
  "appsInstalledDatasetId": "<INSERT APPS DATASET ID>",
  "configurationDatasetId": "<INSERT CONFIGURATION DATASET ID>",
  ...
```

## Run
Run nqm-remote-device with the command line:

```
node --harmony_proxies index.js
```

The web UI is available at http://localhost:8125 (or as configured in config.json).