var pageManager;
var navigatorObj = new Navigator();
var squaredObj;
var marketListObj;
var XFACEAMS;
var w,w0,w1,w2;
var installingApp = '';
var Preference;
var width = 0;
var onFirstOnload = false;


document.addEventListener('deviceready', function(){
    init();
	createSquaredItem();
	document.addEventListener('backbutton', back2LastPageLevel, false);
});

document.addEventListener("touchmove",function(e){
    var target = e.target;
    while (target.nodeType != 1) target = target.parentNode;
    if (target.tagName != 'SELECT' && target.tagName != 'INPUT' && target.tagName != 'TEXTAREA') {
        e.preventDefault();
    }
},false);

function clickFilter(){//事件过滤器，禁止连续点击。间隔为500ms
    var TIME = 500;
    var last_click_time = new Date().getTime();
    document.addEventListener("click",function(e){
        e.preventDefault();
        var click_time = e["timeStamp"];
        if (click_time && (click_time - last_click_time) < TIME) {
            if(e.stopImmediatePropagation)e.stopImmediatePropagation();
            return false;
        }
        last_click_time = click_time;
    },true);
}
clickFilter();

function back2LastPageLevel(){
    if($("mask").style["display"] == "block")return;
	navigatorObj.back();
}


function AMS(){
	XFACEAMS = new xFaceAMS();
}


function init(){ 
	AMS();
	pageManager = new PageManager($("content"));
	squaredObj = new Squared($("myWidgets"));
	marketListObj = new MarketList();
	$("tab_myWidgets").onclick = function(){pageManager.changePageById(this.id)};
	$("tab_recommend").onclick = function(){pageManager.changePageById(this.id)};
	$("tab_market").onclick = function(){pageManager.changePageById(this.id)};
	//w = new iScroll("main");	
	w0 = new iScroll("wrapper0",{hScroll:false,checkDOMChanges:true});
	w1 = new iScroll("wrapper1",{hScroll:false,vScrollbar:false,checkDOMChanges:true});
	w2 = new iScroll("wrapper2",{hScroll:false,checkDOMChanges:true});
    createMarketList(simulate_marketList);
}


function PageManager(wrapper){
	this.index = 0;
	var _this = this;
	var defaultStep = 480;
	var boundary = 100;
	var maxChildrenLen = 3;
	var startX = 0,startY = 0;
	var endX = 0,endY = 0;
	var stack = [{"id":"myWidgets","index":"0"},{"id":"recommend","index":"1"},{"id":"market","index":"2"}];
	$("tab_" + stack[0].id).className = "tabFocus tabItem";
	wrapper.style.width = defaultStep * 3 + "px";
    var content = $("content");

    content.addEventListener("touchstart",function(event){
        startX = endX = event.touches[0].pageX;
        startY = endY = event.touches[0].pageY;
    },true);
    content.addEventListener("touchmove",function(event){
        endX = event.touches[0].pageX;
        endY = event.touches[0].pageY;
        event.preventDefault();
    },true);
    content.addEventListener("touchend",function(event){
        if(Math.abs(startY - endY) > boundary)return;
        if (endX < startX && Math.abs(endX-startX) > boundary){
            _this.left();
        } else if (endX > startX && Math.abs(endX-startX) > boundary){
            _this.right();
        }
        startX = endX = 0;
    },true);

	this.left = function (index){
		if (arguments.length){
			_this.index = index;
		} else {
			_this.index++;
		}
		if (_this.index >= maxChildrenLen){
			_this.index = maxChildrenLen-1;
			return;
		}
		wrapper.style.webkitTransition = "left 0.3s ease-in-out";
		wrapper.style.left = -_this.index * defaultStep + "px";
		for (var i=0; i<stack.length; i++){
			$("tab_" + stack[i].id).className = "tabBlur tabItem";
		}
		$("tab_" + stack[_this.index].id).className = "tabFocus tabItem";

	};
	
	this.right = function (index){
		if (arguments.length){
			_this.index = index;
		} else {
			_this.index--;
		}
		if (_this.index < 0) {
			_this.index = 0;
			return;
		}
		wrapper.style.webkitTransition = "left 0.3s ease-in-out";
		wrapper.style.left = -_this.index * defaultStep + "px";
		for (var i=0; i<stack.length; i++){
			$("tab_" + stack[i].id).className = "tabBlur tabItem";
		}
		$("tab_" + stack[_this.index].id).className = "tabFocus tabItem";
	};
	this.changePageById = function(id){
		for (var i=0; i<stack.length; i++){
			if (stack[i].id == id.replace("tab_","")){
				i < _this.index ?  _this.right(i) : _this.left(i);
				break;
			}
		}
	};
}

function exit(){
    XConfirm("确定退出程序？",function(){
        xFace.app.close();
    });
}

function Navigator(){
	var stack = [];
	var _this = this;

	this.add = function (callback){
		typeof callback == 'function' ? stack.push(callback) : XAlert("invalid function!");
	};
	
	this.back = function(){
		var callback = stack.pop();
		callback ? callback() : exit();
	};
	this.home = function(){
		var callback = stack[0];
		if(callback) {
			callback();
			stack = stack[0];
		}
	}
	this.clearHistory = function(){
		stack = [];
	}
}


//九宫格
function Squared(wrapper){
	var defaultStyle_img = {"width":"100%","height":"100%","display":"block"};
	var defaultStyle_div = {};
	var defaultStyle_per = {"color":"black"};
	var parentNode = wrapper;
	
	this.add = function (iconUrl,innerText,styleOption,data,callback){
		var per = document.createElement("div");
		per.data = data;
		per.onclick = (callback instanceof Function )?callback:function(){};
		var div = document.createElement("div");
		div.className = 'installedName';
		var textNode = document.createTextNode(innerText);
		div.appendChild(textNode);
		var img = document.createElement("img");
		img.src = iconUrl;
		per.appendChild(img);
		per.appendChild(div);

		Style(img,defaultStyle_img);
		Style(per,defaultStyle_per);
		
		if (typeof styleOption == 'object'){
			for (var i in styleOption){
				per.style[i] = styleOption[i];
			}
		} else {
			per.className = styleOption;
		}
		wrapper.appendChild(per);
	}
	
	this.remove = function(wrapper){
	}
	
	this.refresh = function (){
	}
	
	this.clear = function (){
		var childen = $("myWidgets").childNodes;
		if(childen.length != 0){
			for(var i=childen.length-1; i>-1; i--){
				$("myWidgets").removeChild($("myWidgets").childNodes[i]);
			}
		}
	}
}


function createSquaredItem(){
	XFACEAMS.getInstallAppList(getInstallListSucc,getInstallListError);
	function getInstallListSucc(list){
		if(!onFirstOnload){
			if(list.length == 0){
				pageManager.changePageById('tab_recommend');
			}
			onFirstOnload = true;
		}
		
		squaredObj.clear();
		for(var i = 0; i < list.length; i++){
			squaredObj.add(list[i].icon, list[i].name, "squaredItem",list[i],handlOnStartApp);
		}
	}

	function getInstallListError(){
		alert('本地应用列表获取失败');
	}
	
	function handlOnStartApp(e){
        e.stopPropagation();
		XFACEAMS.startApp(this.data['appid']);
	}
}

function Style(obj, styleOption){
	if(typeof styleOption != "object") return;
	for (var i in styleOption) {
		obj.style[i] = styleOption[i];
	}
}


/****************** 应用市场  ************************/

function MarketList(){
	
	this.addItem = function (data,handleOnClick){
		var item = document.createElement("div");
		item.data = data;
		item.onclick = (handleOnClick instanceof Function )?handleOnClick:function(){};
		item.className = "marketItem";
		var top_left_img = document.createElement("img");
		top_left_img.src = data.icon;
		var top_left_region = document.createElement("div");
		var top_right_name = document.createElement("div");
		setInnerText(top_right_name, data.name);
		var updateImg = document.createElement("img");
		updateImg.src = "css/img/update.png";
		var top_right_intro = document.createElement("div");
		setInnerText(top_right_intro, (data.CONTENT.length > 12 ? (data.CONTENT.substring(0,12) + "...") : data.CONTENT));
		var top_right_region = document.createElement("div");
		var topRegion = document.createElement("div");
		
		
		top_left_img.className = "top_left_img";
		top_left_region.className = "top_left_region";
		top_right_name.className = "top_right_name";
		top_right_intro.className = "top_right_intro";
		top_right_region.className = "top_right_region";
		topRegion.className = "topRegion";
		
		top_left_region.appendChild(top_left_img);
		top_right_region.appendChild(top_right_name);
		top_right_region.appendChild(top_right_intro);
		topRegion.appendChild(top_left_region);
		topRegion.appendChild(top_right_region);
		
		
		var bot_left_stars = document.createElement("div");
		createStars(bot_left_stars, 4);
		var bot_left_region = document.createElement("div");
		var bot_right_status = document.createElement("div");
		item.bot_right_status = bot_right_status;

        XFACEAMS.checkAppIsInstalled(data['appid'],function(installed){
            if(installed){
                setInnerText(bot_right_status, "已安装");
                if(data['updateurl'])top_right_name.appendChild(updateImg);
            }
        },function(){});

		var bot_right_region = document.createElement("div");
		var bottomRegion = document.createElement("div");
		
		bot_left_stars.className = "bot_left_stars";
		bot_left_region.className = "bot_left_region";
		bot_right_status.className = "bot_right_status";
		bot_right_region.className = "bot_right_region";
		bottomRegion.className = "bottomRegion";
		
		bot_left_region.appendChild(bot_left_stars);
		bot_right_region.appendChild(bot_right_status);
		bottomRegion.appendChild(bot_left_region);
		bottomRegion.appendChild(bot_right_region);
		
		
		item.appendChild(topRegion);
		item.appendChild(bottomRegion);
		
		return item;
	};
	
	this.clear = function(){
		var childen = $("market").childNodes;
		if(childen && childen.length != 0){
			for(var i=childen.length-1; i>-1; i--){
				try{
					$("market").removeChild($("market").childNodes[i]);
				}catch(e){
					XAlert('clear = ' + e);
				}
				
			}
		}
	}
}


function createMarketList(data){
	marketListObj.clear();
	for (var i=0; i<data.length; i++){
		$("market").appendChild(marketListObj.addItem(data[i],openInstallAppDetail));
	}
}

var isRecommend = false;
function openInstallAppDetail(data){
	$('main').style.display = 'none';
	$('details').style.display = 'block';
    isRecommend = !this.data;
    var goBack = isRecommend ? goRecommend : goHome;
    navigatorObj.add(goBack);
    if(!isRecommend)data = this.data;
	installingApp = {
		THIS: this,
		data:data
	};
	createAMSMPage.createAppDetail(data);
	createAMSMPage.registerEvent('backBtn',function(){
        goBack();
    });
    XFACEAMS.checkAppIsInstalled(data['appid'],function(installed){
        if(installed){
            if(!isRecommend){
                if(data['updateurl']){
                    $('updateBtn').style.display = 'block';
                    $('uninstall').className = 'down';
                }else{
                    $('updateBtn').style.display = 'none';
                    $('uninstall').className = 'down_';
                }
            }
            if(isRecommend){
                $('updateBtn').style.display = 'none';
                $("startBtn").style.display = 'block';
                $('uninstall').style.display = 'none';
                $('installBtn').style.display = 'none';
                createAMSMPage.registerEvent('startBtn',startApp);
            }else{
                $("startBtn").style.display = 'none';
                $('uninstall').style.display = 'block';
                $('installBtn').style.display = 'none';
                createAMSMPage.registerEvent('updateBtn',updateApp);
                createAMSMPage.registerEvent('uninstall',uninstallApp);
            }
        }else{
            $("startBtn").style.display = 'none';
            $('updateBtn').style.display = 'none';
            $('uninstall').style.display = 'none';
            $('installBtn').style.display = 'block';
            createAMSMPage.registerEvent('installBtn',installApp);
        }
    },function(){
        XAlert("本地应用列表获取失败！");
    });
}


function installApp(){
	XFACEAMS.fileTransfer = new FileTransfer();
    $("message").innerHTML = "正在下载...";
	$('mask').show();
	XFACEAMS.downloadWidget(this.data.appurl, null, downloadSuccess, downloadFail);
}

function goHome(){
	$('main').style.display = 'block';
	$('details').style.display = 'none';
	$('mask').style.display = 'none';
	navigatorObj.clearHistory();
}

function goRecommend(){
    goHome();
    if(isRecommend)pageManager.changePageById("tab_recommend");
}

function installSuccess(info){
    $('mask').hide();
    XConfirm('安装成功，点确定进入应用,点取消返回.',function(){
        goHome();
        XFACEAMS.startApp(info['appid']);
    },goRecommend);
    createMarketList(simulate_marketList);
    createSquaredItem();
}
	
function installFailed(info){
    $('mask').hide();
	var message = '未知错误';
	switch(info.errorcode){
		case 1:
			message = '应用安装包不存在';
			break;
		case 2:
			message = '应用已经被安装';
			break;
		case 3:
			message = '解压安装包失败';
			break;
		case 4:
			message = '更新、卸载应用时，没有找到待操作的目标应用';
			break;
		case 5:
			message = '不存在应用配置文件';
			break;
		case 6:
			message = '移除应用失败';
			break;
		case 7:
			message = '未知错误';
			break;	
	}
	XAlert(message,goHome);
}

function startApp(){
    XFACEAMS.startApp(this.data['appid'],null,function(){
        XAlert("应用启动失败！");
    })
}

function uninstallApp(){
    $("message").innerHTML = "正在卸载...";
    $('mask').show();
	XFACEAMS.uninstallApp(this.data['appid'],uninstallSuccess,uninstallFail);		
}
function uninstallSuccess(){
    $('mask').hide();
    createMarketList(simulate_marketList);
    createSquaredItem();
	XAlert('卸载成功，点确定返回应用集市．',goHome);
}

function uninstallFail(){
    $('mask').hide();
	XAlert('卸载失败',goHome);
}

function updateApp(){
    $("message").innerHTML = "正在更新...";
	$('mask').show();
	XFACEAMS.updateApp(this.data,updateAppSucc,updateAppFail);

	function updateAppSucc(info){
        $('mask').hide();
        createMarketList(simulate_marketList);
        createSquaredItem();
        XConfirm('更新成功，点确定进入应用，点取消返回．',function(){
            goHome();
            XFACEAMS.startApp(info['appid']);
        },goRecommend);
	}
	
	function updateAppFail(info){
        $('mask').hide();
		var message = '未知错误';
		switch(info.errorcode){
			case 1:
				message = '应用安装包不存在';
				break;
			case 2:
				message = '应用已经被安装';
				break;
			case 3:
				message = '解压安装包失败';
				break;
			case 4:
				message = '更新、卸载应用时，没有找到待操作的目标应用';
				break;
			case 5:
				message = '不存在高于当前版本的应用安装包';
				break;
			case 6:
				message = '不存在应用配置文件';
				break;
			case 7:
				message = '移除应用失败';
				break;
			case 8:
				message = '未知错误';
				break;	
		}
		XAlert(message,goHome);
	}
}
	
function createStars(obj, activeStarsLen){
	for (var i=0; i<5; i++){
		activeStarsLen--;
		var stars = document.createElement("img");
		activeStarsLen < 0 ? (stars.src = "css/img/star_.png") : (stars.src = "css/img/star.png");
		obj.appendChild(stars);
	}
}

function setInnerText(container, txt){
	container.appendChild(document.createTextNode(String(txt)));
}
