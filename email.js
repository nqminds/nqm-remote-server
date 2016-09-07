"use strict"

module.exports = (function() {
  var log = require("debug")("email");
  var config = require("./config.json");
  var http = require("http");
  var https = require("https");
  var gRequest = require('request');
  var querystring = require("querystring");
  var fs = require('fs');
  var util = require('util');
  var https = require('https');
  var readline = require('readline');
  var nodemailer = require('nodemailer');
  var request = require("request");
  var _ = require('lodash');
  var path = require('path');
  var MailParser = require('mailparser').MailParser;
  var emlPath = path.join(__dirname,'mailparser/email.eml');
  var _workingDir = null;

  var handleError = function(err, response, log, cb) {
    if (err || response.statusCode !== 200 || (response.body && response.body.error)) {
      if (!err) {
        err = new Error("[status code " + response.statusCode + "] " + ((response.body && response.body.error) || "unknown error"));
      }
      err.statusCode = response ? response.statusCode : 500;
      log("failure [%s]", err.message);
      cb(err);
      // Error handled.
      return true;
    } else {
      // No error.
      return false;
    }
  };

  var Inbox = function(config, workingDir){
    this._config = config;
    this._sync = null;
	_workingDir = workingDir;
  }
  /*-------------------------- upsert function -----------------------*/
  function upsertDataBulk(commandHost, accessToken, datasetId, data, cb) {
    var url = util.format("%s/commandSync/dataset/data/upsertMany", commandHost);
    var bulk = {};
    bulk.datasetId = datasetId;
    bulk.payload = [].concat(data);
    log(data);
    log("sending upsertMany [%d - %d bytes]",data.length, JSON.stringify(data).length);
    request({ url: url, timeout: 3600000, method: "post", headers: { authorization: "Bearer " + accessToken }, json: true, body: bulk }, function(err, response, content) {
      if (!handleError(err, response, log, cb)) {
        log("result from server: %j", response.body);
        cb(null);
      }
    });
  }
  /*---------------------------end upsert function ---------------------------*/
  Inbox.prototype.getInbox = function(tdxAPI, cb){
    var self = this;
    log(self._config.byodimapboxes_ID);
    log('authenticate');
    tdxAPI.query("datasets/" + self._config.emailtable_ID + "/data", null, null, null, function (qerr, data) {
      if (qerr){
        cb(qerr,null);
      }
      if(data != null){
        var data_array = data.data;
        for(let i=0;i<data_array.length;i++){
          var mailparser = new MailParser({streamAttachments:true});
          mailparser.on("end", function(mail_object){
            if(mail_object.html === undefined){
              data_array[i]['text'] = mail_object.text;
            }
            else
              data_array[i]['text'] = mail_object.html;
            if(data_array[i]['flags'].indexOf("\\Deleted") !== -1){
              data_array[i]['folder'] =4;
            }
            else if(data_array[i]['flags'].indexOf("\\Inbox") !== -1 && data_array[i]['flags'].indexOf("\\deleted") === -1) {
              data_array[i]['folder'] = 1;
            }
            else if(data_array[i]['flags'].indexOf("\\Sent") !== -1){
              data_array[i]['folder'] = 2;
            }
            else if(data_array[i]['flags'].indexOf("\\Draft") !== -1){
              data_array[i]['folder'] = 3;
            }
            if(data_array[i]['flags'].indexOf("\\Seen") === -1) {
              data_array[i]['from'] = '<b>' + data_array[i]['from'] + '<b>';
              data_array[i]['date'] = '<b>' + data_array[i]['date'] + '<b>';
              data_array[i]['subject'] = '<b>' + data_array[i]['subject'] + '<b>';
            }
          });
          //var emailstring = fs.readFileSync(emlPath);
          mailparser.write(data_array[i]['text']);
          mailparser.end();
          //fs.createReadStream(emlPath).pipe(mailparser);
        }
        cb(null,data_array);
		fs.writeFile(path.join(_workingDir,'inbox.json'),JSON.stringify(data_array,null,4),{encoding:"utf8",flag:"w"},function(err){
          if(err)
            log(err);
          else
            log('save done');
        })
      }
    });
  }
  /*--------------------------- update function ---------------------------*/
  Inbox.prototype.update = function(msg,fileCache,cb){
    var self = this;
    log(self._config.commandHost);
    log('update');

    msg = JSON.parse(msg);
    log(msg['textcount']);
    var updateData = {
      uid:msg['uid'],
      textcount:msg['textcount'],
      text:msg['text'],
      flags:msg['flags']+",\\Deleted",
      modseq:msg['modseq'],
      from:msg['from'],
      to:msg['to'],
      subject:msg['subject'],
      date:msg['date']
    };
    var updateObj = {
      id:self._config.byodimapboxes_ID,
      d:updateData
    }
    //upsertDataBulk(self._config.commandHost,tdxToken,self._config.byodimapboxes_ID,updateObj,function(err){
    //  log(err);
    //  if(err)
    //    cb(err,null);
    //  else
    //  cb(null,'deleted');
    //})
    fileCache.cacheThis(updateObj,function(err){
      if(err)
        cb(err);
      else
        cb(null);
    });

  }
  /*--------------------------- END update function ---------------------------*/
  Inbox.prototype.send = function(msgheader,msgcontent,cb){
    var self = this;
    log('send email');
    var replyTo = msgheader['uid']>0?msgheader['uid']:"";
    var transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'bingjie@nquiringminds.com', // Your email id
        pass: 'bingjiegao10' // Your password
      }
    });

    var mailOptions = {
      to: msgheader['To'],
      cc: msgheader['Cc'],
      subject: msgheader['Subject'],
      html: msgcontent['html']
    };
    var sentData = {
      "uid":msgheader['uid'],
      "modseq":'1',
      "flags":"\\Sent",
      "textcount":msgcontent["html"].length,
      "text":msgcontent["html"],
      "to":msgheader['To'],
      "from":"me",
      "subject":msgheader['Subject'],
      "date":Date.now()
    };

    if(msgcontent['attachments'].length>0){
      var attachArray = [];
      _.forEach(msgcontent['attachments'],function(o){
        var attachfileObj = {
          filename:o['docName'],
          path:"./public/docViews/"+o['docId']
        }
        attachArray.push(attachfileObj);
      })
      var attach = {
        attachments:attachArray
      }
      _.assign(mailOptions,attach);
      _.assign(sentData,attach);
    }

    log('sent results are');

    if(replyTo.length>0){
      var InReplyTo = {
        "In-Reply-To":replyTo
      }
      _.assign(mailOptions,InReplyTo);
      _.assign(sentData,InReplyTo);
    }
    var sentObj = {
      id:self._config.byodimapboxes_ID,
      d:sentData
    }
    log(sentObj);
    log(mailOptions);
    //cb('err',sentObj);

    transporter.sendMail(mailOptions,function(err,info){
      if(err){
        log(err);
        cb(err,sentObj);
      }
      else {
        cb(null, info.response);
      }
    })
  }
  /*--------------------------- END send function ----------------------------*/
  Inbox.prototype.getAttachmentsList = function(cb){
    var self = this;
    self._tdxAPI.query("datasets/" + self._config.byodattachment_ID + "/data", null, null, null, self._config.byodimapboxes_token,function (qerr, data) {
      if(qerr) {
        log(qerr);
        cb(qerr,null);
      }
      else{
        log('attachemnt ids are ');
        fs.writeFile(path.join(_workingDir,'attachments.json'),JSON.stringify(data,null,4),{encoding:"utf8",flag:"w"},function(err){
          if(err)
            cb(err,null);
          else
            cb(null,data);
        });
      }
    })
  }
  return Inbox;
}())
