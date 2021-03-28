const emailTemplateHead = `
<head>
  <style type="text/css">
    /* Take care of image borders and formatting, client hacks */
    a img { border: none; }
    table { border-collapse: collapse !important;}
    #outlook a { padding:0; }
    .ReadMsgBody { width: 100%; }
    .ExternalClass { width: 100%; }
    .backgroundTable { margin: 0 auto; padding: 0; width: 100% !important; }
    table td { border-collapse: collapse; }
    .ExternalClass * { line-height: 115%; }


    /* General styling */
    * {
      font-family: Helvetica, Arial, sans-serif;
    }

        body {
        -webkit-font-smoothing: antialiased;
        -webkit-text-size-adjust: none;
        width: 100% !important;
        margin: 0 !important;
        height: 100%;
        color: #676767;
        }

        td {
        font-family: Helvetica, Arial, sans-serif;
        font-size: 14px;
        color: #777777;
        text-align: center;
        line-height: 21px;
        }

        a {
        color: #676767;
        text-decoration: none !important;
        }

        .free-text {
    width: 100% !important;
    padding: 10px 15px 0px;
    }

    .header-lg,
    .header-md,
    .header-sm {
    font-size: 32px;
    font-weight: 700;
    line-height: normal;
    /* padding: 35px 0 0; */
    color: #4d4d4d;
    }

    .header-md {
    font-size: 24px;
    }

    .header-sm {
    padding: 5px 0;
    font-size: 18px;
    line-height: 1.3;
    }
  </style>

  <style type="text/css" media="screen">
    @import url(http://fonts.googleapis.com/css?family=Oxygen:400,700);
  </style>

  <style type="text/css" media="screen">
    @media screen {
      * {
        font-family: 'Oxygen', 'Helvetica Neue', 'Arial', 'sans-serif' !important;
      }
    }
  </style>

</head>`

const emailTemplate = (primaryText, secondaryText, tertiaryText, buttonText, buttonUrl, list) => {

    const buttonTemplate = `
    <tr>
        <td style="padding: 30px 0;">
        <div><a href="${buttonUrl}"
        style="background:#2196f3 !important;border-radius:5px;color:#ffffff;display:inline-block;font-family:'Cabin', Helvetica, Arial, sans-serif;font-size:14px;font-weight:regular;line-height:45px;text-align:center;text-decoration:none;width:155px;">${buttonText}</a></div>
        </td>
    </tr>
    `

const bodyTemplate = `
${emailTemplateHead}
<body style="overflow-x: hidden;">
<table align="center" cellpadding="0" cellspacing="0" width="100%" style="height:50vh;width:100%;">
  <tr>
    <td align="left" valign="top" width="100%" style="background: #f7f7f7;">
      <center>
        <table cellspacing="0" cellpadding="0" width="100%" style="background-color:#2196f3">
          <tr>
            <td class="header-md" width="100%" height="80" valign="top" style="text-align: center; vertical-align:middle;">
             <span style="color:white;"> E Learn </span>
            </td>
          </tr>
        </table>
      </center>
    </td>
  </tr>
  <tr>
    <td align="center" valign="top" width="100%" style="background-color: #f7f7f7;" >
      <center>
        <table cellspacing="0" cellpadding="0" >
          <tr>
            <td class="header-md">
               ${primaryText}
            </td>
          </tr>
          <tr>
            <td class="free-text">
              ${secondaryText ? secondaryText : ""}
            </td>
          </tr>
          <tr>
          <td class="free-text">
            ${tertiaryText ? tertiaryText : ""}
          </td>
        </tr>
          ${buttonText ? buttonTemplate : "<tr></tr>"}
          ${list ? list : ""}
        </table>
      </center>
    </td>
  </tr>
</table>
</body>
`






    return bodyTemplate



}

exports.emailTemplate = emailTemplate;