(this["webpackJsonpe-learn"]=this["webpackJsonpe-learn"]||[]).push([[35],{1076:function(e,t,a){"use strict";a.r(t);var n=a(63),o=a(0),s=a.n(o),i=a(337),r=a(27),l=a(340),c=a(336),d=a(30),m=a(38),u=a(106),f=a(4),g=a(732),p=a(809),b=a(244),T=a(442),k=a(914),h=a(7),_=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t={};return(e.configuration||{}).isPasswordRequiredStartTest?(e.password||(t.password=h.a.t("confirmations.takeTest.required")),t):t},w=a(877),v=a(421),I=a(82),D=Object(c.a)({form:"takeTestConfirmation",validate:_,destroyOnUnmount:!0,touchOnBlur:!1})((function(e){var t=e.startTest,a=e.userId,r=e.token,l=e.modalDocument,c=void 0===l?{}:l,d=e.markAsSeen,f=e.fetchNotifications,h=e.notifications,D=e.testResults,y=e.modalDocument,F=e.modalType,O=e.width,E=e.formValues,x=e.touchField,S=e.configuration,G=e.closeModal,L=e.course,j=(e.onStartAssignment,e.onContinueAssignment,e.loadedUser),R=Object(o.useState)(!1),C=Object(n.a)(R,2),P=C[0],A=C[1],M=Object(v.a)().t,B=Object(I.g)();Object(o.useEffect)((function(){if("startTestConfirmation"===F){var e=(h||[]).find((function(e){return e.documentId===(y||{})._id&&"test"===e.documentType||e.documentId===(y||{})._id&&"resetTest"===e.documentType?e:void 0}));e&&(d(e._id,r),f(r))}}),[]);c.testType,c.testType,c.testType;var W,N=((D||[]).find((function(e){return e.test===c._id}))||{}).graded,Y=((D||[]).find((function(e){return e.test===c._id}))||{}).closed,H=((D||[]).find((function(e){return e.test===c._id}))||{}).isExcused,U=(!!c.gradeReleaseDate&&Date.now()>parseInt(c.gradeReleaseDate)||!c.gradeReleaseDate)&&N,q=Date.now()>parseInt(c.dueDate)&&!c.assignment,z=Date.now()>parseInt(c.dueDate)+864e5*c.lateDaysAllowed&&c.assignment,K=Date.now()>parseInt(c.availableOnDate);!K&&c.availableOnDate&&(W=M("confirmations.takeTest.testNotAvailable"),c.assignment&&(W=M("confirmations.takeTest.assignmentNotAvailable"))),z&&(W=M("confirmations.takeTest.assignmentPastDue")),q&&(W=M("confirmations.takeTest.testPastDue")),Y&&!N&&(W=M("confirmations.takeTest.gradePending")),H&&(W=M("confirmations.takeTest.testExcused"),c.assignment&&(W=M("confirmations.takeTest.assignmentExcused")));var V=(!q||!c.dueDate)&&(K||!c.availableOnDate)&&!Y,X=(!z||!c.dueDate)&&(K||!c.availableOnDate)&&!Y,J=[{id:"".concat(M(O>560?"confirmations.takeTest.mc":"confirmations.takeTest.mcShort")," ").concat(c.sectionWeights.mcSection,"%"),label:M("confirmations.takeTest.mc"),value:c.sectionWeights.mcSection,color:"hsl(128, 70%, 50%)"},{id:"".concat(M("confirmations.takeTest.essay")," ").concat(c.sectionWeights.essaySection,"%"),label:M("confirmations.takeTest.essay"),value:c.sectionWeights.essaySection,color:"hsl(88, 70%, 50%)"},{id:"".concat(M("confirmations.takeTest.speaking")," ").concat(c.sectionWeights.speakingSection,"%"),label:M("confirmations.takeTest.speaking"),value:c.sectionWeights.speakingSection,color:"hsl(245, 70%, 50%)"},{id:"".concat(M(O>560?"confirmations.takeTest.fillblanks":"confirmations.takeTest.fillblanksShort")," ").concat(c.sectionWeights.fillBlankSection,"%"),label:M("confirmations.takeTest.fillblanks"),value:c.sectionWeights.fillBlankSection,color:"hsl(340, 70%, 50%)"}].filter((function(e){return e.value}));(D||[]).find((function(e){return e.test===c._id}));return s.a.createElement("div",null,s.a.createElement(u.a,{align:"center",gutterBottom:!0,variant:"subtitle1",color:"error"},W),s.a.createElement(w.a,{test:c,startTest:!0}),Object.values(c.sectionWeights).filter((function(e){return e})).length>1&&s.a.createElement("div",{style:{height:O>450?300:200}},s.a.createElement(k.a,{data:J})),X&&c.assignment&&s.a.createElement("div",{style:{display:"flex",justifyContent:"space-around"}},s.a.createElement(T.a,{color:"primary",onClick:function(){B.push("/student-panel/course/".concat(c.course,"/assignment-in-session/").concat(c._id)),G()}},M("confirmations.takeTest.startAssignment"))),V&&!c.assignment&&s.a.createElement(m.a,null,s.a.createElement(u.a,{paragraph:!0,variant:"caption",gutterBottom:!0},M("confirmations.takeTest.saveOften")),!j.isPassword&&s.a.createElement(u.a,{color:"error",paragraph:!0,variant:"subtitle1",gutterBottom:!0},M("confirmations.takeTest.setUpPassword")),s.a.createElement(g.a,{disabled:!j.isPassword,control:s.a.createElement(p.a,{checked:P,onChange:function(e){A(e.target.checked)},value:"checked"}),label:M("confirmations.takeTest.agree")}),s.a.createElement(T.a,{disabled:!P,color:"secondary",onClick:function(){var e=_(E);x("password"),e.password||t(c._id,a,r,E.password)}},M("confirmations.takeTest.startTest")),P&&S.isPasswordRequiredStartTest&&s.a.createElement(m.a,null,s.a.createElement(i.a,{component:b.a,name:"password",simple:!0,label:M("confirmations.takeTest.loginPassword"),type:"password",textLabel:!0,disabled:!j.isPassword}))),U&&s.a.createElement("div",{style:{display:"flex",justifyContent:"space-around"}},s.a.createElement(T.a,{color:"primary",onClick:function(){B.push("/student-panel/course/".concat(L,"/completed-").concat(c.assignment?"assignments":"tests","/").concat(c._id)),G()}},c.assignment?M("confirmations.takeTest.reviewAssignment"):M("confirmations.takeTest.reviewTest"))))}));t.default=Object(d.b)((function(e,t){var a=e.common.configuration,n=(t.match,e.authentication.loadedUser);return{formValues:Object(l.a)("takeTestConfirmation")(e),userId:e.authentication.userId,token:e.authentication.token,modalDocument:e.common.modalDocument,modalType:e.common.modalType,testResults:(e.studentTest.testResults||{}).testResults,notifications:e.common.notifications,width:e.common.width,configuration:a,initialValues:{configuration:a,loadedUser:n},course:e.common.selectedCourse,loadedUser:n}}),(function(e){return{startTest:function(t,a,n,o){return e(f.Wb(t,a,n,null,null,o))},closeModal:function(){e(f.u())},markAsSeen:function(t,a){e(f.kc(t,a))},fetchNotifications:function(t){e(f.Kb(t))},touchField:function(t){e(Object(r.d)("takeTestConfirmation",t))},onStartAssignment:function(t,a){e(f.Wb(t,!0,a,null,!1))},onContinueAssignment:function(t,a,n){e(f.Wb(t,!0,a,n,!1)),e(f.Kc("assignment"))}}}))(D)},816:function(e,t,a){"use strict";var n=a(19),o=a(0),s=a.n(o),i=a(30),r=a(734),l=a(436),c=Object(l.a)((function(e){return{root:{display:"flex",flexWrap:"wrap"},textField:{width:"100%",borderRadius:"1px",margin:"0 auto 5px"},textLabel:{margin:"0 3px 10px 3px"},marginTop:{marginTop:"5px"},darkBackground:{background:"#424242",color:"white"},lightBackground:{background:"white"}}}));t.a=Object(i.b)((function(e){return{isDarkTheme:e.common.isDarkTheme}}))((function(e){var t,a=e.input,i=e.label,l=(e.meta,e.options),d=void 0===l?{}:l,m=e.placeholder,u=e.textLabel,f=e.isDarkTheme,g=c();return s.a.createElement(o.Fragment,null,s.a.createElement("div",{className:[g.root,d.marginTop?g.marginTop:null].join(" ")},u?s.a.createElement("div",{className:g.textLabel},"".concat(i,":")):null,s.a.createElement(r.a,Object.assign({className:[g.textField,f?g.darkBackground:g.lightBackground].join(" "),autoComplete:"off"},a,(t={rows:d.rows,variant:d.variant,multiline:!0},Object(n.a)(t,"variant","outlined"),Object(n.a)(t,"placeholder",m),Object(n.a)(t,"InputProps",{readOnly:d.readOnly}),Object(n.a)(t,"disabled",d.disabled),t)))))}))},839:function(e,t,a){e.exports={PositionIcon:"GradeTestForm_PositionIcon__3tEUX",QuestionContainer:"GradeTestForm_QuestionContainer__1QBii",SectionMarks:"GradeTestForm_SectionMarks__2v940",GreenText:"GradeTestForm_GreenText__3bK8t",RedText:"GradeTestForm_RedText__2WSx3",YellowBackground:"GradeTestForm_YellowBackground__5V6jI",button:"GradeTestForm_button__3-Rp9",Inline:"GradeTestForm_Inline__EzUF6",center:"GradeTestForm_center__GfdOG",TestTypeRadio:"GradeTestForm_TestTypeRadio__3fFY5",ListHorizontalDisplay:"GradeTestForm_ListHorizontalDisplay__3D7Ps",TestFormList:"GradeTestForm_TestFormList__1zXu0",Editor:"GradeTestForm_Editor__MFD0s",greenIcon:"GradeTestForm_greenIcon__2fEJa",redIcon:"GradeTestForm_redIcon__30O2n",CorrectAnswerHighlight:"GradeTestForm_CorrectAnswerHighlight__27prd",BlankPreview:"GradeTestForm_BlankPreview__2TjaK",InputField:"GradeTestForm_InputField__V0OKB",FullWidth:"GradeTestForm_FullWidth__24idF",InputFieldBottomMargin:"GradeTestForm_InputFieldBottomMargin__fauyA",SelectField:"GradeTestForm_SelectField__GIrnf",Pointer:"GradeTestForm_Pointer__3GN8X",audioPlayerPreview:"GradeTestForm_audioPlayerPreview__1R4w3",SlideBackground:"GradeTestForm_SlideBackground__oek-M"}},877:function(e,t,a){"use strict";var n=a(0),o=a.n(n),s=a(30),i=a(840),r=a(841),l=a(843),c=a(842),d=a(839),m=a.n(d),u=(a(38),a(69)),f=a.n(u),g=a(421),p=a(816),b=a(444),T=a(242);t.a=Object(s.b)((function(e){return{course:Object(T.a)(e.common.courses,e.common.selectedCourse),isDarkTheme:e.common.isDarkTheme}}))((function(e){var t=e.test,a=e.student,n=(e.startTest,e.course),s=e.isDarkTheme,d=Object(g.a)().t,u=parseFloat(t.weight),T=((n||{}).tests||[]).reduce((function(e,t){return e+t.weight}),0),k=parseFloat((u/T*100).toFixed(2)),h=!t.assignment,_=[a?[d("testInfo.student"),"".concat(a.firstName," ").concat(a.lastName)]:null,a?[d("testInfo.studentId"),"".concat((a._id||"").replace(/\D/g,""))]:null,[d(h?"testInfo.test":"testInfo.assignment"),t.testName],[d("testInfo.weight"),"".concat(Number.isNaN(k)?0:k,"%")],h?[d("testInfo.lessonsAllowed"),t.blockedNotes?d("testInfo.no"):d("testInfo.yes")]:null,h?[d("testInfo.timer"),t.timer?"".concat(t.timer," ").concat(1==t.timer?d("testInfo.minute"):d("testInfo.plural.minute")):d("testInfo.no")]:null,h?[d("testInfo.type"),d("testInfo.".concat(t.testType))]:null,h?[d("testInfo.passingRequired"),t.passingRequired?d("testInfo.yes"):d("testInfo.no")]:null,t.passingGrade?[d("testInfo.passingGrade"),"".concat(t.passingGrade,"%")]:null,h?null:[d("testInfo.lateSubmissionAllowed"),t.allowLateSubmission?d("testInfo.yes"):d("testInfo.no")],!h&&t.allowLateSubmission?[d("testInfo.dailyPenalty"),"".concat(t.latePenalty,"%")]:null,!h&&t.allowLateSubmission?[d("testInfo.maxLateDaysAllowed"),t.lateDaysAllowed]:null,t.availableOnDate?[d("testInfo.availableOnDate"),f()(parseInt(t.availableOnDate)).locale(localStorage.getItem("i18nextLng")).format("dddd, MMMM DD YYYY, HH:mm")]:null,t.dueDate?[d(h?"testInfo.closeDate":"testInfo.dueDate"),f()(parseInt(t.dueDate)).locale(localStorage.getItem("i18nextLng")).format("dddd, MMMM DD YYYY, HH:mm")]:null,t.gradeReleaseDate?[d("testInfo.gradeReleaseDate"),f()(parseInt(t.gradeReleaseDate)).locale(localStorage.getItem("i18nextLng")).format("dddd, MMMM DD YYYY, HH:mm")]:null].filter((function(e){return e})),w={backgroundColor:s?"#424242":"white",padding:"5px",borderRadius:"4px"};return o.a.createElement("div",{style:w},o.a.createElement(i.a,{className:m.a.table,"aria-label":"simple table"},o.a.createElement(r.a,null,_.map((function(e,t){return o.a.createElement(c.a,{key:t,className:m.a.MuiTableRow},o.a.createElement(l.a,{component:"th",scope:"row"},e[0]),o.a.createElement(l.a,{align:"right"},e[1]))})))),t.notes&&o.a.createElement(p.a,{label:d("testForm.fields.notes"),input:{value:t.notes},options:{multiline:!0,rows:3,variant:b.a,readOnly:!0},textLabel:!0}))}))},914:function(e,t,a){"use strict";var n=a(0),o=a.n(n),s=a(30),i=a(974);t.a=Object(s.b)((function(e){return{width:e.common.width,isDarkTheme:e.common.isDarkTheme}}))((function(e){var t=e.data,a=e.width,n=e.testForm,s=e.isDarkTheme,r={top:a>450?0:-200,right:110,bottom:a>450?0:-200,left:110};return n&&(r={top:a>450?50:-150,right:a>450?130:70,bottom:a>450?50:-150,left:a>450?130:70}),o.a.createElement(i.a,{data:t,margin:r,innerRadius:0,padAngle:.7,cornerRadius:3,colors:{scheme:"category10"},borderWidth:1,borderColor:{from:"color",modifiers:[["darker","0.2"]]},radialLabelsSkipAngle:10,radialLabelsTextXOffset:0,radialLabelsLinkOffset:-10,radialLabelsLinkDiagonalLength:15,radialLabelsLinkHorizontalLength:3,radialLabelsLinkStrokeWidth:1,radialLabelsLinkColor:{from:"color"},enableSlicesLabels:!1,slicesLabelsSkipAngle:3,slicesLabelsTextColor:"#333333",animate:!0,motionStiffness:90,motionDamping:15,theme:s?{textColor:"white",labels:{text:{fill:"white"}},background:"#424242",tooltip:{chip:{color:"white"},basic:{background:"#424242"},container:{background:"#424242"}}}:{}})}))}}]);