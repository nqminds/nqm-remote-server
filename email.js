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
  var _workingDir = null;
  var dirname = path.join(__dirname,'public/');  
  var dictDrafts = {};
  var dictInbox = {};

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

  /*--------------------------------- update local file ----------------------------------------*/
  function updateLocal(updateObj,updateFile){
    var error = null;
    fs.stat(updateFile,function(err,stat){
      if(err){
        error = err;
      }
      else{
        if(updateObj !== null) {
          dictInbox[updateObj['uid']] = updateObj;
        }
        try{
          fs.unlinkSync(path.join(_workingDir, "inbox.json"));
        } catch(err) {
          log("inbox.json updating:"+err);
        }

        //log('new dictInbox is:');
        //log(dictInbox);
        for (var key in dictInbox) {
          fs.writeFile(path.join(_workingDir, "inbox.json"), JSON.stringify(dictInbox[key]) + "\r\n", {encoding:"utf8",flag:"a"},function (err) {
            if (err)
              result.send("inbox.json saving err");
          });
        }

      }
      return error;
    })
  }
  /*----------------------------------- end update local file-----------------------------------*/

  function createFolder(name) {
    var folderPath = path.join(dirname, name);
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
    } catch (e) {
      console.log("createFolder: ",e);
    }
  }
  function getTBXtable(tdxAPI,cb){
    var errors;
    tdxAPI.query("datasets/" + this._config.emailtable_ID + "/data", null, null, null, function (qerr, data) {
      if (qerr) {
        log('cannot get the data');
        cb("NULL DATA", null);
        dictInbox = {};
      }
      if (data != null) {

        var data_array = data.data;
        var saved_array = [];
        var savedObj = {};
        if(data_array !== undefined && data_array.length>0) {

          for (var i = 0; i < data_array.length; i++) {
            if (data_array[i]['flags'].indexOf("\\Deleted") !== -1) {
              data_array[i]['folder'] = 4;
            }
            else if (data_array[i]['flags'].indexOf("\\Inbox") !== -1 && data_array[i]['flags'].indexOf("\\deleted") === -1) {
              data_array[i]['folder'] = 1;
            }
            else if (data_array[i]['flags'].indexOf("\\Sent") !== -1) {
              data_array[i]['folder'] = 2;
            }
            else if (data_array[i]['flags'].indexOf("\\Draft") !== -1) {
              data_array[i]['folder'] = -1;
            }
            savedObj = _.pick(data_array[i], ["uid", "to", "from", "subject", "date", "flags", "folder"]);
            saved_array.push(savedObj);
            dictInbox[savedObj.uid] = savedObj;

            fs.writeFile(path.join(_workingDir, data_array[i]['uid'] + '.json'), JSON.stringify(data_array[i], null, 4), {
              encoding: "utf8",
              flag: "w"
            }, function (save_err) {
              if (save_err) {
                log(save_err);
                errors = save_err;
              }
            })

            fs.writeFile(path.join(_workingDir, 'inbox.json'), JSON.stringify(savedObj) + "\r\n", {
              encoding: "utf8",
              flag: "a+"
            }, function (save_err) {
              if (save_err) {
                log(save_err);
                errors = save_err;
              }
            })

            if (data_array[i]['flags'].indexOf("\\Seen") === -1) {
              log('unseen mails are');
              log(data_array[i]);
              data_array[i]['from'] = '<b>' + data_array[i]['from'] + '</b>';
              data_array[i]['date'] = '<b>' + data_array[i]['date'] + '</b>';
              data_array[i]['subject'] = '<b>' + data_array[i]['subject'] + '</b>';
            }
          }
        }
        else{
          errors = "data_array not found";
        }
        if(errors == null)
          cb(null,data_array);
        else
          cb('errors',null);
      }
    })
  }
  /*--------------------------- get One Mail mailparsered---------------------*/
  Inbox.prototype.getOneMail = function(mailUid,cb) {
    log('read filename is:'+mailUid);
    var mailObj = JSON.parse(fs.readFileSync(path.join(_workingDir,mailUid+'.json')));
    if(mailObj["flags"].indexOf("\\Seen") === -1 && mailObj['flags'].indexOf("\\localDraft") === -1){
      var newMailObj = _.pick(mailObj,["uid", "to", "from", "subject", "date", "flags", "folder"]);
      mailObj['flags'] += ",\\Seen";
      newMailObj['flags'] += ",\\Seen";
      updateLocal(newMailObj,path.join(_workingDir,"inbox.json"));
      fs.writeFileSync(path.join(_workingDir,newMailObj['uid']+".json"),JSON.stringify(mailObj),{enconding:"utf8",flag:"w"});
    }

    var mailparser = new MailParser({streamAttachments: true});
    mailparser.on("end", function (mail_object) {
      createFolder('attachments');
      if (mail_object.attachments != undefined) {
        mail_object.attachments.forEach(function (attachment) {
          log('attachments', attachment.fileName);
          var output = fs.createWriteStream(path.join(__dirname, 'public/attachments/' + attachment.generatedFileName));
          attachment.stream.pipe(output);
        });
      }
      if (mail_object.html === undefined && mail_object.text !== undefined) {
        mailObj['text'] = mail_object.text;
      }
      else if(mail_object.html !== undefined){
        mailObj['text'] = mail_object.html;
      }
      mailObj['attachments'] = mail_object['attachments'];
      //log(mailObj['text']);
      cb(mailObj);
    });
    mailparser.write(mailObj['text']);
    mailparser.end();
  }
  /*---------------------------- end mailparser -------------------------------*/
  Inbox.prototype.getInbox = function(tdxAPI,cb) {
    var self = this;
  	var localDrafts = [];

    try{
      var drafts = fs.readFileSync(path.join(_workingDir,'drafts.json')).toString().split("\r\n");
      dictDrafts = {};

      for (var i = 0; i < drafts.length - 1; i++) {
        var dparsed = JSON.parse(drafts[i]);
        localDrafts.push(dparsed);
        dictDrafts[dparsed.uid] = dparsed;
      }
    }
    catch(e){
      log('local draft error:'+e);
      localDrafts = [];
	    dictDrafts = {};
    }

    fs.stat(path.join(_workingDir,"inbox.json"),function(err,stat){
      if(err){
        getTBXtable.call(self,tdxAPI,function(qerr,data_array){
          if(qerr)
            cb(qerr,null);
          else{
            cb(null,data_array.concat(localDrafts));
          }
        });
      }
    else{
        dictInbox = {};
        var oldMessages = fs.readFileSync(path.join(_workingDir,"inbox.json")).toString();
        var ansMessages_array = [];
        log('read from inbox.json is:');
        var oldMessages_array = oldMessages.split("\r\n");
        if(oldMessages_array.length>0) {
          for (var i = 0; i < oldMessages_array.length-1; i++) {
            var oldMessageObj = null;
            oldMessageObj = JSON.parse(oldMessages_array[i]);
            dictInbox[oldMessageObj['uid']] = oldMessageObj;
            if (oldMessageObj['flags'].indexOf("\\Seen") === -1) {
              oldMessageObj['from'] = '<b>' + oldMessageObj['from'] + '</b>';
              oldMessageObj['date'] = '<b>' + oldMessageObj['date'] + '</b>';
              oldMessageObj['subject'] = '<b>' + oldMessageObj['subject'] + '</b>';
            }
            ansMessages_array.push(oldMessageObj);
          }

          cb(null,ansMessages_array.concat(localDrafts));
        }
        else
          cb('error',null);
      }
    })

  }

  /*-------------------------- refresh function --------------------------*/

  Inbox.prototype.getnewInbox = function(tdxAPI,cb) {
    log('get new inbox');
    var self = this;
    var new_array = [];
    tdxAPI.query("datasets/" + self._config.emailtable_ID + "/data", {flags:{$regex:'^((?!\Seen).)*$'}}, null, null, function (qerr, data) {
      if (qerr) {
        cb(qerr,null);
      }
      else{
        var unseen_array = data.data;
        for(var i=0;i<unseen_array.length;i++){
          if(!_.has(dictInbox,unseen_array[i]['uid'])){
            var newmessageObj = _.pick(unseen_array[i],["uid", "to", "from", "subject", "date", "flags", "folder"]);
            fs.writeFileSync(path.join(_workingDir,newmessageObj['uid']+".json"),JSON.stringify(newmessageObj),{enconding:"utf8",flag:"w"});
            new_array.push(newmessageObj);
            dictInbox[unseen_array[i]['uid']] = newmessageObj;
          }
        }
        updateLocal(null,'inbox.json');
        cb(new_array,null)
      }
    });
  }

  /*--------------------------- end of refresh function -------------------*/
  /*--------------------------- update function ---------------------------*/
  Inbox.prototype.update = function(oldmsg,fileCache,cb){
    var self = this;
    var errors = null;
    log('update');
    oldmsg = JSON.parse(oldmsg);
    if(oldmsg['flags'].indexOf("\\localDraft") !== -1){
      try{
        fs.unlinkSync(path.join(_workingDir, oldmsg['uid']+".json"));
        fs.unlinkSync(path.join(_workingDir, "drafts.json"));
        dictDrafts = _.omit(dictDrafts,oldmsg['uid']);
      } catch(err) {
        log("drafts.json deletion:"+err);
      }
      log('new dictDraft is:');
      log(dictDrafts);
      for (var key in dictDrafts) {
        fs.writeFile(path.join(_workingDir, "drafts.json"), JSON.stringify(dictDrafts[key]) + "\r\n", {
          encoding: "utf8",
          "flag": "a"
        }, function (err) {
          if (err)
            result.send("Draft error");
        });
      }
      cb(null);
    }
    else {
      var msg = JSON.parse(fs.readFileSync(path.join(_workingDir, oldmsg['uid'] + ".json")));
      oldmsg = _.pick(oldmsg, ["uid", "to", "from", "subject", "date", "flags", "folder"]);

      var updateData = {
        uid: msg['uid'],
        textcount: msg['textcount'],
        text: msg['text'],
        flags: msg['flags'] + ",\\Deleted",
        modseq: msg['modseq'],
        from: msg['from'],
        to: msg['to'],
        subject: msg['subject'],
        date: msg['date']
      };
      var localupdateData = _.omit(updateData, ["text", "modseq", "textcount"]);
      errors = updateLocal(localupdateData, path.join(_workingDir, "inbox.json"));
      try {
        fs.writeFileSync(path.join(_workingDir, updateData['uid'] + ".json"), JSON.stringify(updateData), {
          enconding: "utf8",
          flag: "w"
        })
      } catch (e) {
        error = e;
      }
      var updateObj = {
        id: self._config.emailtable_ID,
        d: updateData
      }
      fileCache.cacheThis(updateObj, function (err) {
        if (err)
          cb(err);
        else if (errors == null)
          cb(null);
      });
    }
  }
  /*--------------------------- END update function ---------------------------*/
  Inbox.prototype.send = function(msgheader,msgcontent,cb){
    var self = this;
    log('send email');
    var replyTo = msgheader['uid']>0?msgheader['uid']:"";
    var draftmsgUid = msgheader['uid'];
    if(typeof draftmsgUid === 'string' && draftmsgUid.indexOf("d") !== -1){
      log('deleting a draft locally');
      try{
        fs.unlinkSync(path.join(_workingDir, draftmsgUid+".json"));
        fs.unlinkSync(path.join(_workingDir, "drafts.json"));
        dictDrafts = _.omit(dictDrafts,draftmsgUid);
      } catch(err) {
        log("drafts.json deletion:"+err);
      }

      for (var key in dictDrafts) {
        fs.writeFile(path.join(_workingDir, "drafts.json"), JSON.stringify(dictDrafts[key]) + "\r\n", {
          encoding: "utf8",
          "flag": "a"
        }, function (err) {
          if (err)
            result.send("Draft error");
        });
      }
    }
    var transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'byod23145842@gmail.com', // Your email id
        pass: 'Zg3NgLqRZEhr' // Your password
      }
    });

    var mailOptions = {
      to: msgheader['To'],
      cc: msgheader['Cc'],
      bcc:msgheader['Bcc'],
      subject: msgheader['Subject'],
      html: msgcontent['html'],
      flags:"\\Sent"
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
          path:path.join(__dirname,"public/docViews/")+o['docId']
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
      id:self._config.emailtable_ID,
      d:mailOptions
    }
    log(sentObj);
    log(mailOptions);


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

  Inbox.prototype.saveDraft = function(draftMsg,result){
    var dateNow = Date.now();
    var newmsg ={
      'uid':(draftMsg['draftUid']===undefined)?'d'+dateNow:draftMsg['draftUid'],
      'to':draftMsg['To'],
      'cc':draftMsg['Cc'],
      'Bcc':draftMsg['Bcc'],
      'from':"me",
      'subject':draftMsg['Subject'],
      'date':new Date(dateNow).toString(),
      'flags':"\\localDraft",
      'folder':3
    }
    var extendedMsg = JSON.parse(JSON.stringify(newmsg));

    dictDrafts[newmsg['uid']] = newmsg;

    try{
      fs.unlinkSync(path.join(_workingDir, "drafts.json"));
    } catch(err) {
      log("drafts.json deletion:"+err);
    }

    for (var key in dictDrafts) {
      fs.writeFile(path.join(_workingDir, "drafts.json"), JSON.stringify(dictDrafts[key]) + "\r\n", {encoding:"utf8","flag":"a"},function (err) {
        if (err)
          result.send("Draft error");
      });
    }

    _.assign(extendedMsg,{text:draftMsg['mail-content']});

    if("attachments" in draftMsg)
      _.assign(extendedMsg,{attachments:draftMsg['attachments']});

    fs.writeFile(path.join(_workingDir, newmsg['uid'] + ".json"), JSON.stringify(extendedMsg), {enconding:"utf8","flag":"w"},function (err) {
      if (err) result.send("draft error");
      else result.send(newmsg);
    });
  }

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
}());
