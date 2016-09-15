
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
          width:600,
          height:400,
          scroll:"y",
          elements:[
            { rows:[
              { template:"Identification", type:"section"},
              { id:"id_mailboxname", view:"text", label:"ACCOUNT LABEL",labelWidth:200 },
              {id:"id_imapuserid",view:"text",label:"EMAIL ADDRESS",labelWidth:200},
              {id:"id_imap_userpass",view:"text",label:"PASSWORD",labelWidth:200},
            ]},
            { rows:[
              { template:"Receiving Server", type:"section"},
              {id:"id_imaphost",view:"text",label:"IMAP SERVER",labelWidth:200},
              {id:"id_imapport",view:"text",label:"PORT",labelWidth:200},
              {view:"checkbox", id:"id_tls", label:"USE TLS", value:1},
            ]},
            { rows:[
              { template:"Sending Server", type:"section"},
              {id:"id_smtphost",view:"text",label:"SMTP SERVER",labelWidth:200},
              {id:"id_smtpport",view:"text",label:"PORT",labelWidth:200},
            ]},
            { rows:[
              { template:"Activation", type:"section"},
            { id:"idfield", view:"text", label:"ID" },
            ]},
            { margin:5, cols:[
              { view:"button", value:"ACTIVATE" , type:"form",click:onActivateClick},
              { view:"button", value:"Use Server Configuration",click:onActivateClick}
            ]},
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

