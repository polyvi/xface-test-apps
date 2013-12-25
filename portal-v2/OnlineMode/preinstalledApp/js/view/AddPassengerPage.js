var AddPassengerPage = {
	"initAddPassengerPage" : function(){
		$("#Refill").bind("click",function(event){
			event.preventDefault();
			$("#RealName").val("");
			$("#IdNum").val("");
			$("#PhoneNum").val("");
		});
		$("#submitAddPassengr").bind("click",function(event){
			event.preventDefault();
			AddPassengerPage._checkFillInfo();
		});
	},
	"_checkFillInfo" : function(){
	    var patrn_tel = /^1[3|4|5|8][0-9]\d{4,8}$/;//手机
		var passenger = {
			"ORDERPEOPLE":"",//乘机人姓名
			"IDCARDNO":"",//乘机人身份证号
			"ORDERPHONE":"",//乘机人电话号码
			"ORDERID" : "",//订单号
			"FLIGHTID" : ""//航班号
		};
		passenger.ORDERPEOPLE = $("#RealName").val();
		passenger.IDCARDNO = $("#IdNum").val();
		passenger.ORDERPHONE = $("#PhoneNum").val();
		passenger.ORDERID =  Model.Order.ORDER.ORDERID;//从填写订单页面出来的订单号
		passenger.FLIGHTID = Model.Order.ORDER.FLIGHTID;
		
		if(passenger.ORDERPEOPLE && passenger.IDCARDNO && passenger.ORDERPHONE){
								if(patrn_tel.test(passenger.ORDERPHONE)&&AddPassengerPage._checkIdNum(passenger.IDCARDNO)){
									Controller.submitPassenger(passenger);
									$("#RealName").val("");
			                        $("#IdNum").val("");
			                        $("#PhoneNum").val("");
								}else if(!AddPassengerPage._checkIdNum(passenger.IDCARDNO)){
									$("#IdNum").val("");
									navigator.notification.alert("请输入正确的身份证号码!",function(){},"系统提示","确定");
								}else if(!patrn_tel.test(passenger.ORDERPHONE)){
									$('#PhoneNum').val("");
									navigator.notification.alert("请输入正确的手机号码!",function(){},"系统提示","确定");
								}				
		}else{
			navigator.notification.alert("信息填充不完整！",function(){},"系统提示","确定");
		}
	},
	"_checkIdNum" :function(idNum){
		var re = /^[0-9x]{15,18}$/i;
		if(!re.test(idNum)){
			return false;
		}
		if(15==idNum.length || 18 == idNum.length){
			var realLen = 0;
			if(18==idNum.length)realLen = 2;
			var year = parseInt(idNum.substr(6,2+realLen),10);
			var month = getNum(idNum.substr(8+realLen,2));
			var day = parseInt(idNum.substr(10+realLen,2),10);
			if(4==year.length)
			if(year<1900 || year > 2050)return false;
			if(month<1 || month > 12)return false;
			if(day<1 || day > 31)return false;
			return true;
		}
		function getNum(str){
			var re = /^[0]*([0-9]*)$/;
			str.match(re);
			return parseInt(RegExp.$1,10);
		}
	}
};