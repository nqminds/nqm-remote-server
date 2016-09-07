function onViewerClick(){
  console.log('click');
  webix.send('/files',null,"GET");
}

function onEmailClick(){
  webix.send('/email',null,"GET");
}

var contentUI = {
  type: "space",
  rows: [
    {},
    {
      cols: [
        {},
        {
          id:         "docButton",
          view:       "button",
          type:       "iconButton",
          icon:       "folder",
          label:      "Documents Viewer",
          inputWidth: 300,
          click: onViewerClick
        },
        {
          id:         "emailButton",
          view:       "button",
          type:       "iconButton",
          icon:       "envelope",
          label:      "SECD Email",
          inputWidth: 300,
          click: onEmailClick
        },
        {}
      ]
    },
    {},
  ]
};

webix.ready(function(){
})