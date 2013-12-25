var Service=(function(window){
	var resource="http://www.polyvi.net:5542/FlightServer/getInfo.do";
	var timeout = 1000 * 60;
	var ajax;
	
	var ACTIONS = {
		CHECK_QUERY_FLIGTH:"CHECK_QUERY_FLIGTH",//机票查询接口
		CHECK_LOGIN:"CHECK_LOGIN",//登录接口
		CHECK_REGISTER:"CHECK_REGISTER",//注册接口
		CHECK_ORDER:"CHECK_ORDER",//提交订单
		CHECK_RECORDSTAFF:"CHECK_RECORDSTAFF"//提交乘机人
	};	
	
	function Ajax (data,success,error,hasLoading){
		ajax = $.ajax({
			type:"POST",
			url:resource,
			data:data,
			timeout:timeout,
			dataType : "json",
			contentType:"application/json",
		    success : function (rs) {
                if(hasLoading) Loading.hiden();
                if(!rs) {
                    error({status:null});
                    return;
                }
                if(typeof success == "function")success(rs);
            },
            error : function (e) {
                if(hasLoading) Loading.hiden();
                if(typeof error == "function")error(e);
            }
		});
	}
	
	function json2String(obj){
		var isArray = obj instanceof Array;
		var r = [];
		for(var i in obj){
			var value = obj[i];
			if(typeof value == 'string'){
				value = "'" + value + "'";
			}else if(value != null && typeof value == 'object'){
				value = json2String(value);
			}
			r.push((isArray?'':"'"+i+"'"+':')+value);
		}
		return isArray ? '['+r.join(',')+']' : '{'+r.join(',')+'}';
   }
	
	function Service() {
        /**
         * 提交查询请求
         */
        this.postQueryAction = function(actionName, flight, success, error, hasLoading) {
            var data = {
                ACTION_NAME : actionName,
                ACTION_INFO : {
                   fromcity : flight.FROMCITY,
                   tocity : flight.TOCITY,
				   fromdata : flight.FROMDATA,
                }
            };
			 hasLoading = (typeof hasLoading == "boolean") ? hasLoading : true;
            if(hasLoading) Loading.show("数据加载中...");
            Ajax(json2String(data), success, error, hasLoading);
        };
		/**
         * 提交登录请求
         */
        this.postLoginAction = function(actionName, User, success, error, hasLoading) {
            var data = {
                ACTION_NAME : actionName,
                ACTION_INFO : {
                   loginname : User.LOGINNAME,
                   password : User.PASSWORD,
                }
            };
			 hasLoading = (typeof hasLoading == "boolean") ? hasLoading : true;
            if(hasLoading) Loading.show("登录中...");
            Ajax(json2String(data), success, error, hasLoading);
        };
		/**
         * 提交注册请求
         */
        this.postRegisterAction = function(actionName, NewUser, success, error, hasLoading) {
            var data = {
                ACTION_NAME : actionName,
                ACTION_INFO : {
                   registername : NewUser.REGISTERNAME,
                   password : NewUser.PASSWORD,
                }
            };
			 hasLoading = (typeof hasLoading == "boolean") ? hasLoading : true;
            if(hasLoading) Loading.show("注册中...");
            Ajax(json2String(data), success, error, hasLoading);
        };
		/**
         * 提交订单请求
         */
        this.postOrderAction = function(actionName, Order, success, error, hasLoading) {
            var data = {
                ACTION_NAME : actionName,
                ACTION_INFO : {
                   orderid : Order.ORDERID,
                   flightid : Order.FLIGHTID,
		           amount : Order.AMOUNT,
				   orderpeople :Order.ORDERPEOPLE,
				   orderphone : Order.ORDERPHONE,
				   ordernum : Order.ORDERNUM,
				   username : Order.USERNAME
                }
            };
			 hasLoading = (typeof hasLoading == "boolean") ? hasLoading : true;
             if(hasLoading) Loading.show("正在提交订单...");
            Ajax(json2String(data), success, error, hasLoading);
        };
		/**
         * 提交乘机人请求
         */
        this.postPassengerAction = function(actionName, Passenger, success, error, hasLoading) {
            var data = {
                ACTION_NAME : actionName,
                ACTION_INFO : {
                   orderpeople : Passenger.ORDERPEOPLE,
                   idcardno : Passenger.IDCARDNO,
		           orderphone : Passenger.ORDERPHONE,
				   orderid :Passenger.ORDERID,
				   flightid:Passenger.FLIGHTID,
                }
            };
			 hasLoading = (typeof hasLoading == "boolean") ? hasLoading : true;
             if(hasLoading) Loading.show("正在提交乘机人...");
            Ajax(json2String(data), success, error, hasLoading);
        };
        /**
         * 取消请求
         */
        this.abort = function(){
            ajax.abort();
        }
    }
	
	Service.prototype ={
		//机票查询
		Query:function(data,success,error){
			this.postQueryAction(ACTIONS.CHECK_QUERY_FLIGTH,data, success, error);
		},
		//用户登录
		Login:function(data,success,error){
			this.postLoginAction(ACTIONS.CHECK_LOGIN,data, success, error);
		},
		//用户注册
		Register:function(data,success,error){
			this.postRegisterAction(ACTIONS.CHECK_REGISTER,data, success, error);
		},
		//提交订单
		SubmitOrder:function(data,success,error){
			this.postOrderAction(ACTIONS.CHECK_ORDER,data, success, error);
		},
		//提交乘机人
		SubmitPassenger:function(data,success,error){
			this.postPassengerAction(ACTIONS.CHECK_RECORDSTAFF,data, success, error);
		},
	}
	return new Service();
})(this);

window.Loading = (function(){
	function Waiting(){
		var loading = $("<div>").addClass("MASK");
        var content = $("<div>").addClass("LOADING");
        var img = $("<div>").addClass("LOADING_IMG");
        var text = $("<div>").addClass("LOADING_CONTENT");
		content.append(img).append(text);
        loading.append(content);  
		var visible = false;
	    this.__defineGetter__("isVisible",function(){
            return visible;
        });
        this.show = function(msg){
            text.html(msg);
            $("body").append(loading);
            visible = true;
        };
        this.hiden = function(){
            text.html("");
            loading.remove();
            visible = false;
        }
	}
      return new Waiting();
})();