/**
 * Created by toby on 19/10/15.
 */
//

//global attachment docs variable
var gAttachDoc = [];

function onViewerClick(){
  webix.send('/files',null,"GET");
}
var onSetClick = function() {
  window.location.replace("/wifi");
};
function onEmailClick(){
  webix.send('/email',null,"GET");
}
var onUserClick = function() {
  window.location.replace("/logout");
}
function send() {
  var this_uid,this_message;
  this_uid = null;
  if($$('$datatable1').getSelectedId() != null){
    this_message = findContent($$('$datatable1').getSelectedId().id);
    this_uid = this_message['uid'];
  }
  var new_message = $$("mailform").getValues();
  var new_content = $$("mail-content").getValue();
  if(new_content == "" || new_message == ""){

  }

  new_content = {
    html:new_content,
    attachments:gAttachDoc
  };

  gAttachDoc = [];
  webix.ajax().post("/send",{message:new_message,content:new_content,msguid:this_uid},function(text,data,xmlHttpRequest){
    if(xmlHttpRequest.readyState == 4 && xmlHttpRequest.status == 200){
      $$('popupwin').close();
      if (this_message != undefined && this_message['folder'] == 3) {
        this_message['folder'] = 2;
        this_message['flags'] = "\\Sent";
        var newData = $$('$datatable1');
        var sel = newData.getSelectedId(true);
        newData.updateItem = (sel , this_message);
        var selectedTree = $$("$tree1").getSelectedId();
        $$("$tree1").select(1);
        $$("$tree1").select(selectedTree);

      }
      if(text === 'SENT') {
        webix.message('sent success', null, 20);
      }
      else if(text === 'DRAFTED'){
        webix.message('sent failed, saved in the OUTBOX');
      }
    }
  })
}

/*----------------------------------------------- save draft locally--------------------------------------------*/

function saveDraft(){
  var new_message = $$("mailform").getValues();

  if(gAttachDoc.length>0)
    new_message["attachments"] = gAttachDoc;

  webix.ajax().post("/draft",{message:new_message},function(text,data,XmlHttprequest){
    if(XmlHttprequest.readyState == 4 && XmlHttprequest.status == 200){
      if(text == "draft error")
        webix.message('Save failed');
      else {
        $$("popupwin").close();
        var this_msg = JSON.parse(text);
        var selItem = $$("$datatable1").getSelectedId(true);

        if (selItem!="")
          $$("$datatable1").updateItem(selItem,this_msg);
        else {
          gData.push(this_msg);
          $$("$datatable1").add(this_msg);
        }

        var selectedTree = $$("$tree1").getSelectedId();
        $$("$tree1").select(2);
        $$("$tree1").select(selectedTree);
        webix.message('Draft saved successfully');
      }
    }
  })
}
/*----------------------------------------------- end save draft locally----------------------------------------*/

function upload(){
  webix.ui(filePopup).show();
  $$('popupwin').disable();
}
function uploadDoc(){
  var items = $$('fileview').getSelectedItem(true);
  gAttachDoc = items;
  $$('mailform').removeView('attachViewValue');
  for(var i=0;i<gAttachDoc.length;i++){
    $$('mailform').addView({
      view:"label",
      label: gAttachDoc[i]['docName']+"<span class='webix_icon uploadAttach-icon fa fa-trash'></span>",
      id:"attachViewValue",
      align:"left"
    },5+i)
  }
  $$('filewin').close();
  $$('popupwin').enable();

  /*
   trash attachments sending email
   */

  var trashAttachment = document.getElementsByClassName('uploadAttach-icon');
  for(var i=0;i<trashAttachment.length;i++){
    var trash = trashAttachment[i];
    trash.addEventListener('click',function(){
      var thisfilename = this.parentElement.innerHTML;
    })
  }
}
function canceldocupload(){
  $$('filewin').close();
  $$('popupwin').enable();
}
function findContent(messageId){
  var content = null;
  //content = _u.find(gData,{"id":messageId});
  for(var i=0;i<gData.length;i++){
    if(gData[i]['id'] == messageId)
      content = gData[i];
  }
  return content;
}
function findAttachment(msguid){
  var attachment = [];

  for(var i=0;i<gAttachments.length;i++){
    if(gAttachments[i]['uid'] == msguid){
      attachment.push(gAttachments[i]);
    }
  }
  return attachment;
}
var gridtable = {
    css:'table',
    container:"thetable",
    view:"datatable",css: "rounded_top", scrollX:false,
    columns:[
      { id:"ch1", header:{ content:"masterCheckbox" }, template:"{common.checkbox()}",checkValue:'on', uncheckValue:'off', css:"center", width: 40 },
      { id:"from", width: 150, header:"From" },
      { id:"subject", header:"Subject", fillspace:true },
      { id:"date",header:"Date", width: 250,format:function(value){
        if(value.indexOf("<b>") !== -1 || value.indexOf("<\/b>") !== -1){
          value = replaceBold(value);
        }
        return new Date(value);
      }},
      {id:"utcdate",header:"utcdate",template:"#date#",format:function(value){
        return new Date(value).getTime();
      }
      ,sort:"int",hidden:true}
    ],
    select:"row",
    pager:{
      id:"pagerA",
      size:8,
      group:100,
      apiOnly:true
    },
    data:gData,
    ready:function(){
      //this.sort("date", "desc", "date");
      //this.markSorting("date", "desc");
    }};
var contentUI = {id:"id_all",rows:[
  {
    type: "space",
    rows:[
      {
        view:"toolbar",
        height: 45,
        elements: [
          { view: "label", template: "<div style='cursor:pointer;',id='picoHeader'><span class='picoHeaderTitle'>SECD</span>",click:function(){
            webix.send('/',null,"GET");
          }},
          {
            id:         "docButton",
            view:       "button",
            icon:       "folder",
            type:       "iconButton",
            label:      "Doc Viewer",
            Width: 250,
            click: onViewerClick,
            hidden:true
          },
          {
            id:         "emailButton",
            view:       "button",
            icon:       "envelope",
            type:       "iconButton",
            label:      "SECD Email",
            Width: 250,
            click: onEmailClick,
            hidden:true
          },
          {},{},{},
          {view:"label", template: "<div style='text-align: right;'>"+appUserName+"</div>" },
          {view:"icon", icon:"user", click: onUserClick },
          {view:"icon", icon:"cog",popup:"setwindow"}
        ]
      },
      {
        type:"wide", cols:[
        {
          type: "clean",
          rows:[
            { view:"button", id: "id_create", type: "iconButton", label:"Create", icon:"envelope", width: 95 },
            {
              view:"tree",
              css: "rounded_top",
              select: true,
              width:280,
              type:{
                folder:function(obj){
                  return "<img src='common/tree/"+obj.icon+".png' style='position:relative; top:2px; left:-2px;'>";
                }
              },
              data:[
                { id:"1", value:"Inbox", icon:"inbox"},
                { id:"2", value:"Sent", icon:"sent"},
                { id:"3", value:"Drafts", icon:"drafts"},
                { id:"4", value:"Trash", icon:"trash"},
                { id:"5", value:"Contact Groups", open:true, icon:"folder", data:[
                  { id:"5-1", value:"Friends", icon:"file"},
                  { id:"5-2", value:"Blocked", icon:"file"}
                ]
                }
              ]
            }
            //{
            //  view: "calendar", css: "rounded_bottom"
            //}
          ]

        },
        { type:"wide",rows:[
          gridtable,
          { height: 45, cols:[
            { view:"button", id: "id_reply", type: "icon",  label:"Reply", icon:"reply", width: 95, hidden: true},
            //{ view:"button", id: "id_replyall", type: "icon", label:"Reply All", icon:"reply-all", width: 100, hidden: false },
            { view:"button", id: "id_delete", type: "icon", label:"Delete", icon:"times", width: 95,hidden:true },
            {},
            { view:"button", id: "id_prev", type: "icon", icon: "angle-double-left", width: 30, click:prev_page},
            { view:"button", id: "id_next", type: "icon", icon: "angle-double-right", width: 30, click:next_page }

          ]},
          {view:"template", id: "mailview", scroll:"y", template:"No message available"}
        ]}
      ]


      }
    ]
  }
]};
var form = {
  view: "form",
  id:"mailform",
  elements: [
    {
      view: "text",
      id:"reply-address",
      name: "To",
      label: "To",
      labelWidth: "100",
      required:true,
      validate:webix.rules.isNotEmpty,
      invalidMessage: "To address cannot be empty"
    },
    {
      view: "text",
      id: "Cc",
	    name: "Cc",
      label: "Cc",
      labelWidth: "100"
    },
    {
      view: "text",
      id:"Bcc",
      name: "Bcc",
      label: "Bcc",
      labelWidth: "100"
    },
    {
      view: "text",
      id:"subject",
      name: "Subject",
      label: "Subject",
      labelWidth: "100"
    },
    {
      id:'mail-content',
      name:"mail-content",
      view:"tinymce-editor",
      height:150
    },
    {
      margin:5,
      view:"button", value:"Upload Attachments",click:upload
    },
    {
      margin:5,
      cols:[
        { view:"button", id:'id_cancelpopup', value:"cancel",click:"$$('popupwin').close();"},
        {view:"button",id:"id_saveDraft",value:"Save",click:saveDraft},
        { view:"button", value:"send",click:function(){
          $$("reply-address").validate();
          if($$('reply-address').validate()){
            send();
          }
        }}
      ]
    }
  ],
  rules:{
    "To": webix.rules.isNotEmpty,
    "mail-content": webix.rules.isNotEmpty
  },
  select:true,
  elementsConfig:{
    labelAlign:"right",
    on:{
      'onChange':function(newv, oldv){
        this.validate();
      }
    }
  }
}

var popup = {
  view:"window",
  width:700,
  left:50, top:50,
  position:"center",
  move:true,
  id:"popupwin",
  head:{
    view:"toolbar", cols:[
      {view:"label", label: "New Message" },
      { view:"button", label: 'Close', width: 90, align: 'right', click:"$$('popupwin').close()"}
    ]
  },
  body:form
};

var attachmentPopup = {
  view:"window",
  width:700,
  height:300,
  left:50, top:50,
  position:"center",
  move:true,
  id:"attachmentwin",
  head:{
    view:"toolbar", cols:[
      {view:"label", label: "Attachment" },
      { view:"button", label: 'Close', width: 90, align: 'right', click:"$$('attachmentwin').close();"}
    ]
  },
  body:{
    view:"template", id: "attachmentview", scroll:"y", template:"  "
  }
};

var filePopup = {
  view:"window",
  width:700,
  height:300,
  left:50, top:50,
  position:"center",
  move:true,
  id:"filewin",
  head:{
    view:"toolbar", cols:[
      {view:"label", label: "Files" },
      { view:"button", label: 'Close', width: 90, align: 'right', click:"$$('filewin').close(); $$('popupwin').enable();"}
    ]
  },
  body:{
    view:"form",
    elements:[
      {
        view:"list", id: "fileview", scroll:"y", template:"#docName#",select:"multiselect",data:gdocNames
      },
      {
        margin:5,
        cols:[
          { view:"button", id:'id_cancel', value:"cancel",click:"$$('filewin').close(); $$('popupwin').enable();"},
          { view:"button", value:"upload",click:uploadDoc}
        ]
      }
    ]
  }
};

var settings = {
  view:"popup", id:"setwindow",
  head:false, width: 100,
  body:{
    view:"list", scroll:false,
    yCount:2, select:true, borderless:true,
    template:"#lang#",
    data:[
      {id:"id_set1", lang:"Logout"},
      {id:"id_set2", lang:"Settings"}
    ],
    on:{"onAfterSelect":function(id){
      $$("setwindow").hide();
      if(id == "id_set1"){
        onUserClick();
      }
      else if(id == "id_set2"){
        onSetClick();
      }
    }}
  }
};

var WaitCmdMsg = {
  view:"window",
  width:700,
  height:300,
  left:50, top:50,
  position:"center",
  move:true,
  id:"id_waitpopup",
  head:{
    view:"toolbar", cols:[
      {view:"label", label: "SECD upgrading" }
    ]
  },
  body:{
    view:"template", template:"Loading... ..."
  }
};



function prev_page(){
  $$("pagerA").select("prev");
}
function next_page(){
  $$("pagerA").select("next");
}

/*------------------ attachments popup -------------------------------------------------------*/
function loadDocument(fileName){
  webix.ui(attachmentPopup).show();
  var iframe = '<iframe src="/viewer/#/attachments/'+fileName+'" width="100%" height="100%"></iframe>';
  $$('attachmentview').setHTML(iframe);
}


function setupDocLoad() {
  var x = document.getElementsByClassName("attachment-icon");
  for(var i = 0; i < x.length; i++){
    x[i].setAttribute("onclick", "loadDocument(this.parentElement.getAttribute(\'name\'))");
  }
}
function replaceBold(boldStr){
  var substr1 = boldStr.replace(/<b>/g, "");
  var substr2 = substr1.replace(/<\/b>/g,"");
  return substr2;
}
/*--------------------- END attachment popup ------------------------------------------------*/
webix.ready(function() {

  webix.ui(contentUI);
  webix.ui(settings);
  $$("emailButton").show();
  $$('docButton').show();
  $$("$datatable1").bind($$("$tree1"),function(obj,filter){
    return obj.folder == filter.id;
  });
  $$("$tree1").select(1);

  /*refresh every 5 seconds*/
  setInterval(function(){
    webix.ajax().post("/refresh",function(text,data,XmlHttpRequest){
      if(XmlHttpRequest.readyState == 4 && XmlHttpRequest.status == 200) {
        console.log(text);
        var newmessages = JSON.parse(text);
        if($$('id_waitpopup') !== undefined) {
          $$('id_waitpopup').hide();
          $$('id_all').enable();
        }
        if(newmessages.length>0){
          if(newmessages.length == 1 && newmessages[0]['flags'] == "\\Wait"){
            webix.ui(WaitCmdMsg).show();
            $$('id_all').disable();
          }else {
            for (var i = 0; i < newmessages.length; i++) {
              gData.push(newmessages[i]);
              $$("$datatable1").add(newmessages[i]);
            }
            webix.message('new mails comming!');
          }
        }
        var selectedTree = $$("$tree1").getSelectedId();
        //$$("$tree1").select(3);
        //$$("$tree1").select(selectedTree);
      }
    })
  }, 10000);

  /**/

  /*single click on row to view the HTMl content
  * */
  $$("$datatable1").attachEvent("onAfterSelect",function(obj){
    $$("id_reply").show();
    $$("id_delete").show();
    var this_content = findContent(obj.id);
    if (this_content['flags'].indexOf("\\Seen") === -1 && this_content['flags'].indexOf("\\localDraft") === -1) {
      this_content['from'] = replaceBold(this_content['from']);
      this_content['subject'] = replaceBold(this_content['subject']);
      this_content['date'] = replaceBold(this_content['date']);
      var newData = $$('$datatable1');
      var sel = newData.getSelectedId(true);
      newData.updateItem = (sel , this_content);
    }
    webix.ajax().post("/message?id="+this_content['uid'],function(text,data,XmlHttpRequest){
      if(XmlHttpRequest.readyState == 4 && XmlHttpRequest.status == 200) {
        var messageObj = JSON.parse(text);
        var contentHtml = messageObj['text'];
        if(messageObj['attachments'] != undefined) {
          if (messageObj['attachments'].length > 0) {
            var spaces = "<br/><br/><br/>";
            var icon = "";
            for (var i = 0; i < messageObj['attachments'].length; i++) {
              icon += "<div name=" + messageObj['attachments'][i]['fileName'].replace(/ /g,"_") + ">";
              icon += "<span class='webix_icon attachment-icon fa-file-archive-o fa-4x'>";
              icon += messageObj['attachments'][i]['generatedFileName'].replace(/ /g,"_") + "</span></div><br/>";
            }
            contentHtml += spaces + icon;

          }
        }
        $$("mailview").setHTML(contentHtml);
        setupDocLoad();
      }
    })

  });
  /*--------------------------------------------------------------------------------------------------------*/
  /*
  * double click to continue with draft*/
  $$("$datatable1").attachEvent('onItemDblClick',function(obj){
    var this_msg = findContent($$("$datatable1").getSelectedId());
    if(this_msg['folder'] == 3) {
      webix.ajax().post("/message?id="+this_msg['uid'],function(text,data,XmlHttpRequest){
        if(XmlHttpRequest.readyState == 4 && XmlHttpRequest.status == 200) {
          var this_msgObj = JSON.parse(text);
          var contentHtml = this_msgObj['text'];
          $$("mailview").setHTML(contentHtml);

          webix.ui(popup).show();
          $$("reply-address").setValue(this_msgObj['to']);
          $$("subject").setValue(this_msgObj['subject']);
          $$("Cc").setValue(this_msgObj['cc']);
          $$("Bcc").setValue(this_msgObj['Bcc']);
          $$("mail-content").setValue(contentHtml);
          $$('mailform').removeView('attachViewValue');

          $$('mailform').addView({
            view: "text",
            id: "draftUid",
            name: "draftUid",
            label: "draftUid",
            hidden:true
          },0)
          $$("draftUid").setValue(this_msgObj['uid']);

          if(this_msgObj['attachments']) {
            gAttachDoc = this_msgObj["attachments"];
            for (var i = 0; i < gAttachDoc.length; i++) {
              $$('mailform').addView({
                view: "label",
                label: gAttachDoc[i]['docName'] + "<span class='webix_icon uploadAttach-icon fa fa-trash'></span>",
                id: "attachViewValue",
                align: "left"
              }, 5 + i)
            }
          }
        }
      })
    }
  })


  /*--------------------------------------------------------------------------------------------------------*/

  /*
   * create email
   */
  $$("id_create").attachEvent("onItemClick",function(id,e){
    $$("$datatable1").clearSelection();
    webix.ui(popup).show();
  })

  /*
   * reply selected email
   */
  $$("id_reply").attachEvent("onItemClick",function(id,e){
    webix.ui(popup).show();
    var this_obj = findContent($$('$datatable1').getSelectedId().id);
    var replyTo = this_obj.from;
    var subject = this_obj.subject;
    if(subject.indexOf('Re: ') != -1 || subject.indexOf('RE ' != -1)){
      subject = subject.replace(/Re: /ig,'');
    }
    subject = "Re: "+subject;
    if(replyTo.indexOf("<") !== -1) {
      replyTo = replyTo.split('<')[1];
      replyTo = replyTo.substr(0, replyTo.length - 1);
    }

    $$("reply-address").setValue(replyTo);
    $$("subject").setValue(subject);
  })

  /*
   * delete selected email
   */
  $$('id_delete').attachEvent('onItemClick',function(id,e){
    var this_msg = findContent($$('$datatable1').getSelectedId());
    this_msg['flags'] = this_msg['flags']+"\\Deleted";
    this_msg['folder'] = 4;
    var newData = $$('$datatable1');
    var sel = newData.getSelectedId(true);
    newData.updateItem = (sel , this_msg);
    var selectedTree = $$("$tree1").getSelectedId();
    $$("$tree1").select(4);
    $$("$tree1").select(selectedTree);
    webix.ajax().put("/message",{message:this_msg},function(text, data, XmlHttpRequest){
      if(XmlHttpRequest.readyState == 4 && XmlHttpRequest.status == 200){
        webix.message('deleted success',null,200);
      }
    })
  });


  $$('id_cancelpopup').attachEvent('onItemClick',function(){
    $$('popupwin').close();
  })

});
