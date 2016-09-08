var exports = module.exports = {};
var https = require("https");
var fs = require('fs');
var _ = require('lodash');
var attachmentPath = "public/attachments/";
var docPath = "public/docViews/";
var path = require("path");
var dirname = path.dirname(require.main.filename);
var cachedDocsPath = 'fileCache.json';
var structurePath = "fileStructure.json";

function downloadFile(url, fileName,cb) {

  var file = fs.createWriteStream(fileName);
  https.get(url, function(res) {
    res.pipe(file);
    file.on('finish', function() {
      file.close();
    });

  }).on('error', function() {
    console.log("Could not write file");
    cb('err');

  });
}
function createFolder(name) {
  var folderPath = path.join(__dirname, name);
  console.log('folder name');
  console.log(folderPath);
  fs.access(folderPath,fs.F_OK,function(err){
    if(err){
      fs.mkdirSync(folderPath);
    }
  })
  // try {
  //   if (!fs.statSync(folderPath)) {
  //     fs.mkdirSync(folderPath);
  //   }
  // } catch (e) {
  //   //console.log("createFolder: ",e);
  // }
}

function cacheFiles(fileList, oldList, token) {

  for (var i = 0; i < fileList.length; i++) {
    var url = 'https://q.nqminds.com/v1/resource/' + fileList[i].id + '?access_token=' + token;
    var fileName = path.join(__dirname,docPath) + fileList[i].store;
    console.log(url);
    console.log(fileName);
    fs.stat(fileName, function(err, stats) {
      if (err) {
        console.log(this.fileName + " does not exist in cache, downloading")
        downloadFile(this.url, this.fileName);
      }
      else if (stats.isFile()) {
        var j = 0;
        while (j < oldList.length) {
          if (fileList[this.i].id == oldList[j].id) {
            if (fileList[this.i].modified != oldList[j].modified){
              console.log(this.fileName + " is out of date, redownloading")
              downloadFile(this.url, this.fileName);
            }
            j = oldList.length;
          }
          j++;
        }
      }
    }.bind({i: i, url: url, fileName: fileName}))

  }

}


function createCache(fileList, token, fileStruct) {
  var oldList;
  fs.readFile("fileCache.json", function(err, data) {
    if (err) {
      console.log("Meta corrupt or not found");
      oldList = [];
    }
    else {
      try{
        oldList = JSON.parse(data);
      } catch(e) {
        oldList = [];
      }
    }

    fs.writeFile(path.join(__dirname,cachedDocsPath), JSON.stringify(fileList), function(err) {
      if (err) console.log("Failed to write meta to cache");
      cacheFiles(fileList, oldList, token);
    })
    if(fileStruct != null) {
      fs.writeFile(path.join(__dirname,structurePath), JSON.stringify(fileStruct), function (err) {
        if (err) console.log("Failed to write file structure to cache");
      })
    }

  })
};

function getDocs(){
  var ans = {};
  ans.error = null;
  ans.data = null;

  try {
    if(fs.statSync(path.join(__dirname,cachedDocsPath))) {
      var fileContent = fs.readFileSync(path.join(__dirname,cachedDocsPath), 'utf8').toString();
      //console.log(fileContent);
      ans.data = JSON.parse(fileContent);
    }
  }catch(e){
    ans.error = e;
  }
  //console.log(ans);
  return ans;
}
exports.getAttachments = function(token,cb){
  createFolder(attachmentPath);
  var docs = getDocs();
  if(docs.error == null){
    console.log('get IVAN doc error');
    cb(docs.error,null);
  }
  else {
    var docNames = [];
    if (docs.data != null) {
      _.forEach(docs.data, function (element) {
        var docName = element['name'];
        docName += '.' + element['schemaDefinition']['parent'];
        var docId = element['store']
        var docNameObj = {
          docName: docName,
          docId: docId
        }
        docNames.push(docNameObj);
      })
    }
    cb(null,docNames);
  }
}

exports.getFiles = function(cb, token) {
  createFolder(docPath);
  var url = 'https://q.nqminds.com/v1/datasets?access_token=' + token + '&filter={"baseType":"rawFile"}';

  https.get(url, function(res) {
    var body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.on('end', function() {
      var fileList = JSON.parse(body);

      var fileUrl = 'https://q.nqminds.com/v1/datasets?access_token=' + token + '&filter={"baseType":"resourceGroup"}';

      https.get(fileUrl, function(res) {
        var body = '';

        res.on('data', function(chunk) {
          body += chunk;
        })

        res.on('end', function(){
          var folderList = JSON.parse(body);
          createCache(fileList, token, folderList);
          cb.render("files", { config: fileList, folders: folderList});
        })

      })



    });

  }).on('error', function() {
    fs.readFile('fileCache.json', function(err, data) {

      if (err) response.status(500).send('Internal Server Error');

      else {
        var fileList = JSON.parse(data);
        var folderList = [];
        fs.readFile('fileStruct.json', function(err, data) {
          if (err) response.status(500).send('Internal Server Error');
          else {
            folderList = JSON.parse(data);
            cb.render("files", { config: fileList, folders: folderList });
          }
        })

      }
    });

  });


};
