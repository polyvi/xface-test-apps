
/**
* EventDispatcher可以为任意对象添加事件处理能力，不可被实例化
* -------------------------------------------
* var a = {};
* EventDispatcher.call(a);
*/
function EventDispatcher(){
	if(this instanceof EventDispatcher) throw new Error('EventDispatcher can not be instantiated!');
	if(this.EVENT_MAP) return;
	this.EVENT_MAP = {};
	this.addEventListener = EventDispatcher.ACHIEVE.attachEvent;
	this.removeEventListener = EventDispatcher.ACHIEVE.detachEvent;
	this.hasEventListener = EventDispatcher.ACHIEVE.hasEventListener;
	this.dispatchEvent = EventDispatcher.ACHIEVE.handleOnEvent;
}


EventDispatcher.ACHIEVE = {

	attachEvent : function(type, callback){
		var _type = type;
		if(_type=='' || !callback instanceof Function) return;
		if(this.hasEventListener(type, callback)) return;
		if(!this.EVENT_MAP[_type]){
			this.EVENT_MAP[_type] = [];
			this['on'+_type] = this.dispatchEvent;
		}
		this.EVENT_MAP[_type].push(callback);
	},



	detachEvent : function(type, callback){
		var _type = type;

		if(!callback){
			if(!this.EVENT_MAP[_type]) return;
			this.EVENT_MAP[_type] = null;
			this['on'+_type] = function(){};
			return;
		}

		if(_type=='' || !callback instanceof Function) return;
		if(!this.EVENT_MAP[_type]) return;
		var listeners = this.EVENT_MAP[_type];
		for(var i=0; i<listeners.length; i++){
			if(listeners[i]==callback){
				listeners.splice(i, 1);
				break;
			}
		}
		if(listeners.length==0){
			this.EVENT_MAP[_type] = null;
			this['on'+_type] = function(){};
		}
	},



	hasEventListener : function(type, callback){
		var _type = type;
		if(_type=='' || !callback instanceof Function) return false;
		var listeners = this.EVENT_MAP[_type];
		if(listeners){
			for(var i=0; i<listeners.length; i++)
				if(listeners[i] == callback) return true;
		}
		return false;
	},



	handleOnEvent : function(event){
		if(!event) return;
		var eventType = event.type;
		var listeners = this.EVENT_MAP[eventType];
		if(!listeners) return;
		if(!event.target) event.target = this;
		for(var i=0; i<listeners.length; i++){
			var callback = listeners[i];
			callback.call(this, event);
		}
	}
};


function Event(type, srcEvent){
	if(type instanceof String) throw new Error('Event :: Argument error!');

	this.target = null;
	var _type = type;
	Object.defineProperty(this, 'type', {get:function(){return _type;}});
	Object.defineProperty(this, 'currentTarget', {get:function(){return (srcEvent&&srcEvent.currentTarget)?srcEvent.currentTarget:this.target;}});

	this.preventDefault = function(){
		if(srcEvent)srcEvent.preventDefault();
	}

	this.stopPropagation = function(){
		if(srcEvent)srcEvent.stopPropagation();
	}

	if(srcEvent)
		for(var i in srcEvent) this[i] = srcEvent[i];
};

Event.ON_CLICK = 'click';




//########################################################################
//
//	下载部分
//
//########################################################################

/**
* 用于管理全局的下载任务
* 为可视UI
*/
function TaskQueue(){

	var _this = document.createElement('div');

	var _queue = [];

	_this.addTask = function(url){
		if(_hasTask(url)) return;
		var task = new DownloadTask(url);
		try{
			showToolTip('新增下载任务：<br/>'+url);
			task.start();
			task.queue = _this;
			task.index = _queue.length;
			_this.appendChild(task);
			_queue.push(task);
		}catch(e){
			showToolTip('无法下载:'+url+'<br/>['+e.message+']');
		}
	}

	_this.removeTaskByIndex = function(index){
		var target = _queue[index];
		if(target) _this.removeChild(target);
		_queue.splice(index, 1);
		_updateTask();
	}

	function _updateTask(){
		for(var i=0; i<_queue.length; i++)
			_queue[i].index = i;
	}

	function _hasTask(url){
		for(var i=0; i<_queue.length; i++)
			if(_queue[i].url==url) return true;
		return false;
	}

	return _this;
}



/**
* 用于实例化一个下载任务
* 为可视UI（含进度显示等）
*/
function DownloadTask(url){

	if(!url) throw new Error(arguments.callee.name+': URL Error');

	var fileTransfer;
	var _this = document.createElement('div');
	Object.defineProperty(this, 'url', {get:function(){return url;}});

	(function(){
		_this.className = 'downloadTask';

		var title = document.createElement('div');
		title.innerHTML = url;
		_this.appendChild(title);

		var progressBar = new ProgressBar();
		_this.appendChild(progressBar);
	})();

	_this.start = function(){
		var seg = String(url).split('/');
		var entryPath = "";
		window.requestFileSystem(LocalFileSystem.APPWORKSPACE, 0,
			function(fileSystem) {
				entryPath = fileSystem.root.toURL();
				fileTransfer = new FileTransfer();
				fileTransfer.download(
					url, entryPath + seg.pop(),
					_handleOnSuccess, _handleOnFailure
				);

				function _handleOnSuccess(entry){
					showToolTip("下载成功,开始安装...");
					_this.queue.removeTaskByIndex(_this.index);
					install(entry.toURL());
				}

				function _handleOnFailure(errCode){
					var msg;
					switch(errCode.code){
						case FileTransferError.FILE_NOT_FOUND_ERR:
							msg = '未找到文件';
							break;
						case FileTransferError.INVALID_URL_ERR:
							msg = '无效的URL';
							break;
						case FileTransferError.CONNECTION_ERR:
							msg = '网络错误';
							break;
						default:
							msg = '错误码('+errCode.code+')';
							break;
					}
					showToolTip('下载失败:'+msg);
					_this.queue.removeTaskByIndex(_this.index);
				}
			}, function(fileSystem) {
				showToolTip("请求文件系统失败...");
			});
	}

	return _this;
}




//########################################################################
//
//	安装/卸载/更新/读取
//
//########################################################################

var INSTALL_PROGRESS_INTERVAL = 20;

function install(path){

	xPortal.install(path, success, failure, statusChange);
	xPortal.dispatchEvent(new Event(xPortal.ON_INSTALL));

	function success(info){
		showToolTip('安装成功！');
		var evt = new Event(xPortal.ON_INSTALL);
		evt.appID = info.appid;
		xPortal.dispatchEvent(evt);
	};

	function failure(info){
		showToolTip('安装失败！错误码('+info.errorcode+')');
		xPortal.dispatchEvent(new Event(xPortal.ON_INSTALL_ERROR));
	};

	function statusChange(info){
		var evt = new Event(xPortal.ON_INSTALL_PROGRESS);
		evt.progress = info.progress;
		xPortal.dispatchEvent(evt);
		delay(INSTALL_PROGRESS_INTERVAL);
	};
}

function uninstall(appID){

	xPortal.uninstall(appID, success, failure);

	function success(){showToolTip('卸载成功！');}

	function failure(){
		showToolTip('卸载失败！');
		xPortal.dispatchEvent(new Event(xPortal.ON_UNINSTALL_ERROR));
	}
}




/**
* 设置管理器
*/

function Preference(defaultSettings){

	if(Preference.instance) return Preference.instance;
	Preference.instance = this;

	if(!defaultSettings) throw new Error(arguments.callee.name + ': 需要默认配置文件！');
	var _storage = window.localStorage ? window.localStorage : null;
	var _orignalData;
	var _settings;
	if(_storage){
		_orignalData = _storage.getItem(Preference.KEY);
	}else{
		alert('无法读取配置文件，系统将使用默认设置！');
	}
	_settings = _orignalData ? parseJson(_orignalData) : defaultSettings;

	this.save = function(){
		_storage.setItem(Preference.KEY, toJsonString(_settings));
	}

	this.get = function(key){
		return _settings[key];
	}

	this.set = function(key, value){
		_settings[key] = value;
	}

}

Preference.KEY = 'XPORTAL_PREFERENCE';





/**
* 导航管理器
*/

function XNavigator(){

	if(XNavigator.instance) return XNavigator.instance;
	XNavigator.instance = this;

	var _stack = [];

	this.push = function(forwardFunction){
		if(!forwardFunction) throw new Error('导航堆栈需要设置合法的回调函数！');
		_stack.push(forwardFunction);
	}

	this.back = function(){
		var callback = _stack.pop();
		if(callback){
			callback();
		}else{
			navigator.app.exitApp();
		}
	}
}


//########################################################################
//
//	公共部分
//
//########################################################################

/**
* 用于实例化一个应用程序
* xPortal中每一个APP都将以该实例的形式存在
* -------------------------------------------
* var a = new Application(id);
* a.run();
*/

function Application(id, isData){
	if(!id) throw new Error(arguments.callee.name+': Required initial ID');
	var _data = isData?id:_fetchAppData(id);

	Object.defineProperty(this, 'appID', {get:function(){return _data['appid']}});
	Object.defineProperty(this, 'name', {get:function(){return _data['name']}});
	Object.defineProperty(this, 'icon', {get:function(){return _data['icon']}});
	Object.defineProperty(this, 'version', {get:function(){return _data['version']}});

	this.uninstall = function(success, failure){
		xPortal.uninstall(this.appID, success, failure);
	}

	this.run = function(){
		xPortal.run(this.appID);
	}

	this.close = function(){
		xPortal.killActiveApp();
	}

	function _fetchAppData(id){
		for(var i=0; i<LOCAL_APP_LIST.length; i++){
			var item = LOCAL_APP_LIST[i];
			if(item['appid']==id) return item;
		}
		throw new Error('Application: AppID error');
	}
}



/**
* 简易进度条
* -------------------------------------------
* var a = new ProgressBar();
* a.percent = 0.5;
*/

function ProgressBar(){
	var _this = document.createElement('div');
	_this.className = 'progressBar';

	Object.defineProperty(_this, 'percent', {set:_setPercent});
	function _setPercent(per){
		if(isNaN(per)) throw new Error('ProgressBar: argument error');
		var p = Math.max(0, Math.min(1,per));
		_this.style['background-size'] = 100*per+'% 100%';
	}

	return _this;
}



function parseJson(str){
    try{
		eval('var obj='+new String(str));
		return obj;
	}catch(e){
		return null;
	}
}


function toJsonString(obj){
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


function delay(numberMillis){
	var now = new Date();
	var exitTime = now.getTime()+numberMillis;
	while(true){
		now = new Date();
		if(now.getTime() > exitTime) break;
	}
}


/**
* --------------------------------------------------
*    负责派发所有全局事件，并为应用提供增删改的能力
* --------------------------------------------------
*/

var xPortal = {

	install: function(packagePath, success, fail, statusChanged){
		xFace.AMS.installApplication(packagePath, function(arg){
			xPortal.dispatchEvent(new Event(xPortal.ON_INSTALL));
			success(arg);
		}, fail, statusChanged);
	},


	uninstall: function(appId, success, fail){
		xFace.AMS.uninstallApplication(appId, function(arg){
			xPortal.dispatchEvent(new Event(xPortal.ON_UNINSTALL));
			success(arg);
		}, fail);
	},


	run: function(appId){
        if(('ios' === XP_RES.OS) && ('xFaceAcceptParams' === appId))
        {
            xFace.AMS.startApplication(appId, 'Admin;123');
        }
        else
        {
            xFace.AMS.startApplication(appId);
        }
	},


	killActiveApp: function(){
		xFace.AMS.closeApplication();
	},


	/**
	 * 获取已安装应用列表 返回值为json数组，包含应用的icon，名字，id
	   形如:[{"appid":"...", "name":"...","icon":"..." ,"version":"..."},...]
	 */
	getAppList: function(success, failure){
		xFace.AMS.listInstalledApplications(success, failure);
	},


	update: function(ackagePath, success, fail, statusChanged){
		xFace.AMS.updateApplication(ackagePath, success, fail, statusChanged);
	},


	relaunch: function(){
		xFace.AMS.reset();
	}
}

EventDispatcher.call(xPortal);
xPortal.ON_INSTALL = 'install';
xPortal.ON_UNINSTALL = 'uninstall';
xPortal.ON_INSTALL_ERROR = 'installerror';
xPortal.ON_UNINSTALL_ERROR = 'uninstallerror';
xPortal.ON_DOWNLOAD_START = 'downloadstart';
xPortal.ON_DOWNLOAD_FINISH = 'downloadfinish';
xPortal.ON_DOWNLOAD_ERROR = 'downloaderror';

