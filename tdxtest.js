var config = require('./config.inbox.json');
var tdxAPI = (new (require('nqm-api-tdx'))(config));
/*tdxAPI.query("datasets/"+config.byodimapboxes_ID+"/data", null, null, null, function(qerr, data) {
      console.log(data);
      if(qerr) throw qerr;
    });*/

tdxAPI.query("datasets/H1xkhXW8K/data", null, null, null,null,function(qerr, data) {
      console.log(data);
      if(qerr) throw qerr;
    });
