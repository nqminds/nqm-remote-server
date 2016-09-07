var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
         service: 'Gmail',
         auth: {
             user: 'bingjie@nquiringminds.com', // Your email id
             pass: 'bingjiegao10' // Your password
        }
    });
var mailOptions = {
     from: 'bingjie@nquiringminds.com', // sender address
     to: 'bingjie.gao10@gmail.com', // list of receivers
     subject: 'Hello ✔', // Subject line
     text: 'Hello world 🐴', // plaintext body
     html: '<b>Hello world 🐴</b>' // html body
}

transporter.sendMail(mailOptions,function(err,info){
     if(err){
          return console.log(err);
     }
     console.log('Message sent'+info.response);

})
