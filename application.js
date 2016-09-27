/**
 * Created by toby on 19/10/15.
 */

module.exports = (function() {
  "use strict";
  var log = require("debug")("nqm:application");
  var express = require('express');
  var http = require("http");
  var url = require("url");
  var querystring = require("querystring");
  var util = require("util");
  var _tdxConnection = require("./tdxConnection");
  var _appServer = require("./appServer");
  var _ = require("lodash");
  var tokenPath = 'tdxToken.json';
  var _tdxAccessToken = "";
  var _emailAccessToken = null;
  var _subscriptionManager = require("./subscription-manager");
  var _cache = require("./cache.js");
  var path = require('path');

  var bodyParser = require('body-parser');
  var _emaildriver = require("./email.js")
  var appconfig = null;
  var _email = null;
  var _filedriver = require('./fileCache');
  var _fileCache = null;
  var _tdxAPI =  null;
  var _tdxFileAPI = null;
  var syncdriver = require('./sync');
  var fs = require('fs');
  var _sync = null;
  var _workingDir = null;
  var timerEnabled = false;
  var path = require('path');
  var authState = true;

  var spawn = require('child_process').spawn;
  var excu = require('child_process').exec;
  var MailParser = require('mailparser').MailParser;
  var CMDmailContent = "";
  var waitCMD = false;

/*
  fs.stat('./'+tokenPath,function(err,stats){
    if(!err) {
      var TokenObj = require('./'+tokenPath);
      //if the accessToken is expired
      log('time is ');
      log(TokenObj);
      log(TokenObj.timestamp);
      if(Date.now()/1000-TokenObj.timestamp/1000<3590) {
        _tdxAccessToken = require('./' + tokenPath).token;
        _sync = new syncdriver(appconfig, _tdxAccessToken);
      }
    }
  })
*/

  var tdxConnectionHandler = function(err, reconnect) {
    if (!err) {
      log("tdx %s", (reconnect ? "re-connected" : "connected"));
      if (_tdxAccessToken) {
        _subscriptionManager.setAccessToken(_tdxAccessToken);
      }
    } else {
      log("tdx connection failed: %s",err.message);
    }
  };
 

  var _start = function(_env, config) {  

    var app = express();

	_workingDir = path.join(_env.homepath,config.userHomeDirName);

	try{
		fs.statSync(_workingDir);

	} catch(err) {
		if (err && err.errno!=-2)
        	throw (err);
		
		try{
			fs.mkdirSync(_workingDir);
		} catch(err) {
			if (err && err.errno!=-2 && err.errno!=-17)
				throw err;
		}
	}

  try{
    fs.statSync(path.join(_workingDir, 'attachments'));

  } catch(err) {
      if (err && err.errno!=-2)
        throw (err);

      try{
        fs.mkdirSync(path.join(_workingDir, 'attachments'));
        fs.symlinkSync(path.join(_workingDir, 'attachments'), path.join(__dirname, '/public/attachments'));
      } catch(err) {
		if (err && err.errno!=-2 && err.errno!=-17)
        	throw(err);
      }
    }

    try{
      fs.statSync(path.join(_workingDir, 'docViews'));

    } catch(err) {
      if (err && err.errno!=-2)
        throw (err);

      try{
        fs.mkdirSync(path.join(_workingDir, 'docViews'));
        fs.symlinkSync(path.join(_workingDir, 'docViews'), path.join(__dirname, '/public/docViews'));
      } catch(err) {
		if (err && err.errno!=-2 && err.errno!=-17)
        	throw(err);
      }
    }
    try{
      fs.statSync(path.join(__dirname, '/public/docViews'));

    } catch(err) {
      if (err && err.errno!=-2)
        throw (err);

      try{
        fs.symlinkSync(path.join(_workingDir, 'docViews'), path.join(__dirname, '/public/docViews'));
      } catch(err) {
        if (err && err.errno!=-2 && err.errno!=-17)
          throw(err);
      }
    }
    try{
      fs.statSync(path.join(__dirname, '/public/attachments'));
    } catch(err) {
      if (err && err.errno!=-2)
        throw (err);

      try{
        fs.symlinkSync(path.join(_workingDir, 'attachments'), path.join(__dirname, '/public/attachments'));
      } catch(err) {
        if (err && err.errno!=-2 && err.errno!=-17)
          throw(err);
      }
    }

	try{
		appconfig = require(path.join(_workingDir,config.userAppConfigName));
		authState = false;
		_fileCache = new _filedriver(appconfig,_workingDir);
		_tdxAPI =  (new (require("nqm-api-tdx"))(appconfig));
    _tdxFileAPI = (new (require("nqm-api-tdx"))(appconfig));
		_email =new _emaildriver(config, appconfig, _workingDir);
    _cache.init(_workingDir,appconfig.userName);
	} catch(err) {
		authState = true;
	}

	var exec = require('child_process').exec;
	config.gitCommitTime = 0;
	exec('git log -1', function (error, stdout, stderr){
  		if (error)
    		log('git log:'+error);
  		else {
			var gitres = stdout.split("\n");
			if (gitres[2].indexOf("Date:")>-1) {
				config.gitCommitTime = Date.parse(gitres[2].slice(5).trim());
				log("git commit time:"+config.gitCommitTime);
			} else 
				log("Wrong git output:"+gitres[2]);
		}
	});
 
    app.set("views", __dirname + "/views");
    app.set('view engine', 'jade');
    app.use(express.static(__dirname  + '/public'));
    app.use('/viewer', express.static(__dirname +'/node_modules/node-viewerjs/release'));

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));

    function getTDXToken(callback){
      _tdxAPI.authenticate(appconfig.emailtable_token,appconfig.emailtable_Pass,function(TokenErr,accessToken){
        if(TokenErr) {
          log("token err"+TokenErr);
          callback(TokenErr, null);
        }
        else{
          //_emailAccessToken = accessToken;
          //_sync = new syncdriver(appconfig,_emailAccessToken);
          callback(null,accessToken);
        }
      })
    }


  	function authPollTimer() {
		log("Retry email auth token.");
		_tdxAPI.authenticate(appconfig.emailtable_token, appconfig.emailtable_Pass, function(imaperr, accessToken){
			if (imaperr) {
				setTimeout(authPollTimer,config.autoReconnectTimer);
			} else {
				log('Email auth token:'+accessToken);

				timerEnabled = false;
				_emailAccessToken = accessToken;
        _sync = new syncdriver(appconfig,_emailAccessToken);
			}
		});
  	}

    app.get('/wifi',function(req,res,next){
      log('get wifi');
      res.render('wifi');
    })

    app.post("/wifi",function(req,res,next){
      log('post wifi');
      log(req.body);
      var user_SSID = req.body.user_ssid;
      var user_wifipass = req.body.user_wifipass;
      var disable_wifi = req.body.disable_wifi=='true'?1:0;
      var cmd = './wifi.sh';
      cmd += ' -ssid '+user_SSID+' -pwd '+user_wifipass+' -disable '+disable_wifi;
      log('cmd is '+cmd);
      exec(cmd,function(error, stdout, stderr){
        if(error == null || error == 'null') {
          log('output is ', stdout);
          res.sendStatus(200);
        }
      })
    })

    app.get('/', function (req, res) {
		if (!timerEnabled && _emailAccessToken==null && !authState) {
			_tdxAPI.authenticate(appconfig.emailtable_token, appconfig.emailtable_Pass, function(imaperr, accessToken){
				if (imaperr) {
					log(imaperr);
					timerEnabled = true;
					setTimeout(authPollTimer,config.autoReconnectTimer);
				}

				_emailAccessToken = accessToken;
      			_sync = new syncdriver(appconfig,_emailAccessToken);
            log('username is ',appconfig.userName);
        		res.render("apps", { config: config, username:appconfig.userName});
			});
		} else if (timerEnabled && _emailAccessToken==null && !authState)
				res.render("apps", { config: config,username:appconfig.userName});
		else if (_emailAccessToken!=null && !authState) {
				_sync = new syncdriver(appconfig,_emailAccessToken);
                res.render("apps", { config: config,username:appconfig.userName});
		} else if (authState) {
			res.render("auth");
		}
    });

    app.post('/auth', function (req, res) {

      log("Auth request:"+authState+":"+JSON.stringify(req.body));

      if(req.body==null) {
        res.redirect("/");
        return;
      }

      var form = JSON.parse(req.body.form);
      if (form==null) {
        res.redirect("/");
        return;
      }

      if(authState && form.userID!==undefined) {
        var tAPI =  (new (require("nqm-api-tdx"))(config));

        tAPI.authenticate(config.authtable_token, config.authtable_Pass, function(taberr, tabAccessToken){
          if(taberr) res.send({error:1, poststr:"Can't authenticate into TBX"});
          else {
            tAPI.query("datasets/" + config.authtable_ID + "/data", {userID:form.userID}, null, null, function (qerr, data) {
              if (qerr) res.send({error:1, poststr:"Can't retrieve data from TBX!"});
              else {
                if (!data.data.length) {
                  log("Bad ID!");
                  res.send({error:1, poststr:"Wrong verification ID!"});
                }
                else if(data.data.length==1){
                  if(parseInt(req.body.type)) {
                    data.data[0].smtpServer = form.smtpServer;
                    data.data[0].smtpLogin = form.smtpLogin;
                    data.data[0].smtpPass = form.smtpPass;
                    data.data[0].smtpPort = parseInt(form.smtpPort);
                    data.data[0].smtpTLS = parseInt(form.smtpTLS);
                  }

                  fs.writeFile(path.join(_workingDir,config.userAppConfigName), JSON.stringify(data.data[0]), function(ferr){
                    if (ferr) {
                      log(ferr);
                      res.send({error:1, poststr:"Can't access the device!"});
                    } else {
                      appconfig = data.data[0];
                      authState = false;
                      _fileCache = new _filedriver(appconfig,_workingDir);
                      _tdxAPI =  (new (require("nqm-api-tdx"))(appconfig));
                      _tdxFileAPI =  (new (require("nqm-api-tdx"))(appconfig));
                      _email = new _emaildriver(config, appconfig, _workingDir);
                      _cache.init(_workingDir,appconfig.userName);

                      if (!parseInt(req.body.type))
                        res.send({error:0, poststr:"ID OK!"});
                      else {
                        var tdxBoxesAPI = (new (require("nqm-api-tdx"))(config));
                        tdxBoxesAPI.authenticate(config.byodimapboxes_token, config.byodimapboxes_Pass, function(boxeserr, boxesAccessToken){
                          if (boxeserr) {
                            log("Can't authenticate into imap boxes table:"+boxeserr);
                            res.send({error:1, poststr:"Can't send data to TBX!"});
                          } else {

                            var entry = {
                              "userID":form.userID,
                              "new":0,
                              "total":0,
                              "mailboxname":form.mailboxname,
                              "imaptls":parseInt(form.imaptls),
                              "imaphost":form.imaphost,
                              "imapport":parseInt(form.imapport),
                              "mailtablepass":appconfig.emailtable_Pass,
                              "mailtabletoken":appconfig.emailtable_token,
                              "mailtableid":appconfig.emailtable_ID,
                              "imapuserid":form.imapuserid,
                              "imapuserpass":form.imapuserpass
                            };

                            tdxBoxesAPI.addDatasetData(config.byodimapboxes_ID, entry, function(dataerr, datares){
                              log("Saving in imap boxes:"+JSON.stringify(entry));
                              if (dataerr) {
                                log("Can't write into imap boxes table:"+dataerr);
                                res.send({error:1, poststr:"Can't send data to TBX!"});
                              } else
                                res.send({error:0, poststr:"ID OK!"});
                            });
                          }
                        });
                      }
                    }
                  });
                } else if(data.data.length>1) {
                  log("Two auth same entries found in TBX!");
                  res.send({error:1, poststr:"Can't retrieve data from TBX!"});
                }
              }
            });
          }
        });
      } else res.redirect("/");
    });

/*
    app.get("/oauthCB", function(request, response) {
      var up = url.parse(request.url);
      var q = querystring.parse(up.query);
      if (q.access_token) {
        _tdxAccessToken = q.access_token;
        _subscriptionManager.setAccessToken(q.access_token);
        response.writeHead(301, {Location: config.hostURL});

        _sync = new syncdriver(appconfig,_emailAccessToken);
        var tdxTokenObj = {
          token:_emailAccessToken,
          timestamp:Date.now()
        }
        fs.writeFile(tokenPath,JSON.stringify(tdxTokenObj),{encoding:'utf8',flag:'w'},function(err){
          if(!err)
            response.end();
        })
      }
    });
*/


    /*---------------- get files -----------------------------*/
    app.get("/files", function(req, response) {
		if (!authState) {
      _tdxFileAPI.authenticate(appconfig.folder_token, appconfig.folder_Pass, function(foldererr, accessToken) {
        if (foldererr) log(foldererr);
        else {
          _cache.getFiles(response, accessToken);
        }
      });
    }
		else
			response.render("auth");
    });

    /*
    * get email
    */
    app.get('/email', function (req, res,next) {
      if (!authState) {
        log('get API obj is');
        log(_tdxAPI);
        if (_tdxAPI['_accessToken'] == '' || _tdxAPI['_accessToken'] == null) {
          res.redirect("/");
        }
        else {
        _sync = new syncdriver(appconfig, _tdxAPI['_accessToken']);
        _fileCache.setSyncHandler(_sync);
        _email.getInbox(_tdxAPI, function (err, ans) {
          if (err) {
            log(err);
            if (err == "NULL DATA")
              res.render("email", {messages: [], docNames: [], username: appconfig.userName});
            else {
              log(err);
              res.redirect("/");
            }
          } else {
            _cache.getAttachments(_tdxAPI['_accessToken'], function (error, docNames) {
              if (error) docNames = [];
              res.render("email", {messages: ans, docNames: docNames, username: appconfig.userName});
            });
          }
        });
      }
      } else res.render("auth");
    });

    /*----------------------- process the admin sent from email -----------------------------------------------*/
    function processAdminCmd(adminQuery) {
      if(adminQuery["subject"]=="EXIT")
        process.exit(1);
      else if(adminQuery["subject"]=="CMD") {
        var mailparser = new MailParser();
        mailparser.on("end", function (mail_object) {
          var cmdarr = mail_object.text.split('\n');
          log('mail array is ');
          log(cmdarr);
          executeAdminCmd(cmdarr,0);
        });

        mailparser.write(adminQuery['text']);
        mailparser.end();
      }
    }
    //recursively call excute cmds
    function executeAdminCmd(cmdarr,cmdIndex){
      if(cmdIndex<cmdarr.length && cmdarr[cmdIndex].length>0) {
        var cmdObj = JSON.parse(cmdarr[cmdIndex]);
        var cmd = spawn(cmdObj.cmd,cmdObj.args,{
          detached:false
        });
        cmd.stdout.resume();
        cmd.stderr.resume();

        log("admin command:" + cmdObj.cmd + " " + cmdObj.args);
        cmd.stdout.on('data', function (data) {
          log('stdout:' + data);
          CMDmailContent += data;
        });

        cmd.stderr.on('data', function (data) {
          log('stderr:' + data);
          CMDmailContent += data;
        });

        cmd.on('close', function (code) {
          log('child process exited with code:' + code);
          CMDmailContent +="<\/br>";
          executeAdminCmd(cmdarr,cmdIndex+1);
        });
      }
      else{
        var msgheader = {};
        var msgContent = cmdarr+"<\/br>"+CMDmailContent;
        msgheader['To'] = config.adminMail;
        msgheader['Cc'] = "";
        msgheader['Bcc'] = "";
        msgheader['Subject'] = "CMD";
        _email.send(msgheader, {html:msgContent}, function(senderr, senddata){
          if (senderr)
            throw senderr;
          else {
            waitCMD = false;
            CMDmailContent = "";
          }
        });
      }
    }

    function SendWaitMsg(res) {
      var waitarr = [];
      var waitmsg = {flags:"\\Wait"};
      waitarr.push(waitmsg);
      res.send(waitarr);
    }

/*----------------------------------------------- refresh ----------------------------------------------------------*/
    app.post('/refresh', function(req, res, next){
      log('get newmail');
      if (_tdxAPI !== null) {
        _email.getnewInbox(_tdxAPI, _fileCache, function(qerr,newmessages, adminQuery){
          if(qerr){
            log(qerr);
            res.redirect('/');
          }else {
            log('get new messages are');
            log(newmessages);

            if (adminQuery!==null) {
              log('admin message cmd:'+adminQuery["subject"]+"["+adminQuery["flags"]+"]");
              SendWaitMsg(res);
              waitCMD = true;
              setImmediate(processAdminCmd, adminQuery);
            }
            else {
              if(!waitCMD)
                res.send(newmessages);
              else {
                SendWaitMsg(res);
              }
            }
          }
        });
      } else {
        log('_tdxAPI error');
        res.redirect('/');
      }
    });

    /*
    * ----------------send email--------------------
    */
    app.post("/send",function(req,res,next){
      log('send');
      var msgheader = req.body.message;
      var msgcontent = req.body.content;
      var this_uid = req.body.msguid?req.body.msguid:0;
      msgheader = JSON.parse(msgheader);
      msgcontent = JSON.parse(msgcontent);
      //if(!_.isNumber(this_uid)){
      //  log(this_uid);
      //  this_uid = parseInt(this_uid);
      //}
      msgheader['uid'] = this_uid;
      /*----------------- directly send ----------------------------------------*/
      _email.send(msgheader,msgcontent,function(err,ans){
        if(err){
          _fileCache.cacheThis(ans,function(error) {
            if (error)
              log(error);
            else {
              log('drafted');
              res.send('DRAFTED');
            }
          })
          log(err);
        }
        else{
          res.send('SENT');
        }
      })
      /*----------------- end directly send -------------------------------------*/
      //var sentData = {
      //  "uid":this_uid,
      //  "modseq":'1',
      //  "flags":"\\Sent",
      //  "textcount":msgcontent["html"].length,
      //  "text":msgcontent["html"],
      //  "to":msgheader['To'],
      //  "from":"me",
      //  "subject":msgheader['Subject'],
      //  "date":Date.now()
      //}
      //var sentObj = {
      //  id:appconfig.byodimapboxes_ID,
      //  d:sentData
      //}
      //
      //log(sentObj);
      //_fileCache.cacheThis(sentObj,function(err){
      //  if(err)
      //  log(err)
      //  else{
      //    res.send('sent SUCCESS');
      //  }
      //});

    })
    /*********************************************************************************************/
    app.post(/message/,function(req,res,next){
      log('view message id is: '+req.query.id);
      var mailUid = req.query.id;
      _email.getOneMail(mailUid,_fileCache,function(mailerr,mailObj){
        if(mailerr){
          throw mailerr;
        }
        else if(mailObj !== null){
          res.send(mailObj);
        }
      })
    })
    /*********************************************************************************************/
    app.put(/message/,function(req,res,next){
      log('msg is '+req.body.message);
      var updatemsg = req.body.message;
      _email.update(updatemsg,_fileCache,function(err){
        if(err) {
          log(err);
        }
        else {
          log('deleted success');
          res.send('deleted SUCCESS');
        }
      });
    })
    /************************************************************************************************/
    app.post("/draft",function(req,res,next){
      var errors = null;
      var draftMsg = JSON.parse(req.body.message);
      _email.saveDraft(draftMsg,res);
    })

    /*************************************************************************************************/
    app.get("/logout", function(request, response) {
      _tdxAPI = null;
      authState = true;
      timerEnabled = false;
     // _tdxAccessToken = "";
     // _tdxLogin("");
      response.redirect("/");
    });
        
    var server = app.listen(config.port, config.hostname, function () {
      var host = server.address().address;
      var port = server.address().port;
      log('listening at http://%s:%s', host, port);
    });
  
    //_tdxConnection.start(config, tdxConnectionHandler);
    //_appServer.start(config, server, _tdxConnection);
    //_subscriptionManager.initialise(config, _tdxConnection, _appServer);
  };
  
  return {
    start: _start
  };
}());
