var FillAirOrderPage ={
	"initFillAirOrderPage" :function(){
		$("#addPassengerBtn").bind("click",function(event){
			 event.preventDefault();
			 $.ui.loadContent("#AddPassenger");
		 });
		 $("#submitOrder").bind("click",function(event){
			 event.preventDefault();
			 FillAirOrderPage._checkContactPssengerInfo();
		 });
	},
	"setAirFlightInfo" :function(SelectFlight){
		$("li[id='PassengerList']").empty();
		Model.Consumers.PSSENGER = [];
		$("#amount").html("0");
		$('#bookName').val("");
	    $("#bookPhone").val("");
		Model.Order.ORDER.FLIGHTID = SelectFlight.flightid;
		$("#company").html(SelectFlight.flightcompany+SelectFlight.flightid);
		$("#fromdata").html(SelectFlight.fromdata);
		$("#fromCity").html(SelectFlight.fromcity);
		$("#toCity").html(SelectFlight.tocity);
		$("#ftime").html(SelectFlight.fromtime+"起飞");
		$("#totime").html(SelectFlight.arriveltime+"到达");
		$("#fromport").html(SelectFlight.fromairport);
		$("#toport").html(SelectFlight.toairport);
		$("#price").html(SelectFlight.adultprice);
		 var totalPrice = parseFloat(SelectFlight.adultprice)+parseFloat($("#fule").html());
		$("#total").html(totalPrice);
	},
	"setPassenger" :function(passenger){
		var pfPassenger = $("<p>");
		$("li[id='PassengerList']").append(pfPassenger);
		pfPassenger.html("姓名:"+passenger.ORDERPEOPLE+"<br>电话:"+passenger.ORDERPHONE+ "<br>身份证号: "+passenger.IDCARDNO);
		var totalAmout = parseFloat($("#total").html())*Model.Consumers.PSSENGER.length;
		$("#amount").html(totalAmout);
	},
	"_fillOrderInfo" :function(){
		 Model.Order.ORDER.AMOUNT = $("#amount").html();//订单总金额
		 Model.Order.ORDER.ORDERPEOPLE = $('#bookName').val(),//订票联系人姓名
	     Model.Order.ORDER.ORDERPHONE = $("#bookPhone").val(),//订票联系人电话
		 Model.Order.ORDER.ORDERNUM = Model.Consumers.PSSENGER.length,//订票总张数
		 Model.Order.ORDER.USERNAME =Model.Consumers.LOGINUSER.LOGINNAME;//登录的用户名
	},
	"_checkContactPssengerInfo" : function(){
	    var patrn_tel = /^1[3|4|5|8][0-9]\d{4,8}$/;//手机
	    var bookName  = $('#bookName').val();
	    var bookPhone = $("#bookPhone").val();
		
		if(Model.Consumers.PSSENGER.length==0){
			/*console.log("请添加乘机人！");*/
			navigator.notification.alert("请添加乘机人！",function(){},"系统提示","确定");
		}else if(bookName && bookPhone){
								if(patrn_tel.test(bookPhone)){
								    FillAirOrderPage._fillOrderInfo();
									Controller.submitOrder();
								}else if(!patrn_tel.test(bookPhone)){
									$('#bookPhone').val("");
									navigator.notification.alert("请输入正确的手机号码!",function(){},"系统提示","确定");
										}				
				}else{
								navigator.notification.alert("预定人信息不完整！",function(){},"系统提示","确定");
		}
	}
}