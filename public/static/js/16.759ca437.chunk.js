(this["webpackJsonpe-learn"]=this["webpackJsonpe-learn"]||[]).push([[16],{1232:function(t,r,a){t.exports={Auth:"PasswordReset_Auth__L_g1D",errorMessage:"PasswordReset_errorMessage__CWI2X",ButtonContainer:"PasswordReset_ButtonContainer__1Oubf"}},1331:function(t,r,a){"use strict";a.r(r),a.d(r,"PasswordReset",(function(){return j}));var e=a(27),o=a(51),n=a(52),s=a(56),i=a(55),c=a(0),u=a.n(c),d=a(332),l=a(336),m=a(338),p=a(31),w=a(331),h=a(30),_=a(7),f=a(238),b=a(857),B=a(1232),g=a.n(B),E=a(4),P=a(78),k=a(140),v=a(746),j=function(t){Object(s.a)(a,t);var r=Object(i.a)(a);function a(){var t;Object(o.a)(this,a);for(var e=arguments.length,n=new Array(e),s=0;s<e;s++)n[s]=arguments[s];return(t=r.call.apply(r,[this].concat(n))).state={isValid:!0},t.onSubmit=function(){var r=t.props.formErrors;r.password||r.confirmPassword?t.setState({isValid:!1}):t.props.submitNewPassword(t.props.formValues,t.props.match.params.token,t.props.match.params.accountType)},t}return Object(n.a)(a,[{key:"setFormValidity",value:function(t){this.setState({isValid:t})}},{key:"render",value:function(){var t=this,r=this.props,a=r.formErrors,e=r.triggerPasswordResetValidation,o=r.loading,n=r.t,s=a.password||a.confirmPassword,i=u.a.createElement("div",null,u.a.createElement(k.a,{transparent:!0,active:o}),u.a.createElement(d.a,{name:"password",component:f.a,label:n("account.newPassword"),type:"password"}),u.a.createElement(d.a,{name:"confirmPassword",component:f.a,label:n("account.confirmPassword"),type:"password"}),u.a.createElement("div",{className:g.a.ButtonContainer},u.a.createElement(b.a,{isError:!this.state.isValid&&s,btnType:"SubmitForm",clicked:function(){if(s)return e(),void t.setFormValidity(!1);t.onSubmit()}},n("account.buttons.setNewPassword"))));return u.a.createElement("div",{className:g.a.Auth},u.a.createElement(P.a,{style:{margin:"20px 0"},variant:"h5"},n("account.passwordReset")),i)}}]),a}(c.Component),y=Object(w.a)({form:"passwordReset",validate:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},r={},a=/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/;return a.test(t.password)||(r.password=_.a.t("account.errors.passwordConditions")),t.password||(r.password=_.a.t("account.errors.required")),t.confirmPassword?t.confirmPassword!==t.password&&(r.confirmPassword=_.a.t("account.errors.passwordMismatched")):r.confirmPassword=_.a.t("account.errors.required"),r},destroyOnUnmount:!0,touchOnBlur:!0})(j);r.default=Object(h.b)((function(t){return Object(e.a)({loading:t.authentication.loading,error:t.authentication.error,isAuthenticated:null!==t.authentication.token,authRedirectPath:t.authentication.authRedirectPath,formValues:Object(l.a)("passwordReset")(t),formErrors:Object(m.a)("passwordReset")(t)},"loading",t.authentication.loading)}),(function(t){return{submitNewPassword:function(r,a,e){return t(E.l(r,a,e))},triggerPasswordResetValidation:function(){t(Object(p.d)("passwordReset","password")),t(Object(p.d)("passwordReset","confirmPassword"))}}}))(Object(v.a)("common")(y))},857:function(t,r,a){"use strict";var e=a(0),o=a.n(e),n=a(869),s=a.n(n);r.a=function(t){return o.a.createElement("button",{type:t.type,disabled:t.disabled,className:t.modal?[s.a.ModalButton,t.isError?s.a.ModalError:t.isDarkTheme?s.a.darkBackground:s.a.lightBackground].join(" "):[t.halfWidth?s.a.HalfWidth:s.a.FullWidth,s.a.Button,t.isError?s.a.Error:s.a.SubmitForm].join(" "),onClick:t.clicked},t.children)}},869:function(t,r,a){t.exports={Button:"Button_Button__3kAHe",HalfWidth:"Button_HalfWidth__1ZGYD",FullWidth:"Button_FullWidth__28dxb",Success:"Button_Success__q8Jxu",Danger:"Button_Danger__3tneE",Error:"Button_Error__1GeJ2",SubmitForm:"Button_SubmitForm__34uhs",ModalButton:"Button_ModalButton__3yerH",ModalError:"Button_ModalError__2CEj1",darkBackground:"Button_darkBackground__1x8Lj",lightBackground:"Button_lightBackground__TIVM9"}}}]);