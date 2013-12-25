var Model={};
//航班信息管理
Model.Flights={
	//查询航班信息的条件
	"SEARCHFLIGHT" : {
		"FROMCITY":"",
		"TOCITY":"",
		"FROMDATA":"",
	},
	//查询所得的航班信息
	"FLIGHTINFO" : [],
	"saveReQueryDate" : function(date){
		Model.Flights.SEARCHFLIGHT.FROMDATA = date;
	},
	"searchFlights" : function(){
		/*联网获取机票查询数据*/
		  Service.Query(Model.Flights.SEARCHFLIGHT,function success(data){
			   if(data[0].ACTION_RETURN_CODE==0){ 
					var  _inquiryFlight = data[0].ACTION_INFO.FLIGTHS;
					if(!_inquiryFlight){
					   navigator.notification.alert("没有航班数据，请重新查询！",function(){},"系统提示","确定");
					}else{
						Model.Flights.FLIGHTINFO = _inquiryFlight;
					    Controller.showFlightInfo(_inquiryFlight);
					}
				}else{
					navigator.notification.alert(data[0].ACTION_RETURN_MESSAGE,function(){},"系统提示","确定");
				}
		   },function error(){
			   navigator.notification.alert("联网失败！",function(){},"系统提示","确定");
		   });
	   /* 模拟数据*/
		  /* var  _inquiryFlight = FlightData[0].ACTION_INFO.FLIGTHS;
		   Model.Flights.FLIGHTINFO = _inquiryFlight;
		   Controller.showFlightInfo(_inquiryFlight); */
	}
};
//乘机人，联系人,登录用户管理
Model.Consumers={
	"HASLOGIN" : false,
	"LOGINUSER" : {
		"LOGINNAME":"",
		"PASSWORD":"",
	},
	"REGISTERUSER" : {
		"REGISTERNAME":"",
		"PASSWORD":"",
	},
	"PSSENGER" :[],
	"Login" : function(){
		Service.Login(Model.Consumers.LOGINUSER,function success(data){
			 if(data[0].ACTION_RETURN_CODE==0){
				     Model.Consumers.HASLOGIN=true;
                     navigator.notification.alert("登录成功！",function() {Controller.PanelId="LoginRegister"; Controller.fillAirOrder(FlightInfoPage.selectIndex);},"系统提示","确定");
					
			 }else{
				   Model.Consumers.HASLOGIN=false;
				   navigator.notification.alert(data[0].ACTION_RETURN_MESSAGE,function(){Controller.reLogin();},"系统提示","确定");
			 }
		},function error(){
			Model.Consumers.HASLOGIN=false;
			 navigator.notification.alert("联网失败！",function(){},"系统提示","确定");
		});
	},
	"Register" : function(){
		Service.Register(Model.Consumers.REGISTERUSER,function success(data){
			if(data[0].ACTION_RETURN_CODE==0){
				   navigator.notification.alert("注册成功,请登录后订购!",function(){Controller.reLogin(); },"系统提示","确定");		   
			}else{
				 navigator.notification.alert(data[0].ACTION_RETURN_MESSAGE,function(){},"系统提示","确定");
			}
		},function error(){
			navigator.notification.alert("联网失败！",function(){},"系统提示","确定");
		});
	},
	"submitPassenger" : function(passenger){
		/*联网提交乘机人*/
		Service.SubmitPassenger(passenger,function success(data){
			 if(data[0].ACTION_RETURN_CODE==0){
                     navigator.notification.alert("添加成功！",function(){ Model.Consumers.PSSENGER.push(passenger);  Controller.showPassenger(passenger); },"系统提示","确定");
					
			 }else{
					navigator.notification.alert(data[0].ACTION_RETURN_MESSAGE,function(){},"系统提示","确定");
			 }
		},function error(){
			 navigator.notification.alert("联网失败！",function(){},"系统提示","确定");
		});
	},
}
//订单管理
Model.Order ={
	"ONCENUM" : "",
	"ORDER" : {
		 "ORDERID" : "",//订单号
         "FLIGHTID" : "",//航班号
		 "AMOUNT" : "",//订单总金额
		 "ORDERPEOPLE" : "",//订票联系人姓名
	     "ORDERPHONE" : "",//订票联系人电话
		 "ORDERNUM" : "",//订票总张数
		 "USERNAME" : ""//登录的用户名
	},
	"submitOrder" : function(){
		/*联网提交订单*/
		if(Model.Order.ONCENUM == Model.Order.ORDER.ORDERID){
			 navigator.notification.alert("订单已提交，请避免重复提交！",function(){},"系统提示","确定");
		}else{

			Service.SubmitOrder(Model.Order.ORDER,function success(data){
				 if(data[0].ACTION_RETURN_CODE==0){
					     Model.Order.ONCENUM = Model.Order.ORDER.ORDERID;
						 navigator.notification.alert("订单提交成功！",function(){},"系统提示","确定");
				 }else{
						navigator.notification.alert(data[0].ACTION_RETURN_MESSAGE,function(){},"系统提示","确定");
				 }
			},function error(){
				 navigator.notification.alert("联网失败！",function(){},"系统提示","确定");
			});
		}
	}
}