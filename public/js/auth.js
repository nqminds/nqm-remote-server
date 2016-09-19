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
          height:300,
          scroll:"y",
          elements:[
            { rows:[
              { template:"IMAP Server", type:"section"},
              {id:"id_mailboxname",view:"text",name:"mailboxname",label:"Imap Mailbox",labelWidth:200,
                invalidMessage: "Mailbox name cannot be empty"},
              {id:"id_imapuser",view:"text",name:"imapuser",label:"Imap Login",labelWidth:200,
                invalidMessage: "Imap email address cannot be empty"},
              {id:"id_imappass",view:"text",name:"imappass",label:"Imap Password",labelWidth:200,
                invalidMessage: "Imap uer password cannot be empty", type:"password"},
              {id:"id_imaphost",view:"text",name:"imaphost",label:"Imap Server",labelWidth:200,
                invalidMessage: "Imap host cannot be empty"},
              {id:"id_imapport",view:"text",name:"imapport",label:"Imap Port",labelWidth:200,
                invalidMessage: "Imap port cannot be empty"},
              {view:"checkbox", id:"id_imaptls", label:"Imap TLS", value:1, labelWidth:200}
            ]},
            { rows:[
              { template:"SMTP Server", type:"section"},
              {id:"id_smtpuser",view:"text",name:"smtpuser",label:"Smtp Login",labelWidth:200,
                invalidMessage: "Smtp address cannot be empty"},
              {id:"id_smtppass",view:"text",name:"smtppass",label:"Smtp Password",labelWidth:200,
                invalidMessage: "Smtp password cannot be empty", type:"password"},
              {id:"id_smtphost",view:"text",name:"smtphost",label:"Smtp Server",labelWidth:200,
                invalidMessage: "Smtp host cannot be empty"},
              {id:"id_smtpport",view:"text",name:"smtpport",label:"Smtp Port",labelWidth:200,
                invalidMessage: "Smtp port cannot be empty"},
			  {view:"checkbox", id:"id_smtptls", label:"Smtp TLS", value:1, labelWidth:200}
            ]},
            //{ rows:[
            //{ template:"Activation", type:"section"},
              //{ template:"Activation", type:"section"},
            { id:"id_field", view:"text", name:"activation",label:"Verification ID",
              required:true,
              validate:webix.rules.isNotEmpty,
              invalidMessage: "Activation code cannot be empty", labelWidth:200},
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
    smtpLogin:$$('id_smtpuser').getValue(),
    smtpPass:$$('id_smtppass').getValue(),
    smtpServer:$$('id_smtphost').getValue(),
    smtpPort:$$('id_smtpport').getValue(),
    smtpTLS:$$('id_smtptls').getValue(),
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
