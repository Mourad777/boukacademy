(this["webpackJsonpe-learn"]=this["webpackJsonpe-learn"]||[]).push([[36],{1025:function(e,t,a){"use strict";a.d(t,"a",(function(){return r}));var n=a(976),r=function e(t,a,r,c){r&&t&&(a=setTimeout((function(){var o=Object(n.b)(r),i=o.isIrregOfficeHour,u=o.isRegOfficeHour;c(!(!i&&!u)),t?e(Object(n.a)(r,Date.now())):clearTimeout(a)}),t-Date.now()))}},1340:function(e,t,a){"use strict";a.r(t);var n=a(63),r=a(0),c=a.n(r),o=a(31),i=a(4),u=a(798),s=a(740),l=a(801),f=a(38),m=a(69),d=a.n(m),g=a(1029),b=a(154),O=a.n(b),h=a(876),p=a(106),v=a(422),E=a(909),y=a.n(E),w=a(244),D=a(83),z=a(976),k=a(1025);t.default=Object(o.b)((function(e){var t=Object(w.a)(e.common.courses,e.common.selectedCourse);return{selectedCourse:e.common.selectedCourse,students:e.common.students,course:t,userId:e.authentication.userId,token:e.authentication.token,configuration:e.common.configuration}}),(function(e){return{setChatUser:function(t){e(i.Tc(t))},setTab:function(t){e(i.fd(t))},fetchStudents:function(t,a){return e(i.Tb(t,a))}}}))((function(e){var t=e.students,a=e.course,o=e.userId,i=e.selectedCourse,m=e.configuration,b=e.fetchStudents,E=Object(D.g)(),w=Object(r.useState)(!1),I=Object(n.a)(w,2),T=I[0],j=I[1],H=Object(D.h)().pathname,R=!!Object(D.f)(H,{path:"/instructor-panel/course/:courseId/chat/contacts",exact:!0}),C=!!Object(D.f)(H,{path:"/student-panel/course/:courseId/chat/contacts",exact:!0}),S=Object(v.a)().t,Y=c.a.useState([]),_=Object(n.a)(Y,2),M=_[0],x=_[1],N=m.isChatAllowedOutsideOfficehours;C&&(N=(m.coursesIsChatAllowedOutsideOfficehours||[]).includes(a._id));var P=Object(r.useRef)();Object(r.useEffect)((function(){t||P.current||!i||(b(i,localStorage.getItem("token")),P.current=!0)})),Object(r.useEffect)((function(){if(i){var e=localStorage.getItem("token"),t=O()("https://www.boukacademy.com/",{query:{token:e}});return t.emit("initializeContacts"),t.on("activeUsers",(function(e){x(e)})),function(){return t.off("activeUsers")}}}),[i]),Object(r.useEffect)((function(){var e=Object(z.b)(a||{},Date.now()),t=e.isIrregOfficeHour,n=e.isRegOfficeHour;j(!(!t&&!n));var r=Object(z.a)(a,Date.now());return Object(k.a)(r,void 0,a,j),function(){clearTimeout(void 0)}}),[a]);var B=function(e){E.push("/".concat(C?"student":"instructor","-panel/course/").concat(i,"/chat/user/").concat(e))},U=c.a.createElement(f.a,null,!T&&!N&&c.a.createElement(p.a,{gutterBottom:!0,variant:"subtitle1"},S(C?"chat.chatInstructorOnlyOfficeHours":"chat.chatStudentOnlyOfficeHours")),(a.regularOfficeHours||[]).map((function(e,t){var a=y()(new Date(Date.now())).tz(e.timezoneRegion).format("z");return c.a.createElement(f.a,{key:e._id},c.a.createElement(f.a,null,c.a.createElement(p.a,{variant:"caption",style:{display:"block",fontWeight:"bold"}},S("courseForm.days.".concat(e.day.toLowerCase()))),c.a.createElement(p.a,{variant:"caption"},"".concat(S("chat.from")," ").concat(e.startTime," ").concat(S("chat.to")," ").concat(e.endTime," ").concat(a))))})),(a.irregularOfficeHours||[]).map((function(e,t){var a=y()(new Date(Date.now())).tz(e.timezoneRegion).format("z");return c.a.createElement(f.a,{key:e._id},c.a.createElement(f.a,null,c.a.createElement(p.a,{variant:"caption",style:{display:"block",fontWeight:"bold"}},"".concat(d()(parseInt(e.date)).locale(localStorage.getItem("i18nextLng")).format("MMMM DD YYYY")," ")),c.a.createElement(p.a,{variant:"caption"}," ".concat(S("chat.from")," ").concat(e.startTime," ").concat(S("chat.to")," ").concat(e.endTime," ").concat(a))))})));if(!a)return null;var W=a.courseInstructor||{};return c.a.createElement(f.a,null,c.a.createElement(p.a,{align:"center",variant:"h4",gutterBottom:!0},S("layout.drawer.chat")),c.a.createElement(u.a,null,C&&c.a.createElement(f.a,null,!T&&C&&!N&&c.a.createElement(f.a,null,U),c.a.createElement(s.a,null,c.a.createElement(l.a,{secondary:S("chat.instructor")})),c.a.createElement(s.a,{disabled:!T&&!N,button:!0,onClick:function(){return B(a.courseInstructor._id)}},M.includes(W._id)?c.a.createElement(h.a,{overlap:"circle",anchorOrigin:{vertical:"bottom",horizontal:"right"},variant:"dot"},c.a.createElement(g.a,{style:{marginRight:10},src:W.profilePicture})):c.a.createElement(g.a,{style:{marginRight:10},src:W.profilePicture}),c.a.createElement(l.a,{primary:"".concat(W.firstName," ").concat(W.lastName)}))),c.a.createElement(f.a,null,!T&&!C&&!N&&c.a.createElement(f.a,null,U),(t||[]).map((function(e,t){return c.a.createElement(f.a,{key:e._id},o!==e._id&&c.a.createElement(f.a,null,0===t&&R||1===t&&C&&c.a.createElement(s.a,null,c.a.createElement(l.a,{secondary:S("chat.students")})),0===t&&c.a.createElement(s.a,null,c.a.createElement(l.a,{secondary:S("chat.students")})),c.a.createElement(s.a,{disabled:R&&!T&&!N,button:!0,onClick:function(){return B(e._id)}},M.includes(e._id)?c.a.createElement(h.a,{overlap:"circle",anchorOrigin:{vertical:"bottom",horizontal:"right"},variant:"dot"},c.a.createElement(g.a,{style:{marginRight:10},src:e.profilePicture})):c.a.createElement(g.a,{style:{marginRight:10},src:e.profilePicture}),c.a.createElement(l.a,{primary:"".concat(e.firstName," ").concat(e.lastName)}),c.a.createElement(l.a,{secondary:"ID: ".concat(e._id.replace(/\D/g,""))}))))})))))}))},876:function(e,t,a){"use strict";var n=a(13),r=a(993),c=Object(n.a)((function(e){return{badge:{backgroundColor:"#44b700",color:"#44b700",boxShadow:"0 0 0 2px ".concat(e.palette.background.paper),"&::after":{position:"absolute",top:0,left:0,width:"100%",height:"100%",borderRadius:"50%",animation:"$ripple 1.2s infinite ease-in-out",border:"1px solid currentColor",content:'""'}},"@keyframes ripple":{"0%":{transform:"scale(.8)",opacity:1},"100%":{transform:"scale(2.4)",opacity:0}}}}))(r.a);t.a=c},934:function(e,t,a){"use strict";a.d(t,"a",(function(){return n}));var n=function(e){var t;switch(e){case"Sunday":t=0;break;case"Monday":t=1;break;case"Tuesday":t=2;break;case"Wednesday":t=3;break;case"Thursday":t=4;break;case"Friday":t=5;break;case"Saturday":t=6}return t}},976:function(e,t,a){"use strict";a.d(t,"b",(function(){return s})),a.d(t,"a",(function(){return m}));var n=a(934),r=a(69),c=a.n(r),o=a(909),i=a.n(o),u=function(e){return new Date("01/01/2020 ".concat(e)).getTime()},s=function(e){if(!e)return{isIrregOfficeHour:null,isRegOfficeHour:null};var t="".concat(c()().hour(),":").concat(c()().minutes());return{isRegOfficeHour:(e.regularOfficeHours||[]).findIndex((function(e){var a=u((e||{}).startTime),r=60*i.a.tz.zone((e||{}).timezoneRegion).utcOffset(a)*1e3+a,c=u((e||{}).endTime),o=60*i.a.tz.zone((e||{}).timezoneRegion).utcOffset(c)*1e3+c,s=60*i.a.tz.zone((e||{}).timezoneRegion).utcOffset(u(t))*1e3+u(t);if((new Date).getDay()===Object(n.a)(e.day)&&s>=r&&s<o)return e}))>-1,isIrregOfficeHour:(e.irregularOfficeHours||[]).findIndex((function(e){var a=u((e||{}).startTime),n=60*i.a.tz.zone((e||{}).timezoneRegion).utcOffset(a)*1e3+a,r=u((e||{}).endTime),c=60*i.a.tz.zone((e||{}).timezoneRegion).utcOffset(r)*1e3+r,o=60*i.a.tz.zone((e||{}).timezoneRegion).utcOffset(u(t))*1e3+u(t);if(new Date(Date.now()).setHours(0,0,0,0).toString()===parseInt(e.date).toString()&&o>=n&&o<c)return e}))>-1}},l=function(e,t,a){if(e)return(e.regularOfficeHours||[]).map((function(e){for(var a,r=c()(Date.now()),o=c()(parseInt(Date.now()+1728e5)),i=Object(n.a)(e.day),u=r.clone();u.day(0+i).isBefore(o);){a=u.clone()._d;var s=new Date("".concat(c()(new Date(a)).format("MM/DD/YYYY")," ").concat(e[t])).getTime();return s<Date.now()?null:new Date(s).getTime()}})).sort().filter((function(e){return e}))[0]},f=function(e,t,a){if(e)return(e.irregularOfficeHours||[]).map((function(e){var n=new Date("".concat(c()(parseInt(e.date)).format("MM/DD/YYYY")," ").concat(e[t])).getTime();return n<=(a||Date.now())?null:n})).sort().filter((function(e){return e}))[0]},m=function(e,t){var a,n,r,c,o=s(e),i=o.isIrregOfficeHour,u=o.isRegOfficeHour;return(i||u)&&(n=l(e,"endTime"),c=f(e,"endTime",t)),i||u||(a=l(e,"startTime"),r=f(e,"startTime",t)),[r,a,c,n].filter((function(e){return e})).sort()[0]}}}]);