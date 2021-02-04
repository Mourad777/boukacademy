const textEditorWhitelist = {
    whiteList: {
      p:[],
      mark:["class"],
      figure:["class"],
      img:["src","alt"],
      figcaption:[],
      li:[],
      ul:[],
      ol:[],
      h2:[],
      h3:[],
      h4:[],
      strong:[],
    }
  };

  const noHtmlTags = {
    whiteList: []
  };

  exports.textEditorWhitelist = textEditorWhitelist;
  exports.noHtmlTags = noHtmlTags;