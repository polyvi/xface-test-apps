var FlightInfoPage= {
	 "selectIndex" : "",
	 "showFlightInfo" :function(FlightInfo){ 

		 PagePanel="FlightInfo";
		 $("#FlightFromdate").html(Model.Flights.SEARCHFLIGHT.FROMDATA);
		 $("ul[id='FlightList']").empty();
		 for(var i=0; i<FlightInfo.length;i++){
			 var li = $("<li>").attr("id",i).addClass("flightListLi");
		     $("ul[id='FlightList']").append(li);
			 var pHeader = $("<p>").addClass("pheader").html(FlightInfo[i].flightcompany+"  "+FlightInfo[i].flightid+"  "+FlightInfo[i].flightcode);
			 var pFormInfo = $("<p>").addClass("infoP").html("<span>"+FlightInfo[i].fromtime+"起飞</span><span>"+FlightInfo[i].fromairport+"</span><span class='price'>&yen;"+FlightInfo[i].adultprice+"</span><span class='orderBtn' id="+i+"_order>订购</span>");
			 var pToInfo = $("<p>").addClass("infoP").html("<span>"+FlightInfo[i].arriveltime+"到达</span><span>"+FlightInfo[i].toairport+"</span><span class='price'>1折</span>"+"<span>0位好友购买</span>");
			 li.append(pHeader).append(pFormInfo).append(pToInfo);
			 $("#"+i+"_order").bind("click",function(event){
				 event.preventDefault();
				 var index = $(this).parent().parent().attr("id");
				 FlightInfoPage.selectIndex = index;
				 Model.Order.ORDER.ORDERID = _setOrderId();
				 if(!Model.Consumers.HASLOGIN){
					  navigator.notification.alert("请先登录！",function(){ Controller.LgionRegisterUser();},"系统提示","确定");
				 }else{
					 Controller.PanelId="FlightInfo";
					 Controller.fillAirOrder(FlightInfoPage.selectIndex);
				 }
			 });
		 }
		 
		 function _setOrderId(){
			 //生成订单号
			var data=new Date();
			var orderid="F"+data.getFullYear()+(data.getMonth()+1)+data.getDate()+data.getHours()+data.getMinutes()+data.getSeconds()+data.getMinutes();
			return orderid;	 
		 }
	 },
}