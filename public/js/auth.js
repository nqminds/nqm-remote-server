
var contentUI = {
  type: "space",
  rows: [
    {},
    {
      cols: [
        {},
        {
          view:"form",
		  id: "idform",
          elements:[
            { id:"idfield", view:"text", label:"ID" },
            {cols:[
              { view:"button", value:"Activate", type:"form", click: onActivateClick },
              { view:"button", value:"Cancel", click: onCancelClick }
            ]}
          ]
        },
        {}
      ]
    },
    {},
  ]
};

function onActivateClick(){
  webix.send('/auth',{"userID":$$("idfield").getValue()},"GET");
}

function onCancelClick(){
}

