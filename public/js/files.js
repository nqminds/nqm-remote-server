function loadDocument(fileName) {
//  $$("docView").load("/viewer/#/fileCache/"+fileName);
  document.getElementsByClassName("webix_template")[0].innerHTML = '<iframe src="/viewer/#/docViews/'+fileName+'" width="100%" height="100%"></iframe>';
}

function findParent(needle, haystack, payload) {
  for (var i = 0; i < haystack.length; i++) {
    if (haystack[i].id == needle) {
      haystack[i].data.push(payload);
      return true;
    }
  }
  for (var i = 0; i < haystack.length; i++) {
    if (typeof haystack[i].data != 'undefined') {
      if (haystack[i].data.length > 0) {
        if (findParent(needle, haystack[i].data, payload)) return true;
      }
    }
  }
  return false;

}

var treeData = [
  {id:"root", value:"Files", open: true, data:[]
  }
]

var subFolders = [];

for (var i = 0; i < _folders.length; i++) {
  if (_folders[i].parents.length < 1) treeData[0].data.push({id: _folders[i].id, value: _folders[i].name, open: false, data: []});
  else subFolders.push(_folders[i]);
}

for (var i = 0; i < subFolders.length; i++) {
  if (!findParent(subFolders[i].parents[0], treeData[0].data, {id: subFolders[i].id, value: subFolders[i].name, open: false, data: []}))
    treeData[0].data.push({id: subFolders[i].id, value: subFolders[i].name, open: false, data: []});
}

for (var i = 0; i < _config.length; i++) {

  if (!findParent(_config[i].parents[0], treeData[0].data, { id: _config[i].store, open: true, value: _config[i].name, uid: _config[i].id, class: "file", onclick: "loadDocument(this.parentElement.getAttribute(\"webix_tm_id\"))"}))
    treeData[0].data.push({ id: _config[i].store, open: true, value: _config[i].name, uid: _config[i].id, class: "file", onclick: "loadDocument(this.parentElement.getAttribute(\"webix_tm_id\"))"});

}


var contentUI = {
  type: "space",
  cols: [
    {
      header: "notifications",
      collapsed: true,
      body: {
        rows: [
          { view: "label", template: "<div>nick allott requests access to file-system.read</div>" },
          { view: "label", template: "<div>nick allott requests access to front-room.temperature</div>" },
          {}
        ]
      }
    },
    { 
      header:"files",
      body: {
        rows: [
          {
            view:"tree",
            id:"fileTree", 
            gravity:1.0, 
            select:true, 
            data: treeData
          },
          {
            view:"template",
            id: "docView",
            gravity: 1.0,
            src: ""
          }
        ]
      }
    }
  ]};


function delegate(el, evt, sel, handler) {
    el.addEventListener(evt, function(event) {
        var t = event.target;
        while (t && t !== this) {
            if (t.matches(sel)) {
                handler.call(t, event);
            }
            t = t.parentNode;
        }
    });
}

function setupDocLoad() {
  var x = document.getElementsByClassName("webix_tree_file");
  for(var i = 0; i < x.length; i++)  x[i].setAttribute("onclick", "loadDocument(this.parentElement.getAttribute(\"webix_tm_id\"))");
}

webix.ready(function() {
  setupDocLoad();
  delegate(document, "click", ".webix_tree_close", function(event) {
    setupDocLoad();
  });

  $$('docButton').show();
  $$('emailButton').show();
});