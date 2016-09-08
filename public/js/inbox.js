/**
 * Created by toby on 19/10/15.
 */
//

console.log(gData);
console.log(gdocNames);

//lodash underscore
var _u = _.noConflict();


//global attachment docs variable
var gAttachDoc = [];

function onViewerClick(){
  console.log('click');
  webix.send('/files',null,"GET");
}

function onEmailClick(){
  webix.send('/email',null,"GET");
}
var onUserClick = function() {
  console.log('logout');
  window.location.replace("/logout");
}
function sortByDate(a,b){
  var aTime = Date.parse(a);
  var bTime = Date.parse(b);

  return aTime>bTime?1:(aTime<bTime?-1:0);
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

  console.log(new_content);
  //webix.message(new_message, null, 2);
  gAttachDoc = [];
  webix.ajax().post("/send",{message:new_message,content:new_content,msguid:this_uid},function(text,data,xmlHttpRequest){
    console.log(text);
    console.log(xmlHttpRequest);
    if(xmlHttpRequest.readyState == 4 && xmlHttpRequest.status == 200){
      $$('popupwin').close();
      if(text === 'SENT') {
        webix.message('sent success', null, 20);
      }
      else if(text === 'DRAFTED'){
        webix.message('sent failed, saved as draft');
      }
    }
  })
}
function upload(){
  webix.ui(filePopup).show();
  $$('popupwin').disable();
}
function uploadDoc(){
  var items = $$('fileview').getSelectedItem(true);
  gAttachDoc = items;
  console.log(gAttachDoc);
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
      console.log(thisfilename);
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
  console.log(msguid);

  for(var i=0;i<gAttachments.length;i++){
    if(gAttachments[i]['uid'] == msguid){
      attachment.push(gAttachments[i]);
    }
  }
  return attachment;
}
var gridtable = {
    container:"thetable",
    view:"datatable",css: "rounded_top", scrollX:false,
    columns:[
      { id:"ch1", header:{ content:"masterCheckbox" }, template:"{common.checkbox()}",checkValue:'on', uncheckValue:'off', css:"center", width: 40 },
      { id:"from", width: 250, header:"From" },
      { id:"subject", header:"Subject", fillspace:true },
      { id:"date", header:"Date", width: 150, sort:sortByDate}
    ],
    select:"row",
    pager:{
      id:"pagerA",
      size:5,
      group:10,
      apiOnly:true
    },
    data:gData,
    ready:function(){
      console.log(gData);
    }};
var contentUI = {rows:[
  {
    type: "space",
    rows:[
      {
        view:"toolbar",
        height: 45,
        elements: [
          { view: "label", template: "<div id='picoHeader'><span class='picoHeaderTitle'>SECD</span>"},
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
          {view:"label", template: "<div style='text-align: right;'>toby.ealden</div>" },
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
      name: "Cc",
      label: "Cc",
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
        { view:"button", id:'id_cancelpopup', value:"cancel",click:"console.log('popwin close');$$('popupwin').close();"},
        { view:"button", value:"send",click:function(){
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

      }
    }}
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
  console.log(fileName);
  webix.ui(attachmentPopup).show();
  var iframe = '<iframe src="/viewer/#/attachments/'+fileName+'" width="100%" height="100%"></iframe>';
  $$('attachmentview').setHTML(iframe);
}


function setupDocLoad() {
  var x = document.getElementsByClassName("attachment-icon");
  for(var i = 0; i < x.length; i++){
    console.log('x node');
    console.log(x[i]);
    x[i].setAttribute("onclick", "loadDocument(this.parentElement.getAttribute(\'name\'))");
  }
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

  $$("$datatable1").attachEvent("onAfterSelect",function(obj){
    $$("id_reply").show();
    $$("id_delete").show();
    console.log(obj);
    var this_content = findContent(obj.id);

    webix.ajax().post("/message?id="+this_content['uid'],function(text,data,XmlHttpRequest){
      if(xmlHttpRequest.readyState == 4 && xmlHttpRequest.status == 200) {
        console.log(text);
        var contentHtml = "";
        if (text != "") {
          contentHtml += text;
        }
        $$("mailview").setHTML(contentHtml);
      }
    })
  });


  $$("$tree1").select(1);

  /*
   * create email
   */
  $$("id_create").attachEvent("onItemClick",function(id,e){
    console.log('create clicked');
    $$("$datatable1").clearSelection();
    webix.ui(popup).show();
  })

  /*
   * reply selected email
   */
  $$("id_reply").attachEvent("onItemClick",function(id,e){
    webix.ui(popup).show();
    console.log($$('$datatable1').getSelectedId().id);
    var this_obj = findContent($$('$datatable1').getSelectedId().id);
    var replyTo = this_obj.from;
    var subject = this_obj.subject;
    if(subject.indexOf('Re: ') != -1 || subject.indexOf('RE ' != -1)){
      console.log('has re');
      subject = subject.replace(/Re: /ig,'');
    }
    subject = "Re: "+subject;
    replyTo = replyTo.split('<')[1];
    replyTo = replyTo.substr(0,replyTo.length-1);

    console.log(replyTo);
    $$("reply-address").setValue(replyTo);
    $$("subject").setValue(subject);
  })


  /*
   * delete selected email
   */
  $$('id_delete').attachEvent('onItemClick',function(id,e){
    var this_msg = findContent($$('$datatable1').getSelectedId());
    console.log(this_msg['uid']);
    webix.ajax().put("/message",{message:this_msg},function(text, data, XmlHttpRequest){
      console.log('delete message'+text);

      if(XmlHttpRequest.readyState == 4 && XmlHttpRequest.status == 200){
        webix.message('deleted success',null,200);
       // gData
      }
    })
  });

  $$('id_cancelpopup').attachEvent('onItemClick',function(){
    console.log('popwin close');
    $$('popupwin').close();
  })

});
