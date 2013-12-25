var PagePanel ="Query";
var Controller={
	"PanelId" :"",
	//初始化页面的一些事件
	"initFunction" : function(){
		QueryPage.initQueryPgae();
		LoginRegister.initLoginRegister();
		FillAirOrderPage.initFillAirOrderPage();
		AddPassengerPage.initAddPassengerPage();
	},
	//显示日历
	"showDate" : function(){
		 Calendar.init();
		 $.ui.loadContent("#Calendar");
	},
	//显示日历
	"reShowDate" : function(){
		 Calendar.init();
		 $.ui.loadContent("#Calendar");
	},
	//设置选中的日历
	"selectDate" : function(selectDate){
		 QueryPage.setSelectDate(selectDate)
		 $.ui.loadContent("#Query",false,true,"slide");
		 $.ui.history = $.ui.history.slice(0,1);
	},
	//重新选择日期查询
	"reSelectDate" : function(LeaveDate){
		Model.Flights.saveReQueryDate(LeaveDate);
		Model.Flights.searchFlights();
	},
	//重新查询航班
	"reQuery" : function(){
		QueryPage.clearQueryHistory();
		$.ui.loadContent("#Query",false,true,"slide");
		$.ui.history = $.ui.history.slice(0,1);
		
	},
	//查询航班信息
	"searchFlight": function(){
		Model.Flights.searchFlights();
	},
	//显示航班信息
	"showFlightInfo" : function(flightInfo){
		if($.ui.history.length==0){
			$.ui.loadContent("#FlightInfo");
		}else{
			$.ui.loadContent("#FlightInfo",false,true,"slide");
		}
		$.ui.history = $.ui.history.slice(0,1);
		FlightInfoPage.showFlightInfo(flightInfo);
	},
	//填写机票订单
	"fillAirOrder": function(index){
		FillAirOrderPage.setAirFlightInfo(Model.Flights.FLIGHTINFO[index]);
		if(Controller.PanelId=="LoginRegister"){
			$.ui.loadContent("#FillAirOrder",false,true,"slide");
		}else{
			$.ui.loadContent("#FillAirOrder");
		}
	},
	//提交乘机人
	"submitPassenger" : function(passenger){
		Model.Consumers.submitPassenger(passenger);
	},
	//显示增加的乘机人
	"showPassenger" : function(passenger){
		FillAirOrderPage.setPassenger(passenger);
		$.ui.loadContent("#FillAirOrder",false,true,"slide");
		$.ui.history = $.ui.history.slice(0,2);
	},
	//提交订单
	"submitOrder" : function(){
		Model.Order.submitOrder();
	},
	//进入登陆或注册页面
	"LgionRegisterUser" :function(){	
		$.ui.loadContent("#LoginRegister");
		LoginRegister.PageType="Login";
		LoginRegister.Login();
		
	},
	//重新登录
	"reLogin" : function(){
		LoginRegister.PageType="Login";
		LoginRegister.Login();
	},
	//登录
	"Login" : function(){
		Model.Consumers.Login();
	},
	//注册
	"Register" : function(){
		Model.Consumers.Register();
	},
	"exit" : function(){
		 if(Loading && Loading.isVisible){
             //loading界面阻塞中
			  Loading.hiden();
			  Service.abort();
			 return;
		}
		/*if(PagePanel =="Query") {
			$.ui.clearHistory();
		}*/
		if($.ui.history.length>0){
		     $.ui.goBack();
		 }else{
			 navigator.notification.confirm("确认退出本应用？",function(button){
					if(button==1){
						xFace.app.close();
						/* navigator.app.exitApp();*/
					}
			},"提示","确定,取消");	
		 }
	}
}  



document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady(){
	 Controller.initFunction();
	 document.addEventListener('backbutton',function(){
       Controller.exit();
	 },false);
}


