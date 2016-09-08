var contentUI = {
  type: "space",
  rows: [
    {},
    {
      cols: [
        {},
        {
          view:"form",
          elements:[
            { view:"text", label:"Email" },
            { view:"text", type:"password", label:"Password" },
            {cols:[
              { view:"button", value:"Login", type:"form" },
              { view:"button", value:"Cancel" }
            ]}
          ]
        },
        {}
      ]
    },
    {},
  ]
};