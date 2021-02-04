const i18n = require('i18n')
const path = require('path')

i18n.configure({
    locales: ['en', 'es'],
    defaultLocale: 'es',
    queryParameter: 'lang',
    directory: path.join('./', 'locales'),
    api: {
      '__': 'translate',  
      '__n': 'translateN' 
    },
  });






exports.i18n = i18n