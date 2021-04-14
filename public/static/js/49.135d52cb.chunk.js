(this["webpackJsonpe-learn"]=this["webpackJsonpe-learn"]||[]).push([[49],{1366:function(e,r,o){"use strict";o.r(r);var t=o(62),a=o(0),c=o.n(a),n=o(31),s=o(4),u=o(107),i=o(39),l=o(253),m=o(428),f=o(252),d=o(803),p=o(745),g=o(153),v=o.n(g),E=o(248),b=o(244),h=o(7),j=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},r={isValid:!0,resourcesAreValid:!0};return r.resources=(e.resources||[]).map((function(o,t){var a;return(o||{}).resourceName&&(o.resourceName||"").trim()||(a=h.a.t("resources.errors.giveResourceName")),(o||{}).resource||(a=h.a.t("resources.errors.selectResource")),(o||{}).resource instanceof File&&(o||{}).resource.size>1e6*e.instructorFileSizeLimit&&(a=h.a.t("resources.errors.fileSize",{size:"".concat(e.instructorFileSizeLimit,"MB")})),(a||a)&&(r.resourcesAreValid=!1,r.isValid=!1),{resourceName:a}})),r},k=o(344),R=o(345),x=o(27),D=o(347),N=o(343),O=o(259),V=o.n(O),w=function(e){var r=e.fields,o=e.formValues,t=void 0===o?{}:o,a=e.changeDocument,n=e.openModal,s=e.t,l=e.isDarkTheme;return c.a.createElement(i.a,null,c.a.createElement(u.a,{align:"center",variant:"h4",gutterBottom:!0},s("layout.drawer.resources")),c.a.createElement(d.a,null,r.map((function(e,o){var u,i=((t.resources||[])[o]||{}).loadedResource,l=((t.resources||[])[o]||{}).resource instanceof File?((((t.resources||[])[o]||{}).resource||{}).name||"").toLowerCase().split(".").pop():(((t.resources||[])[o]||{}).resource||"").toLowerCase().split(".").pop();return"pdf"===l&&(u=c.a.createElement("i",{className:"far fa-file-pdf fa-2x"})),"docx"!==l&&"doc"!==l||(u=c.a.createElement("i",{className:"fas fa-file-word fa-2x"})),"jpeg"!==l&&"jpg"!==l&&"jfif"!==l||(u=c.a.createElement("i",{className:"fas fa-file-image fa-2x"})),"avi"!==l&&"mp4"!==l||(u=c.a.createElement("i",{className:"far fa-file-video fa-2x"})),c.a.createElement(p.a,{key:o},i&&u&&c.a.createElement("span",{style:{marginRight:20,cursor:"pointer"},onClick:function(e){e.stopPropagation(),n({loadedFile:i,ext:l},"courseResource")}},u),c.a.createElement(k.a,{simple:!0,label:s("resources.buttons.resourceName"),name:"resources.".concat(o,".resourceName"),component:E.a,errorAbsolutePosition:!0}),c.a.createElement(k.a,{name:"resources.".concat(o,".resource"),component:f.a,loadedFile:i,mimeTypesAllowed:"video/*, image/jpeg, application/pdf, .doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",extensionsAllowed:["jpeg","jpg","jfif","pdf","docx","doc","mp4","avi"],onChangeFile:function(e){a("resources.".concat(o,".loadedResource"),e)},preview:!1,compressImage:!0,index:o,uploadButtonText:s("resources.buttons.select")}),c.a.createElement(b.a,{onClick:function(e){e.stopPropagation(),r.remove(o)}},c.a.createElement(v.a,{fontSize:"small",style:{color:"red"}})))}))),c.a.createElement(p.a,{button:!0,onClick:function(){return r.push()}},c.a.createElement(V.a,{style:{color:l?"#2196f3":"#0058AE"}}),c.a.createElement(u.a,{style:{color:l?"#2196f3":"#0058AE"}},s("resources.buttons.addResource"))))},F=Object(N.a)({form:"courseResources",enableReinitialize:!0,destroyOnUnmount:!0,validate:j})((function(e){var r=e.token,o=e.course,n=void 0===o?{}:o,s=e.formValues,u=e.updateResources,f=e.changeDocument,d=e.initialValues,p=e.openModal,g=e.touchField,v=e.configuration,E=e.isDarkTheme,b=Object(a.useState)(null),h=Object(t.a)(b,2),k=h[0],x=h[1],D=Object(a.useState)(!1),N=Object(t.a)(D,2),O=N[0],V=N[1];Object(a.useEffect)((function(){var e=d.resources.map((function(e){return e.resource}));x(e)}),[d]);var F=Object(m.a)().t,z=j(s,v).isValid;return c.a.createElement(i.a,null,c.a.createElement(R.a,{name:"resources",formValues:s,component:w,changeDocument:f,openModal:p,isDarkTheme:E,t:F}),c.a.createElement(l.a,{clicked:function(){var e=j(s,v).isValid;if(s.resources.forEach((function(e,r){g("resources.".concat(r,".resourceName")),g("resources.".concat(r,".resource"))})),V(!0),e){var o=s.resources.map((function(e){return e.resource})),t=(k||[]).filter((function(e){if(!o.includes(e))return e}));u(n._id,s.resources,t,r)}},isError:O&&!z},F("resources.buttons.updateResources")))}));r.default=Object(n.b)((function(e){var r=(e.common.courses||[]).find((function(r){return r._id===e.common.selectedCourse})),o=(r||{}).resources||[],t=e.common.configuration.instructorFileSizeLimit,a=0===o.length?[{resourceName:""}]:o;return{formValues:Object(D.a)("courseResources")(e),modalDocument:e.common.modalDocument,configuration:e.common.configuration,token:e.authentication.token,initialValues:{resources:a,instructorFileSizeLimit:t},isDarkTheme:e.common.isDarkTheme,course:r}}),(function(e){return{updateResources:function(r,o,t,a){return e(s.Dd(r,o,t,a))},changeDocument:function(r,o){e(Object(x.a)("courseResources",r,o))},openModal:function(r,o){e(s.Ac(r,o))},touchField:function(r){e(Object(x.d)("courseResources",r))}}}))(F)}}]);