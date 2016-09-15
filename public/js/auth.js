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
              { template:"Receiving Server", type:"section"},
              {id:"id_mailboxname",view:"text",name:"mailboxname",label:"IMAP Name",labelWidth:200,
                invalidMessage: "Mailbox name cannot be empty"},
              {id:"id_imapuser",view:"text",name:"imapuser",label:"IMAP User",labelWidth:200,
                invalidMessage: "IMAP email address cannot be empty"},
              {id:"id_imappass",view:"text",name:"imappass",label:"IMAP Password",labelWidth:200,
                invalidMessage: "IMAP uer password cannot be empty"},
              {id:"id_imaphost",view:"text",name:"imaphost",label:"IMAP SERVER",labelWidth:200,
                invalidMessage: "IMAP host cannot be empty"},
              {id:"id_imapport",view:"text",name:"imapport",label:"PORT",labelWidth:200,
                invalidMessage: "IMAP port cannot be empty"},
              {view:"checkbox", id:"id_imaptls", label:"USE TLS", value:1}
            ]},
            { rows:[
              { template:"Sending Server", type:"section"},
              {id:"id_smtpmailbox",view:"text",name:"smtpmailbox",label:"SMTP Name",labelWidth:200,
                invalidMessage: "SMTP mailbox name cannot be empty"},
              {id:"id_smtpuser",view:"text",name:"smtpuser",label:"SMTP User",labelWidth:200,
                invalidMessage: "SMTP address cannot be empty"},
              {id:"id_smtppass",view:"text",name:"smtppass",label:"SMTP Password",labelWidth:200,
                invalidMessage: "SMTP password cannot be empty"},
              {id:"id_smtphost",view:"text",name:"smtphost",label:"SMTP SERVER",labelWidth:200,
                invalidMessage: "SMTP host cannot be empty"},
              {id:"id_smtpport",view:"text",name:"smtpport",label:"SMTP PORT",labelWidth:200,
                invalidMessage: "SMTP port cannot be empty"}
            ]},
            //{ rows:[
            //{ template:"Activation", type:"section"},
            { id:"id_field", view:"text", name:"activation",label:"ID",
              required:true,
              validate:webix.rules.isNotEmpty,
              invalidMessage: "Activation code cannot be empty"},
            //]},
            { margin:10, cols:[
              { view:"button", value:"Use Form Config" , click:onFormClick},
              { view:"button", value:"Use Server Config",click:onServerClick}
            ]}
          ],
          rules:{
            "mailboxname":webix.rules.isNotEmpty,
            "imapuser":webix.rules.isEmail,
            "imappass":webix.rules.isNotEmpty,
            "imaphost":webix.rules.isNotEmpty,
            "imapport":webix.rules.isNotEmpty,
            "smtpmailbox":webix.rules.isNotEmpty,
            "smtpuser":webix.rules.isEmail,
            "smtppass":webix.rules.isNotEmpty,
            "smtphost":webix.rules.isNotEmpty,
            "smtpport":webix.rules.isNotEmpty
          }
        },
        {}
      ]
    },
    {},
  ]
};

function onFormClick() {
  if($$('idform').validate()) {
    onButtonClick(1);
  }
}

function onServerClick() {
  if($$('id_field').validate()) {
    onButtonClick(0);
  }
}

function onButtonClick(type){
  var accountObj = {
    mailboxname:$$('id_mailboxname').getValue(),
    imaphost:$$('id_imaphost').getValue(),
    imapuserid:$$('id_imapuser').getValue(),
    imapuserpass:$$('id_imappass').getValue(),
    imapport:$$('id_imapport').getValue(),
    imaptls:$$('id_imaptls').getValue(),
    userName:$$('id_smtpmailbox').getValue(),
    smtpLogin:$$('id_smtpuser').getValue(),
    smtpPass:$$('id_smtppass').getValue(),
    smtpServer:$$('id_smtphost').getValue(),
    smtpPort:$$('id_smtpport').getValue(),
    userID:$$('id_field').getValue()
  }

  var postJSON = {type:type, form: accountObj};

  webix.ajax().post('/auth', postJSON, function (text, data, XmlHttpRequest) {
    var ret = JSON.parse(text);
    if (ret.error)
      webix.message({type: "error", text: ret.poststr});
    else {
      webix.message(ret.poststr);
      webix.send("/", null, "GET");
    }
  });

}

function onCancelClick(){
}