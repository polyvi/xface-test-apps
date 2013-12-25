var LoginRegister = {
	"PageType":"Login",
	"initLoginRegister" : function(){
			$("#LoginTitle").html("登录");
			$("#LoginButton1").text("注册");
			$("#LoginButton2").text("登录");
	},
	"Login" : function(){
		
			$("#Name").val("");
			$("#Password").val("");
			$("#LoginTitle").html("登录");
			$("#LoginButton1").text("注册");
			$("#LoginButton2").text("登录");
			$("#LoginButton1").unbind("click");
			$("#LoginButton1").bind("click",function(event){
				$("#Name").val("");
	            $("#Password").val("");
				LoginRegister.Register();
			});
			LoginRegister.initLoginRegister();
			$("#LoginButton2").unbind("click");
			$("#LoginButton2").bind("click",function(event){
				LoginRegister._checkLoginRegisterInfo();
			});
	},
	"Register" :function(){
		      LoginRegister.PageType="Register";
			  $("#LoginTitle").html("注册");
			  $("#LoginButton1").text("重填");
			  $("#LoginButton2").text("注册");
			  $("#LoginButton1").unbind("click");
			  $("#LoginButton1").bind("click",function(event){
						$("#Name").val("");
						$("#Password").val("");
				});
				$("#LoginButton2").unbind("click");
				$("#LoginButton2").bind("click",function(event){
					LoginRegister._checkLoginRegisterInfo();
				});
	},
	"_checkLoginRegisterInfo" : function(){
		var name=$("#Name").val();
		var password = $("#Password").val();
		if(name && password){
			if(LoginRegister.PageType=="Login"){
					Model.Consumers.LOGINUSER.LOGINNAME = name;
					Model.Consumers.LOGINUSER.PASSWORD = password;
					Controller.Login();
			}else {
			     	Model.Consumers.REGISTERUSER.REGISTERNAME = name;
					Model.Consumers.REGISTERUSER.PASSWORD = password;
					Controller.Register();
			}
		}else if(!name){
			navigator.notification.alert("请输入用户名！",function(){},"系统提示","确定");
			return;
		}if(!password){
			navigator.notification.alert("请输入密码！",function(){},"系统提示","确定");
			return;
		}
	}
}