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

  var bodyParser = require('body-parser');
  var _emaildriver = require("./email.js")
  var emailconfig = require("./config.inbox.json");
  var _email = null;
  var _filedriver = require('./fileCache');
  var _fileCache = new _filedriver(emailconfig);
  var _tdxAPI =  (new (require("nqm-api-tdx"))(emailconfig));
  var syncdriver = require('./sync');
  var fs = require('fs');
  var _sync = null;
  var _workingDir = null;

  fs.stat('./'+tokenPath,function(err,stats){
    if(!err) {
      var TokenObj = require('./'+tokenPath);
      //if the accessToken is expired
      log('time is ');
      log(TokenObj);
      log(TokenObj.timestamp);
      if(Date.now()/1000-TokenObj.timestamp/1000<3590) {
        _tdxAccessToken = require('./' + tokenPath).token;
        _sync = new syncdriver(emailconfig, _tdxAccessToken);
      }
    }
  })


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

	_workingDir = _env.homedir+"/."+_env.name;
	_email =new _emaildriver(emailconfig, _workingDir);

	try{
		fs.statSync(_workingDir);
	} catch(err) {
		if (err && err.errno!=-2)
        	throw err;
		
		try{
			fs.mkdirSync(_workingDir);
		} catch(err) {
			throw err;
		}
	}
 
    app.set("views", __dirname + "/views");
    app.set('view engine', 'jade');
    app.use(express.static(__dirname  + '/public'));
    app.use('/viewer', express.static(__dirname +'/node_modules/node-viewerjs/release'));

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));


    app.get('/', function (req, res) {
		_tdxAPI.authenticate(emailconfig.emailtable_token, emailconfig.emailtable_Pass, function(imaperr, accessToken){
			if (imaperr) log(imaperr);

			log("Email access token:"+accessToken);

			_emailAccessToken = accessToken;
      _sync = new syncdriver(emailconfig,_emailAccessToken);
        	res.render("apps", { config: config });
		});
    });

/*    
    app.get("/login", function(req, res) {
      res.render("login",{ inboxconfig: emailconfig});
    });
  
    app.get("/auth", function(request, response) {
      var oauthURL = util.format("%s/?rurl=%s/oauthCB", config.authServerURL, config.hostURL);
      response.writeHead(301, {Location: oauthURL});
      response.end();
    });
*/    
    app.get("/oauthCB", function(request, response) {
      var up = url.parse(request.url);
      var q = querystring.parse(up.query);
      if (q.access_token) {
        _tdxAccessToken = q.access_token;
        _subscriptionManager.setAccessToken(q.access_token);
        response.writeHead(301, {Location: config.hostURL});

        /*assign _sync value with tdxAccessToken*/
        _sync = new syncdriver(emailconfig,_emailAccessToken);
        /*-------------------------------------------------*/
        /*--------------- save token json -----------------*/
        var tdxTokenObj = {
          token:_emailAccessToken,
          timestamp:Date.now()
        }
        fs.writeFile(tokenPath,JSON.stringify(tdxTokenObj),{encoding:'utf8',flag:'w'},function(err){
          if(!err)
            response.end();
        })
        /*-------------------------------------------------*/
      }
    });

    /*---------------- get files -----------------------------*/
    app.get("/files", function(request, response) {
        _cache.getFiles(response, _tdxAccessToken);
    });

    /*
    * get email
    */
    app.get('/email', function (req, res,next) {
        _fileCache.setSyncHandler(_sync);
      log('get /email token: '+_emailAccessToken);
        _email.getInbox(_tdxAPI, function(err,ans){
          if(err) {
            log(err);
            res.redirect("/");
          }
          else{
            _cache.getAttachments(_emailAccessToken, function (docNames) {
                log('get docnames');
                log(docNames);
                res.render("email", {messages: ans,docNames:docNames});
            })
          }
        })
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
      if(!_.isNumber(this_uid)){
        log(this_uid);
        this_uid = parseInt(this_uid);
      }
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
      //  id:emailconfig.byodimapboxes_ID,
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
      _email.getOneMail(mailUid,function(mailContent){
        log('callback result is:');
        log(mailContent);
        //log(JSON.parse(mailContent));
        res.send(mailContent);
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
    
    app.get("/logout", function(request, response) {
      _tdxAccessToken = "";
     // _tdxLogin("");
      response.redirect("/login");
    });
        
    var server = app.listen(config.port, config.hostname, function () {
      var host = server.address().address;
      var port = server.address().port;
      log('listening at http://%s:%s', host, port);
    });
  
    _tdxConnection.start(config, tdxConnectionHandler);
    _appServer.start(config, server, _tdxConnection);
    _subscriptionManager.initialise(config, _tdxConnection, _appServer);
  };
  
  return {
    start: _start
  };
}());
