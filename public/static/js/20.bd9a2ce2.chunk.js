(this["webpackJsonpe-learn"]=this["webpackJsonpe-learn"]||[]).push([[20,49],{1333:function(e,t,a){"use strict";a.r(t);var n=a(24),r=a(63),o=a(0),i=a.n(o),c=a(30),s=a(4),l=a(106),u=a(38),d=a(69),m=a.n(d),p=a(732),f=a(809),g=a(442),b=a(992),v=a(95),h=a(253),y=a.n(h),x=a(830),E=a(245),k=a(854),O=a.n(k),S=a(855),j=a.n(S),C=a(802),A=a(64),P=a(840),w=a(841),R=a(843),N=a(842),T=a(909),_=a(421),D=a(816),I=a(444),L=a(242);t.default=Object(c.b)((function(e){var t=Object(L.a)(e.common.courses,e.common.selectedCourse);return{configuration:e.common.configuration,course:t,selectedCourse:e.common.selectedCourse,modalDocument:e.common.modalDocument,token:e.authentication.token,isDarkTheme:e.common.isDarkTheme,tab:e.common.tab,allStudents:e.instructorStudent.allStudents,instructors:e.instructorCourse.instructors}}),(function(e){return{approveEnroll:function(t,a,n,r){return e(s.gb(t,a,n,r))},denyEnroll:function(t,a,n,r){return e(s.jb(t,a,n,null,null,r))},approveAccount:function(t,a,n){return e(s.e(t,a,n))},suspendAccount:function(t,a,n,r,o){return e(s.fd(t,a,n,r,o))}}}))((function(e){var t,a=e.token,o=e.course,c=e.selectedCourse,s=e.approveEnroll,d=e.denyEnroll,h=e.isDarkTheme,k=e.approveAccount,S=e.suspendAccount,L=e.configuration,z=e.isStudent,B=e.instructors,M=e.history,H=e.allStudents,Y=e.match,W=Y.params.studentId,q=Y.params.instructorId,F=Object(_.a)().t,V=Object(A.a)(),$=i.a.useState(!1),J=Object(r.a)($,2),K=J[0],U=J[1],G=i.a.useState(0),X=Object(r.a)(G,2),Q=X[0],Z=X[1],ee=i.a.useState(""),te=Object(r.a)(ee,2),ae=te[0],ne=te[1],re=(o.studentsEnrollRequests||[]).find((function(e){return e.student._id===W}))||{};if(W&&c&&(t=re.student),c||(t=z?(H||[]).find((function(e){return e._id===W})):(B||[]).find((function(e){return e._id===q}))),!t)return null;var oe,ie,ce=function(e){U(e.target.checked)};z&&c&&(oe=(o.studentsEnrollRequests||[]).filter((function(e){return e.approved})).length,ie=(o.studentsEnrollRequests||[]).findIndex((function(e){return e.student._id===t._id&&e.denied}))>-1);var se,le=(t.documents||[]).length,ue={padding:10,margin:"10px auto 10px auto"},de=[{value:"",primaryText:""},{value:"governmentId",primaryText:F("confirmations.governmentId")},{value:"birthCertificate",primaryText:F("confirmations.birthCertificate")},{value:"transcript",primaryText:F("confirmations.transcript")},{value:"legalStatusProof",primaryText:F("confirmations.proofLegalStatus")},{value:"cv",primaryText:F("confirmations.cv")},{value:"testScoresProof",primaryText:F("confirmations.proofTestScores")},{value:"referenceLetter",primaryText:F("confirmations.letterReference")},{value:"statementPurpose",primaryText:F("confirmations.statementPurpose")},{value:"other",primaryText:F("confirmations.other")}],me=[[F("confirmations.firstName"),t.firstName],[F("confirmations.lastName"),t.lastName],z?[F("confirmations.studentId"),t._id.replace(/\D/g,"")]:null,[F("confirmations.dob"),m()(new Date(t.dob).getTime()).locale(localStorage.getItem("i18nextLng")).format("MMMM DD YYYY")],[F("confirmations.email"),t.email],[F("confirmations.lastLogin"),t.lastLogin?m()(new Date(parseInt(t.lastLogin)).getTime()).locale(localStorage.getItem("i18nextLng")).format("dddd, MMMM DD YYYY, HH:mm"):""],z&&c?[F("confirmations.courseProgress"),"".concat(Object(T.a)(o,t),"%")]:null],pe=!1;return L.isApproveStudentAccounts&&z&&(pe=!0),L.isApproveInstructorAccounts&&!z&&(pe=!0),c?(re.droppedOut&&(se=F("userSummary.status.droppedOut")),!W||re.droppedOut||re.denied||re.approved||(se=F("userSummary.status.pendingApproval")),re.denied&&(se=F("userSummary.status.accessDenied"))):(t.isAccountSuspended&&(se=F("userSummary.status.accountSuspended")),t.isAccountApproved||t.isAccountSuspended||!pe||(se=F("userSummary.status.pendingActivation"))),i.a.createElement(u.a,null,t.profilePicture&&i.a.createElement("div",{style:Object(n.a)({backgroundColor:h?"#757575":"white",backgroundImage:'url("'.concat(t.profilePicture,'")'),backgroundPosition:"center",backgroundSize:"cover",backgroundRepeat:"no-repeat",height:"200px",borderRadius:"50%",maxWidth:"200px",width:"100%"},ue)}),i.a.createElement(l.a,{variant:"subtitle1",color:"error",gutterBottom:!0,align:"center"},se),i.a.createElement("div",{style:ue},i.a.createElement(P.a,{"aria-label":"simple table"},i.a.createElement(w.a,null,me.map((function(e){if(e)return i.a.createElement(N.a,{key:e[0]},i.a.createElement(R.a,{component:"th",scope:"row"},e[0]),i.a.createElement(R.a,{align:"right"},e[1]))}))))),z&&c&&i.a.createElement(E.a,{index:"progressReportStudentSummary",summary:F("userSummary.buttons.showReport"),expandedSummary:F("userSummary.buttons.hideReport")},i.a.createElement(l.a,{style:{textAlign:"center"},paragraph:!0,variant:"h6",gutterBottom:!0},F("userSummary.progressReport")),i.a.createElement(b.default,{student:t})),le>0&&i.a.createElement("div",{style:ue},i.a.createElement(l.a,{style:{textAlign:"center"},paragraph:!0,variant:"h6",gutterBottom:!0},F("confirmations.documents")),i.a.createElement(C.a,{steps:le,position:"static",variant:"text",activeStep:Q,nextButton:i.a.createElement(g.a,{size:"small",onClick:function(){Z((function(e){return e+1}))},disabled:Q===le-1},F("confirmations.next"),"rtl"===V.direction?i.a.createElement(O.a,null):i.a.createElement(j.a,null)),backButton:i.a.createElement(g.a,{size:"small",onClick:function(){Z((function(e){return e-1}))},disabled:0===Q},"rtl"===V.direction?i.a.createElement(j.a,null):i.a.createElement(O.a,null),F("confirmations.back"))}),(t.documents||[]).map((function(e,t){if(t!==Q)return null;var a,n=(Object(v.a)(e.document)||"").toLowerCase().split(".").pop();"pdf"===n&&(a=i.a.createElement(x.a,{url:e.document,index:t})),"jfif"!==n&&"jpeg"!==n&&"jpg"!==n||(a=i.a.createElement("div",{style:{backgroundImage:'url("'.concat(e.document,'")'),backgroundPosition:"center",backgroundSize:"cover",backgroundRepeat:"no-repeat",height:"300px",borderRadius:"3px",width:"100%",margin:"auto"}})),"docx"!==n&&"doc"!==n||(a=i.a.createElement(y.a,{fileType:n,filePath:e.document}));var r=de.find((function(t){return t.value===e.documentType})).primaryText;return i.a.createElement(u.a,{key:"document[".concat(t,"]")},i.a.createElement(l.a,{paragraph:!0,variant:"h6",gutterBottom:!0},r),a)}))),t.isAccountApproved&&!t.isAccountSuspended&&i.a.createElement(u.a,null,i.a.createElement(l.a,{paragraph:!0,variant:"body1",gutterBottom:!0},F("userSummary.reason")),i.a.createElement(D.a,{label:F("userSummary.reason"),input:{value:ae,onChange:function(e){return ne(e.target.value)}},options:{multiline:!0,rows:3,variant:I.a}})),!c&&i.a.createElement(u.a,null,i.a.createElement(p.a,{control:i.a.createElement(f.a,{checked:K,onChange:ce,value:"checked"}),label:"".concat(!t.isAccountApproved&&pe?F("userSummary.approveAccount"):t.isAccountSuspended?F("userSummary.activateAccount"):F("userSummary.suspendAccount"))}),i.a.createElement(g.a,{disabled:!K,onClick:function(){if(!t.isAccountApproved&&pe)k(t._id,a,M);else{var e=t.isAccountSuspended?"reactivate":"suspend",n=ae;S(t._id,e,n,a,M)}},color:!t.isAccountApproved||t.isAccountSuspended?"primary":"secondary"},F("userSummary.buttons.submit"))),((o||{}).studentsEnrollRequests||[]).findIndex((function(e){return e.student._id===t._id&&!e.droppedOut}))>-1&&i.a.createElement(u.a,null,i.a.createElement(p.a,{control:i.a.createElement(f.a,{checked:K,onChange:ce,value:"checked",disabled:ie&&oe===o.studentCapacity}),label:"".concat(F(ie?"confirmations.enrollConfirm.allow":"confirmations.enrollConfirm.deny"))}),i.a.createElement(g.a,{color:"primary",disabled:!K,onClick:function(){ie&&s(t._id,o._id,a,M),ie||d(t._id,o._id,a,M)}},F("userSummary.buttons.submit")),ie&&oe===o.studentCapacity&&i.a.createElement(l.a,{paragraph:!0,color:"error",variant:"subtitle1",gutterBottom:!0},F("userSummary.increaseCapacity"))))}))},813:function(e,t,a){"use strict";var n=a(0),r=n.createContext();t.a=r},814:function(e,t,a){"use strict";var n=a(0),r=n.createContext();t.a=r},816:function(e,t,a){"use strict";var n=a(19),r=a(0),o=a.n(r),i=a(30),c=a(734),s=a(436),l=Object(s.a)((function(e){return{root:{display:"flex",flexWrap:"wrap"},textField:{width:"100%",borderRadius:"1px",margin:"0 auto 5px"},textLabel:{margin:"0 3px 10px 3px"},marginTop:{marginTop:"5px"},darkBackground:{background:"#424242",color:"white"},lightBackground:{background:"white"}}}));t.a=Object(i.b)((function(e){return{isDarkTheme:e.common.isDarkTheme}}))((function(e){var t,a=e.input,i=e.label,s=(e.meta,e.options),u=void 0===s?{}:s,d=e.placeholder,m=e.textLabel,p=e.isDarkTheme,f=l();return o.a.createElement(r.Fragment,null,o.a.createElement("div",{className:[f.root,u.marginTop?f.marginTop:null].join(" ")},m?o.a.createElement("div",{className:f.textLabel},"".concat(i,":")):null,o.a.createElement(c.a,Object.assign({className:[f.textField,p?f.darkBackground:f.lightBackground].join(" "),autoComplete:"off"},a,(t={rows:u.rows,variant:u.variant,multiline:!0},Object(n.a)(t,"variant","outlined"),Object(n.a)(t,"placeholder",d),Object(n.a)(t,"InputProps",{readOnly:u.readOnly}),Object(n.a)(t,"disabled",u.disabled),t)))))}))},830:function(e,t,a){"use strict";var n=a(130),r=a(131),o=a(147),i=a(146),c=a(0),s=a.n(c),l=a(834),u=a.n(l),d=a(897),m=a(252),p=a.n(m),f=a(251),g=a.n(f),b=a(442),v=a(241),h=a(905),y=a.n(h),x=a(904),E=a.n(x),k=a(243),O=a(737);d.pdfjs.GlobalWorkerOptions.workerSrc="//cdnjs.cloudflare.com/ajax/libs/pdf.js/".concat(d.pdfjs.version,"/pdf.worker.js");var S=function(e){Object(o.a)(a,e);var t=Object(i.a)(a);function a(){var e;Object(n.a)(this,a);for(var r=arguments.length,o=new Array(r),i=0;i<r;i++)o[i]=arguments[i];return(e=t.call.apply(t,[this].concat(o))).state={numPages:null,pageNumber:1,scale:.6},e.onDocumentLoadSuccess=function(t){var a=t.numPages;e.setState({numPages:a,pageNumber:1})},e.previousPdfPage=function(){e.state.pageNumber>1&&e.setState({pageNumber:e.state.pageNumber-1})},e.nextPdfPage=function(){e.state.pageNumber<e.state.numPages&&e.setState({pageNumber:e.state.pageNumber+1})},e.setPdfPage=function(t){var a=parseInt(t.target.value),n=a;a>e.state.numPages&&(n=e.state.numPages),a<1&&(n=1),NaN!==a&&a||(n=1),e.setState({pageNumber:parseInt(n)})},e.handleScale=function(t){"in"===t&&e.setState((function(e){return{scale:e.scale+.2}})),"out"===t&&e.setState((function(e){return{scale:e.scale-.2}}))},e}return Object(r.a)(a,[{key:"render",value:function(){var e=this,t=this.state,a=t.pageNumber,n=t.numPages,r=t.scale,o=this.props,i=o.url,c=o.t,l={label:c("pdf.goToPage"),size:"small"};return s.a.createElement("div",null,s.a.createElement("p",{className:u.a.pageNumberDisplay},c("pdf.page")," ",a," ",c("pdf.of")," ",n),s.a.createElement("div",{className:u.a.flexPositioningEven},s.a.createElement(b.a,{disabled:1===a,color:"default",onClick:this.previousPdfPage,startIcon:s.a.createElement(g.a,null),size:"small"},c("pdf.page")," ",1===a?1:a-1),s.a.createElement(b.a,{disabled:a===n,onClick:this.nextPdfPage,color:"default",endIcon:s.a.createElement(p.a,null),size:"small"},c("pdf.page")," ",a===n?n:a+1)),s.a.createElement("div",{style:{display:"flex",justifyContent:"space-evenly"}},s.a.createElement(k.a,{options:l,input:{onChange:this.setPdfPage}})),s.a.createElement("div",{style:{overflow:"scroll",maxHeight:"450px"}},s.a.createElement(d.Document,{className:u.a.pdfCanvas,file:i,onLoadSuccess:this.onDocumentLoadSuccess,onLoadError:function(e){return console.log(e)},renderMode:"svg"},s.a.createElement(d.Page,{scale:r,pageNumber:a}))),s.a.createElement("div",{className:u.a.flexPositioningEven},s.a.createElement(v.a,{onClick:function(){e.state.scale>=0&&e.handleScale("out")},color:"primary",component:"span"},s.a.createElement(E.a,null)),s.a.createElement(v.a,{onClick:function(){e.handleScale("in")},color:"primary",component:"span"},s.a.createElement(y.a,null))))}}]),a}(c.Component);t.a=Object(O.a)("common")(S)},834:function(e,t,a){e.exports={pdfCanvas:"PdfViewer_pdfCanvas__2nu4D",flexPositioningEven:"PdfViewer_flexPositioningEven__1Lffj",pageNumberDisplay:"PdfViewer_pageNumberDisplay__qHBe7"}},840:function(e,t,a){"use strict";var n=a(11),r=a(5),o=a(0),i=(a(2),a(10)),c=a(13),s=a(814),l=o.forwardRef((function(e,t){var a=e.classes,c=e.className,l=e.component,u=void 0===l?"table":l,d=e.padding,m=void 0===d?"default":d,p=e.size,f=void 0===p?"medium":p,g=e.stickyHeader,b=void 0!==g&&g,v=Object(n.a)(e,["classes","className","component","padding","size","stickyHeader"]),h=o.useMemo((function(){return{padding:m,size:f,stickyHeader:b}}),[m,f,b]);return o.createElement(s.a.Provider,{value:h},o.createElement(u,Object(r.a)({role:"table"===u?null:"table",ref:t,className:Object(i.a)(a.root,c,b&&a.stickyHeader)},v)))}));t.a=Object(c.a)((function(e){return{root:{display:"table",width:"100%",borderCollapse:"collapse",borderSpacing:0,"& caption":Object(r.a)({},e.typography.body2,{padding:e.spacing(2),color:e.palette.text.secondary,textAlign:"left",captionSide:"bottom"})},stickyHeader:{borderCollapse:"separate"}}}),{name:"MuiTable"})(l)},841:function(e,t,a){"use strict";var n=a(5),r=a(11),o=a(0),i=(a(2),a(10)),c=a(13),s=a(813),l={variant:"body"},u=o.forwardRef((function(e,t){var a=e.classes,c=e.className,u=e.component,d=void 0===u?"tbody":u,m=Object(r.a)(e,["classes","className","component"]);return o.createElement(s.a.Provider,{value:l},o.createElement(d,Object(n.a)({className:Object(i.a)(a.root,c),ref:t,role:"tbody"===d?null:"rowgroup"},m)))}));t.a=Object(c.a)({root:{display:"table-row-group"}},{name:"MuiTableBody"})(u)},842:function(e,t,a){"use strict";var n=a(5),r=a(11),o=a(0),i=(a(2),a(10)),c=a(13),s=a(813),l=a(22),u=o.forwardRef((function(e,t){var a=e.classes,c=e.className,l=e.component,u=void 0===l?"tr":l,d=e.hover,m=void 0!==d&&d,p=e.selected,f=void 0!==p&&p,g=Object(r.a)(e,["classes","className","component","hover","selected"]),b=o.useContext(s.a);return o.createElement(u,Object(n.a)({ref:t,className:Object(i.a)(a.root,c,b&&{head:a.head,footer:a.footer}[b.variant],m&&a.hover,f&&a.selected),role:"tr"===u?null:"row"},g))}));t.a=Object(c.a)((function(e){return{root:{color:"inherit",display:"table-row",verticalAlign:"middle",outline:0,"&$hover:hover":{backgroundColor:e.palette.action.hover},"&$selected, &$selected:hover":{backgroundColor:Object(l.c)(e.palette.secondary.main,e.palette.action.selectedOpacity)}},selected:{},hover:{},head:{},footer:{}}}),{name:"MuiTableRow"})(u)},843:function(e,t,a){"use strict";var n=a(11),r=a(5),o=a(0),i=(a(2),a(10)),c=a(13),s=a(16),l=a(22),u=a(814),d=a(813),m=o.forwardRef((function(e,t){var a,c,l=e.align,m=void 0===l?"inherit":l,p=e.classes,f=e.className,g=e.component,b=e.padding,v=e.scope,h=e.size,y=e.sortDirection,x=e.variant,E=Object(n.a)(e,["align","classes","className","component","padding","scope","size","sortDirection","variant"]),k=o.useContext(u.a),O=o.useContext(d.a),S=O&&"head"===O.variant;g?(c=g,a=S?"columnheader":"cell"):c=S?"th":"td";var j=v;!j&&S&&(j="col");var C=b||(k&&k.padding?k.padding:"default"),A=h||(k&&k.size?k.size:"medium"),P=x||O&&O.variant,w=null;return y&&(w="asc"===y?"ascending":"descending"),o.createElement(c,Object(r.a)({ref:t,className:Object(i.a)(p.root,p[P],f,"inherit"!==m&&p["align".concat(Object(s.a)(m))],"default"!==C&&p["padding".concat(Object(s.a)(C))],"medium"!==A&&p["size".concat(Object(s.a)(A))],"head"===P&&k&&k.stickyHeader&&p.stickyHeader),"aria-sort":w,role:a,scope:j},E))}));t.a=Object(c.a)((function(e){return{root:Object(r.a)({},e.typography.body2,{display:"table-cell",verticalAlign:"inherit",borderBottom:"1px solid\n    ".concat("light"===e.palette.type?Object(l.e)(Object(l.c)(e.palette.divider,1),.88):Object(l.a)(Object(l.c)(e.palette.divider,1),.68)),textAlign:"left",padding:16}),head:{color:e.palette.text.primary,lineHeight:e.typography.pxToRem(24),fontWeight:e.typography.fontWeightMedium},body:{color:e.palette.text.primary},footer:{color:e.palette.text.secondary,lineHeight:e.typography.pxToRem(21),fontSize:e.typography.pxToRem(12)},sizeSmall:{padding:"6px 24px 6px 16px","&:last-child":{paddingRight:16},"&$paddingCheckbox":{width:24,padding:"0 12px 0 16px","&:last-child":{paddingLeft:12,paddingRight:16},"& > *":{padding:0}}},paddingCheckbox:{width:48,padding:"0 0 0 4px","&:last-child":{paddingLeft:0,paddingRight:4}},paddingNone:{padding:0,"&:last-child":{padding:0}},alignLeft:{textAlign:"left"},alignCenter:{textAlign:"center"},alignRight:{textAlign:"right",flexDirection:"row-reverse"},alignJustify:{textAlign:"justify"},stickyHeader:{position:"sticky",top:0,left:0,zIndex:2,backgroundColor:e.palette.background.default}}}),{name:"MuiTableCell"})(m)},854:function(e,t,a){"use strict";var n=a(91);Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;var r=n(a(0)),o=(0,n(a(107)).default)(r.default.createElement("path",{d:"M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"}),"KeyboardArrowLeft");t.default=o},855:function(e,t,a){"use strict";var n=a(91);Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;var r=n(a(0)),o=(0,n(a(107)).default)(r.default.createElement("path",{d:"M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"}),"KeyboardArrowRight");t.default=o},861:function(e,t){function a(e){var t=new Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}a.keys=function(){return[]},a.resolve=a,e.exports=a,a.id=861},898:function(e,t){},899:function(e,t){},900:function(e,t){},901:function(e,t){},902:function(e,t){},909:function(e,t,a){"use strict";a.d(t,"a",(function(){return n}));var n=function(e,t,a){var n=a||t.testResults;if(n&&e.tests){var r=(e.lessons||[]).reduce((function(e,t){return e+t.lessonSlides.length}),0),o=(e.lessons||[]).reduce((function(e,a){return a.lessonSlides.filter((function(e){return e.studentsSeen.includes(t._id)})).length+e}),0),i=(n||[]).filter((function(t){return t.isExcused&&t.course===e._id})).length,c=e.tests.length-i,s=e.tests.filter((function(e){return(n||[]).findIndex((function(t){return e._id===t.test&&t.closed&&!t.isExcused}))>-1})).length+o,l=r+c;return isNaN(parseInt(s/l*100))?0:parseInt(s/l*100)}}},992:function(e,t,a){"use strict";a.r(t);var n=a(1022),r=a(0),o=a.n(r),i=a(421),c=a(30),s=a(242),l=a(106);t.default=Object(c.b)((function(e){var t=Object(s.a)(e.common.courses,e.common.selectedCourse);return{students:e.common.students,course:t,token:e.authentication.token,instructorLoggedIn:e.authentication.instructorLoggedIn,studentLoggedIn:e.authentication.studentLoggedIn,studentTestResults:e.studentTest.testResults,modalDocument:e.common.modalDocument,isDarkTheme:e.common.isDarkTheme}}))((function(e){var t=e.course,a=e.studentTestResults,r=void 0===a?{}:a,c=e.student,s=(e.students,e.instructorLoggedIn),u=e.studentLoggedIn,d=e.isDarkTheme,m=Object(i.a)().t;if(!t)return null;var p,f=t.tests;(u&&(p=((r||{}).testResults||[]).filter((function(e){return e.graded&&null!==e.grade&&!e.isExcused}))),s)&&(p=(((t.studentsEnrollRequests.filter((function(e){return e.approved||e.droppedOut||e.denied})).map((function(e){return e.student}))||[]||[]).find((function(e){return e._id===c._id}))||{}).testResults||[]).filter((function(e){return e.graded&&null!==e.grade&&!e.isExcused})));var g=function(e,t){return e.createdAt<t.createdAt?-1:e.createdAt>t.createdAt?1:0},b=p.filter((function(e){return e.course===t._id&&f.findIndex((function(t){return t._id===e.test}))>-1})),v=b.map((function(e,t){var a=f.find((function(t){return t._id===e.test})),n=a.testName,r=a.assignment,o=a.createdAt,i=a.availableOnDate;return{x:"".concat(n," (").concat(m(r?"progressReport.assignment":"progressReport.test"),")"),y:e.grade,createdAt:i?parseInt(i):parseInt(o)}})).sort(g),h=b.map((function(e,t){var a=f.find((function(t){return t._id===e.test})),n=a.classAverage,r=a.testName,o=a.assignment,i=a.createdAt,c=a.availableOnDate;return{x:"".concat(r," (").concat(m(o?"progressReport.assignment":"progressReport.test"),")"),y:n,createdAt:c?parseInt(c):parseInt(i)}})).sort(g),y=[{id:m(u?"progressReport.yourProgress":"progressReport.studentProgress"),color:"hsl(193, 70%, 50%)",data:v},{id:m("progressReport.classAverage"),color:"hsl(11, 70%, 50%)",data:h}];return o.a.createElement("div",{style:{height:700,width:"100%"}},o.a.createElement(l.a,{align:"center",variant:"h4",gutterBottom:!0},m("layout.drawer.progressReport")),o.a.createElement(n.a,{data:y,margin:{top:70,right:10,bottom:150,left:45},xScale:{type:"point"},yScale:{type:"linear",min:0,max:100,stacked:!1,reverse:!1},curve:"natural",axisTop:null,axisRight:null,axisBottom:{orient:"bottom",tickSize:0,tickPadding:30,tickRotation:-85,legend:m("progressReport.assignmentsTests"),legendOffset:10,legendPosition:"middle"},axisLeft:{orient:"left",tickSize:5,tickPadding:5,tickRotation:0,legend:m("progressReport.grade"),legendOffset:-40,legendPosition:"middle"},colors:{scheme:"category10"},lineWidth:5,theme:d?{textColor:"white",background:"#424242",tooltip:{basic:{background:"#424242"},container:{background:"#424242"}}}:{},pointColor:{theme:"background"},pointBorderWidth:2,pointBorderColor:{from:"serieColor"},pointLabel:"y",pointLabelYOffset:-12,areaBaselineValue:30,areaOpacity:.05,useMesh:!0,legends:[{anchor:"top",direction:"row",justify:!1,translateX:-28,translateY:-60,itemsSpacing:20,itemDirection:"top-to-bottom",itemWidth:100,itemHeight:74,itemOpacity:.75,symbolSize:18,symbolShape:"circle",symbolBorderColor:"rgba(0, 0, 0, .5)",itemTextColor:d?"white":"black",effects:[{on:"hover",style:{itemBackground:"rgba(0, 0, 0, .03)",itemOpacity:1}}]}],motionStiffness:80}))}))}}]);