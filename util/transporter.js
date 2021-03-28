const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");


const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.NODE_MAILER_API_KEY,
    },
  })
);

exports.transporter = transporter;

// const apiKey = process.env.NODE_MAILER_API_KEY;
// console.log('apiKey',apiKey)
// const domain = 'https://api.mailgun.net/v3/sandbox68ebe70add2e4ff38320e6212f92e37f.mailgun.org';
// const mailgun = require('mailgun-js')({ domain, apiKey });



// exports.mailgun = mailgun;

//EXAMPLE
// const mailgun = require("mailgun-js");
// const mailgun = require("mailgun-js");
// const DOMAIN = "sandbox68ebe70add2e4ff38320e6212f92e37f.mailgun.org";
// const mg = mailgun({apiKey: "f37e035d201d5a890455f1a8ac949a18-73e57fef-142c6ce5", domain: DOMAIN});
// const data = {
// 	from: "Mailgun Sandbox <postmaster@sandbox68ebe70add2e4ff38320e6212f92e37f.mailgun.org>",
// 	to: "boukabachemontreal1012@gmail.com",
// 	subject: "Hello",
// 	text: "Testing some Mailgun awesomness!"
// };