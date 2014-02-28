var service =(function(){
    function Service(){
        var _this = this;
//        _this.hostUrl = "http://192.168.2.130/jswsp/apps/xportal/mock";
        _this.hostUrl = "http://192.168.2.16:8080/Xportal/rest";
        _this.timeout = 20000;
        _this.busynessMessage = null;
        _this.busynessDialog = null;
        _this.xmlHttpRequest = null;
        _this.abort = function(){
            if(_this.xmlHttpRequest)_this.xmlHttpRequest.abort();
        };

        _this.get = function(){
            ajax(arguments,"GET");
        };

        _this.post = function(){
            ajax(arguments,"POST");
        };

        _this.put = function(){
            ajax(arguments,"PUT");
        };

        _this.del = function(){
            ajax(arguments,"DELETE");
        };

        function ajax(args,method){
            var isForceAbort = false;
            var options = {};
            var param = [];
            for(var i=0;i<args.length;i++)param.push(args[i]);
            if(typeof param[1] == "function"){
                var temp = param.splice(0,1);
                temp.push(null);
                param = temp.concat(param);
            }
            var url = param[0],data = param[1],success = param[2],
                failure = param[3],always;
            if(param.length>4){
                if(typeof param[4] == "function"){
                    always = param[4];
                    if(param[5] && typeof param[5] == "object")options = param[5];
                }else{
                    if(param[4] && typeof param[4] == "object")options = param[4];
                }
            }
            if(data && method!="GET" && typeof data == "object")data = $.toJson(data);

            _this.xmlHttpRequest = Zepto.ajax({
//                url:_this.hostUrl+url + '.json',
                url:_this.hostUrl+url,
                type:method,
                dataType:"json",
                data: data,
                timeout: options.timeout || _this.timeout,
                contentType: 'application/json',
                global:false,
                cache:typeof options.cache == "boolean"?options.cache:true,
                complete:always,
                headers:{"platform":_$.os.ios?"ios":"android"},
                success:function(){
                    destroyDialog();
                    if(success)success.apply(this,arguments);
                },
                beforeSend:function(xhr){
                    _this.xmlHttpRequest = xhr;
                    if(_this.busynessMessage){
                        _this.busynessDialog = Dialog.progressDialog.show(_this.busynessMessage).bind("close",_abort,false);
                    }
                },
                error: function(xhr,type){
                    destroyDialog();
                    var error = new Error();
                    error.code = xhr.status;
                    error.type = type;
                    switch (type){
                        case "error":error.message = "通信失败,错误码:"+ error.code;
                            break;
                        case "timeout":error.message = "网络连接超时";
                            break;
                        case "abort":if(isForceAbort)error.message = null;
                            else error.message = "服务连接中断,错误码:"+(isNaN(error.code)?-1:error.code);
                            break;
                        default :error.message = "服务不可用,错误码:"+(isNaN(error.code)?-1:error.code);
                    }
                    if(failure)failure.call(this,error);
                    var evt = $.Event("serviceerror");
                    evt.error = error;
                    document.trigger(evt);
                }
            });

            function destroyDialog(){
                if(_this.busynessDialog)_this.busynessDialog.unbind("close",_abort,false).close();
                _this.busynessDialog = null;
                _this.busynessMessage = null;
            }
            function _abort(){
                isForceAbort = true;
                if(_this.busynessDialog)_this.busynessDialog.unbind("close",_abort,false);
                if(_this.xmlHttpRequest)_this.xmlHttpRequest.abort();
                _this.busynessDialog = null;
                _this.busynessMessage = null;
            }
        }
    }
    return new Service();
})();