var nodemailer = require('nodemailer')
var config = require('../config')

var emailer = {

  sendMail: function(subject, text, callback) {
    var mailOptions = {
      from: '"DOS BEP2-ERC20 Bridge" <dosswapbridge@gmail.com>',
      to: 'info@dos.network',
      subject: subject,
      text: text
    }

    emailer._sendMail(mailOptions, callback)
  },

  _sendMail: function(mailOptions, callback) {
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      auth: {
        user: config.gmailUser,
        pass: config.gmailPassword
      }
    });

    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log(error)
      }

      if (callback != null) {
        callback(error, info)
      }
    })
  }
}

module.exports = emailer
