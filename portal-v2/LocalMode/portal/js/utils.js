
function $(id){
	var dom = document.getElementById(id);

    dom.show = function(){
        this.style.display = "block";
    };

    dom.hide = function(){
        this.style.display = "none";
    };

    return dom;
}

function $parseJson(str){
   	try{
		eval('var obj='+str);
		return obj;
	}catch(e){
		return null;
	}
}


function $toJsonString(obj){
	var isArray = obj instanceof Array;
	var r = [];
	for(var i in obj){
		var value = obj[i];
		if(typeof value == 'string'){
			value = "'" + value + "'";
		}else if(value != null && typeof value == 'object'){
			value = $toJsonString(value);
		}
		r.push((isArray?'':"'"+i+"'"+':')+value);
	}
	return isArray ? '['+r.join(',')+']' : '{'+r.join(',')+'}';
}

function XConfirm(msg,ok,cancel,title,buttons,callback){
    if (!title)title = "提示";
    if (!buttons)buttons = "确定,取消";
    if(!callback)callback = function(index){
        if(index == 1){
            ok();
        }else{
            cancel();
        }
    };
    if(typeof ok != "function")ok = function(){};
    if(typeof cancel != "function")cancel = function(){};
    navigator.notification.confirm(msg,callback,title,buttons);
}

function XAlert(msg,callback,title,buttons){
    if (!title) title = "提示";
    if (!buttons)buttons = "确定";
    if(typeof callback != "function")callback = function(){};
    navigator.notification.alert(msg,callback,title,buttons);
}