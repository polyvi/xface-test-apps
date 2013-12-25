function xFaceAMS(){
	this.installList = [];
	this.preinstallApp = [];
	this.installedAppList = [];
	this.fileTransfer = null;
}

xFaceAMS.prototype.getWorkSpacePath = function (){};

xFaceAMS.prototype.downloadWidget = function (path, name, sucess, fail){
    if(!name) name = path.substring(path.lastIndexOf("/")+1,path.length);
    var onError = function(e) {
        console.log('[ERROR] Problem setting up root filesystem!');
        console.log(JSON.stringify(e));
    };
    var onSuccess = function(fileSystem) {
        console.log('File API Init: Setting PERSISTENT FS.');
        root = fileSystem.root;
        name = fileSystem.root.fullPath + '/' + name;
        new FileTransfer().download(path, name, sucess, fail);
    };
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onSuccess, onError);
};

function downloadSuccess(entry){
    $("message").innerHTML = "正在安装...";
    $('mask').show();
	XFACEAMS.installApp(entry.fullPath,installSuccess,installFailed);
}

function downloadFail(error){
    $('mask').hide();
	XAlert("下载失败！"+error.code);
}


xFaceAMS.prototype.getInstallAppList = function (success,fail){
    var self = this;
	xFace.AMS.listInstalledApplications(function(apps){
        self.installList = apps;
        if(typeof success == "function") success(apps);
    },fail);
};

xFaceAMS.prototype.installApp = function (appInfo,success,error){
    var url = typeof appInfo == "string"?appInfo:appInfo['appurl'];
	try{
		xFace.AMS.installApplication(url, success,error, statusChanged);
	}catch(e){
		XAlert('installApp =' + e);
	}
	
	function statusChanged(info){
		var returnInfo = info;
		var message = '';
		switch(returnInfo.progress){
			case 0:
				message = '安装初始化';
				break;
			case 1:
				message = '包处理中';
				break;
			case 2:
				message = '包处理中';
				break;
			case 3:
				message = '安装完成';
				break;
						
		}
		//if(returnInfo.progress == 0)alert(message);
	}
};

xFaceAMS.prototype.checkAppIsInstalled = function (appid, success,fail){
    xFace.AMS.listInstalledApplications(function(apps){
        for(var i=0;i<apps.length;i++){
            if(appid == apps[i].appid){
                success(true);
                return;
            }
        }
        success(false);
    },fail);
};

xFaceAMS.prototype.startApp = function (appId,success,fail){
    if(typeof success!="function")success = function(){};
    if(typeof fail!="function")fail = function(){};
    xFace.AMS.startApplication(appId,success,fail);
}

xFaceAMS.prototype.uninstallApp = function(appid,success,fail){
	xFace.AMS.uninstallApplication(appid, success, fail);
}


xFaceAMS.prototype.updateApp = function(appInfo,win,fail,statusChanged){
	var packagePath = appInfo['updateurl']?appInfo['updateurl']:'';
	this.downloadWidget(packagePath, null, downloadSucess, downloadFail);
	
	function downloadSucess(entry){
		xFace.AMS.updateApplication(entry.fullPath, win,fail, statusChanged)
	}
}



/**
 * 安装应用
 * @param {String} packagePath              应用安装包所在相对路径（相对于当前应用的工作空间）
 * @param {Function} successCallback        成功时的回调函数(安装完成后，需要会将appid通过该回调函数返回)
 * @param {Function} errorCallback          失败时的回调函数
 * @param {Function} statusChangedCallback  安装过程的状态回调函数
 */
//xFace.AMS.installApplication(packagePath, win,fail, statusChanged)

/**
 * 卸载应用
 * @param {String} appId                    用于标识待卸载应用的id
 * @param {Function} successCallback        成功时的回调函数
 * @param {Function} errorCallback          失败时的回调函数
 */
//xFace.AMS.uninstallApplication(path, win, fail)

/**
 * 启动应用
 * @param {String} appId                    用于标识待启动应用的id
 */
//xFace.AMS.startApplication(appId)

/**
 * 关闭当前应用
 */
//xFace.app.close();

/**
 * 获取已安装应用列表 返回值为json数组，包含应用的icon，名字，id
   形如:[{"appid":"...", "name":"...","icon":"..." ,"version":"..."},...]
   结果通过success返回
 */
//xFace.AMS.listInstalledApplications(success, fail)

/**
 * 更新应用
 * @param {String} packagePath              应用更新包所在相对路径（相对于当前应用的工作空间）
 * @param {Function} successCallback        成功时的回调函数
 * @param {Function} errorCallback          失败时的回调函数
 * @param {Function} statusChangedCallback  更新过程的状态回调函数
 */
//xFace.AMS.updateApplication(ackagePath, win,fail, statusChanged)

/**
 * 重启默认应用
 * 场景描述：
 * 1) 用户首先自行判断默认应用是否需要更新，如果需要更新，则下载相应的更新包
 * 2) 默认应用更新包下载成功后，调用updateApplication进行更新
 * 3) 默认应用更新成功后，调用reset接口重启默认应用
 */
//xFace.AMS.reset();
