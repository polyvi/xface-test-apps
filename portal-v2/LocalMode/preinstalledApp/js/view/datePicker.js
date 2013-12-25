	var DateObj = {
		year:"",
		month:"",
		date:"",
		week:""
	};
	
	var ResultDate = {
		year:"",
		month:"",
		date:"",
		week:""
	}
	
	var Calendar = {
		/*初始化日历*/
		init:function(){
			var _date = new Date();
			DateObj.year = _date.getFullYear();
			DateObj.month = _date.getMonth()+1;
			DateObj.date = _date.getDate();
			DateObj.week = _date.getDay();
			Calendar.update();		
		},
		 /*更新日历*/
		update:function(){
			var target = $("#dateContent");
			var weeks = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
			var Monthes = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
			var DATECOL = 7;
			var DATEROW = 6;
			var firstDay ;
			var days ="";
			var MonthDateNum = getMonthDateNum(DateObj.month,DateObj.year);
				
			for(var  i=0,x=1;i<DATEROW;i++){
				var row="";
				for(var j=0;j<DATECOL;j++){
					
					if(i==0&&j<firstDay){
						row+="<td></td>"
					}else if(i==0&&j>=firstDay&&x<=MonthDateNum){
						
						if(DateObj.year == (new Date()).getFullYear() && DateObj.month == ((new Date()).getMonth()+1) && x==(new Date()).getDate()){
							
							row=row+"<td class='text' class='Focus'>"+x+"</td>";
						}else{
							
							row=row+"<td class='text'>"+x+"</td>";
						}
				     	x++;
					}else if(i>0&&x<=MonthDateNum){
						if(DateObj.year == (new Date()).getFullYear() && DateObj.month == ((new Date()).getMonth()+1) && x==(new Date()).getDate()){			
							row=row+"<td class='text Focus'>"+x+"</td>";
						}else{
							row=row+"<td class='text'>"+x+"</td>";
						}
				     	x++;
					}else if(i>0&&x>MonthDateNum){
						row+="<td></td>"
					}
					
				}
				days+="<tr>"+row+"</tr>";
			}
			
			var html ="<table cellpadding='0' cellspacing='0'><tr><td id='prev' class='tdLeftRadius'><img src='img/prev.png' id='prevImg'/></td><td colspan='5' class='titleFont'>"+DateObj.year+"年"+Monthes[DateObj.month-1]+"</td><td id='next' class='tdrightRadius'><img src='img/next.png' id='nextImg'/></td></tr><tr><td class='titleFont'>SUN</td><td class='titleFont'>MON</td><td class='titleFont'>TUE</td><td class='titleFont'>WED</td><td class='titleFont'>THU</td><td class='titleFont'>FRI</td><td class='titleFont'>SAT</td></tr>"+days+"</table>";
			target.html(html);
			
			/**
			*获取每个月的天数，和开始第一天是星期几
			*/
			function getMonthDateNum(_month,_year){
				var _newDate = new Date(_year,_month - 1,1);
				firstDay = _newDate.getDay();
		        var _time1 = _newDate.getTime();
		
				if(_month < 12){
					_newDate.setMonth(_month);
				}else{
					_newDate.setMonth(0);
					_newDate.setYear(_year + 1);
				}
				var _time2 = _newDate.getTime();
				
				return ((_time2 - _time1) / 1000 / 60 / 60 / 24);		
			}
			/**
			*前一个月
			*/
			function prevMonth(){
				if(DateObj.month>1){
					 DateObj.month= DateObj.month-1;
				}else{
					 DateObj.month = 12,
					DateObj.year = DateObj.year-1
				}
			}
			
			function nextMonth(){
				if(DateObj.month<12){
				  DateObj.month= DateObj.month+1;
				}else{
					DateObj.month=1;
					DateObj.year = DateObj.year+1;
				}
			
			}
			function _formatMonthAndDay(data){
				data = "" + data;	
					if(data.length == 1){
						data = "0" + data;	
					}
			   return data;
			}
			
			$("#prev").unbind("click");
			$("#prev").bind("click",function(){
				prevMonth();
				Calendar.update();
			});
			$("#next").unbind("click");
			$("#next").bind("click",function(){
				nextMonth();
				Calendar.update();
			});	
			$("td.text").unbind("click");
			$("td.text").bind("click",function(){
				var date =  $(this).text();
				var resultDate = new Date (DateObj.year,DateObj.month-1,date);
				ResultDate.year = DateObj.year;
				ResultDate.month = DateObj.month;
				ResultDate.date = date;
				ResultDate.week = resultDate.getDay();
		        if(PagePanel=="Query"){
					Controller.selectDate(ResultDate);
				}else if(PagePanel=="FlightInfo"){
					var date = ResultDate.year+"-"+_formatMonthAndDay(ResultDate.month)+"-"+_formatMonthAndDay(ResultDate.date)
					Controller.reSelectDate(date);
				}
			})	
		},
	}
	