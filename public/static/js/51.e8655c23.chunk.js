(this["webpackJsonpe-learn"]=this["webpackJsonpe-learn"]||[]).push([[51],{1339:function(e,a,r){"use strict";r.r(a);var t=r(0),c=r.n(t),n=r(31),o=r(4),s=r(38),l=r(798),u=r(740),i=r(801),f=r(244),m=r(106),p=r(422);a.default=Object(n.b)((function(e){return{course:e.common.selectedCourse,courses:e.common.courses}}),(function(e){return{openModal:function(a,r){e(o.Bc(a,r))}}}))((function(e){var a=e.course,r=e.courses,t=e.openModal,n=Object(f.a)(r,a),o=Object(p.a)("common").t;return c.a.createElement(s.a,null,c.a.createElement(m.a,{align:"center",variant:"h4",gutterBottom:!0},o("layout.drawer.resources")),c.a.createElement(l.a,null,(n.resources||[]).map((function(e){var a,r=(e.resource||"").split(".").pop();return"pdf"===r&&(a=c.a.createElement("i",{className:"far fa-file-pdf fa-2x"})),"docx"!==r&&"doc"!==r||(a=c.a.createElement("i",{className:"fas fa-file-word fa-2x"})),"jpeg"!==r&&"jpg"!==r&&"jfif"!==r||(a=c.a.createElement("i",{className:"fas fa-file-image fa-2x"})),"mp4"!==r&&"avi"!==r||(a=c.a.createElement("i",{className:"far fa-file-video fa-2x"})),c.a.createElement(u.a,{key:e._id,button:!0,onClick:function(){return t({loadedFile:e.loadedResource,ext:r},"courseResource")}},a&&c.a.createElement("span",{style:{marginRight:20}},a),c.a.createElement(i.a,{primary:e.resourceName}))}))))}))}}]);