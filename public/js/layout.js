/**
 * Created by toby on 16/10/15.
 */

webix.debug = true;

//secdEventBus = new EventEmitter();
//secdEventBus.defineEvents(["data-added","data-changed","data-removed"]);

var onMainClick = function(){
  console.log('click');
  webix.send('/',null,"GET");
};

var onUserClick = function() {
  window.location.replace("/logout");
};

function onSettingClick(){

}
function onViewerClick(){
  webix.send('/files',null,"GET");
}

function onEmailClick(){
  webix.send('/email',null,"GET");
}

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
      else{}
    }}
  }
};

webix.ready(function() {
  webix.ui.fullScreen();
  webix.ui({
    id: "mainLayout",
    rows:[
      {
        view:"toolbar",
        height: 45,
        elements: [
          { view: "label", id:"id_main",template: "<div id='picoHeader'><span class='picoHeaderTitle'>SECD</span>",click:onMainClick},
          {
            id:         "docButton",
            view:       "button",
            type:       "iconButton",
            icon:       "folder",
            label:      "Doc Viewer",
            Width: 250,
            click: onViewerClick,
            hidden:true
          },
          {
            id:         "emailButton",
            view:       "button",
            type:       "iconButton",
            icon:       "envelope",
            label:      "SECD Email",
            Width: 250,
            click: onEmailClick,
            hidden:true
          },
          {},{},
          {view:"label", id:"loginname", template: "<div style='text-align: right;'>"+appUsername+"</div>" },
          {view:"icon", icon:"user"},
          {view:"icon", icon:"cog",popup:"setwindow"}
        ]
      },
      contentUI,
      {
        gravity: 0.001
      }
    ]
  });
  webix.ui(settings);
});

