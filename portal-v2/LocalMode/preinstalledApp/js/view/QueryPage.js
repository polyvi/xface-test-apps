var QueryPage = {
	"initQueryPgae" : function(){
		$("#date").bind("click",function(event){	
			event.preventDefault();
			Controller.showDate();
		});
		$("#QueryFlight").bind("click",function(event){
			event.preventDefault();
			if(QueryPage._checkFlightInfo()) {
				Model.Flights.SEARCHFLIGHT.FROMCITY = $("#airFromCity").val();
			    Model.Flights.SEARCHFLIGHT.TOCITY =  $("#airToCity").val();
			    Model.Flights.SEARCHFLIGHT.FROMDATA = $("#date").text();
				Controller.searchFlight();
		     }
		});
	},
	"setSelectDate" : function(selectDate){
		$("#date").text(selectDate.year+"-"+QueryPage._formatMonthAndDay(selectDate.month)+"-"+QueryPage._formatMonthAndDay(selectDate.date));
	},
	//重新查询，清除上一次的查询条件
	"clearQueryHistory": function(){
		PagePanel="Query";
		$("#airFromCity").val("出发城市");
		$("#airFromCity_jqmobiSelect").html("出发城市");//将选中的出发城市显示为“出发城市” jqmobi自动添加的id
		$("#airToCity").val("目的城市");
		$("#airToCity_jqmobiSelect").html("目的城市")//将选中的目的城市显示为“目的城市”  jqmobi自动添加的id
		$("#date").text("2012-09-03");
	},
	"_formatMonthAndDay" : function(data){
		data = "" + data;	
			if(data.length == 1){
				data = "0" + data;	
			}
	   return data;
	},
	"_checkFlightInfo" : function(){
        var fromCity = $("#airFromCity").val();
		var toCity =$("#airToCity").val();
		var leaveDate = $("#date").text()
		var nowdate  = new Date();	
		var sysDate= nowdate.getFullYear()+"-"+QueryPage._formatMonthAndDay((nowdate.getMonth()+1))+'-'+QueryPage._formatMonthAndDay(nowdate.getDate());
		var systemDate = Date.parse(sysDate); 
		var userDate = Date.parse(leaveDate);
		if(fromCity=="出发城市"){
			navigator.notification.alert("请选择出发城市！",function(){},"系统提示","确定");
			return false;
			
		}else if(toCity=="目的城市"){
			navigator.notification.alert("请选择目的城市！",function(){},"系统提示","确定");
			return false;
			
		}else if(fromCity == toCity){
			navigator.notification.alert("出发城市和到达城市不能相同，请重新选择！",function(){},"系统提示","确定");
			return false;
			
		}else if(!leaveDate){	
			navigator.notification.alert("请选择航班日期！",function(){},"系统提示","确定");
			return false;	
		}
		/*else if(systemDate>userDate){
			navigator.notification.alert("出发时间不能小于当前系统时间！",function(){},"系统提示","确定");
			return false;
			
		}*/
		return true;
	}
};