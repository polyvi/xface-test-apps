function ApplicationManager(){
    var _this = this;
    _this.installedNativeAppList = [];
    _this.installedAMSAppList = [];
    _this.clientUpdateInfo = null;

    _this.getInstalledAMSAppList = function(success,error){
        xFace.AMS.listInstalledApplications(function(apps){
            _this.installedAMSAppList.length = 0;
            (apps || []).forEach(function(app){
                var temp = $.applyObject(new Application(),app, $.POMAP["AMSApp"]);
                temp.isAMSAPP = true;
                _this.installedAMSAppList.push(temp);
            });
            if(success)success.call(_this,_this.installedAMSAppList);
        },error);
    };

    _this.getInstalledNativeAppList = function(success,error){
        navigator.app.queryInstalledNativeApp("1", function(apps){
            _this.installedNativeAppList.length = 0;
            apps.forEach(function(app){
                var temp = $.applyObject(new Application(),app, $.POMAP["nativeApp"]);
                temp.icon = "data:image/png;base64,"+temp.icon;
                temp.isAMSAPP = false;
                _this.installedNativeAppList.push(temp);
            });
            if(success)success.call(_this,_this.installedNativeAppList);
        },error);
    };

    _this.installApp = function(path,success,error){
        var evt = $.Event("appInstalled");
        if(/.apk$/.test(path)){
            navigator.app.install(path,function(){
                _this.trigger(evt);
                if(success)success.call(_this,app);
            },error);
        }else{
            xFace.AMS.installApplication(path,function(app){
                _this.getInstalledAMSApp(app.appid,function(app){
                    if(!app)return;
                    evt.app = app;
                    _this.trigger(evt);
                    if(success)success.call(_this,app);
                });
            },error);
        }
    };

    _this.uninstallApp = function(app,success,error){
        if(app.isAMSAPP){
            xFace.AMS.uninstallApplication(app.appCode,function(data){
                _this.installedAMSAppList.remove(_getIndex(_this.installedAMSAppList,app.appCode));
                onSuccess(data);
            },error);
        }else{
            navigator.app.uninstallNativeApp(app.appCode,function(data){
                _this.installedNativeAppList.remove(_getIndex(_this.installedNativeAppList,app.appCode));
                onSuccess(data);
            },error);
        }
        function _getIndex(arr,code){
            for(var i=0;i<arr.length;i++){
                if(arr[i].appCode == code)return i;
            }
            return -1;
        }
        function onSuccess(data){
            var evt = $.Event("appUninstalled");
            evt.app = app;
            _this.trigger(evt);
            if(success)success.call(_this,data);
        }
    };

    _this.updateAMSApp = function(path,success,error){
        xFace.AMS.updateApplication(path,function(app){
            _this.getInstalledAMSApp(app.appid,function(newApp){
                if(success)success.call(_this,newApp);
            },function(){
                if(success)success.call(_this,app);
            });
        },error);
    };

    _this.isInstalled = function(app){
        var list = app.isAMSAPP?_this.installedAMSAppList:_this.installedNativeAppList;
        for(var i=0;i<list.length;i++){
            if(list[i].appCode === app.appCode)return true;
        }
        return false;
    };

    _this.getInstalledAMSApp = function(appid,success,error){
        _this.getInstalledAMSAppList(function(apps){
            var findApp = null;
            for(var i=0;i<apps.length;i++){
                if(apps[i].id == appid){
                    findApp = apps[i];
                    break;
                }
            }
            if(success)success.call(_this,findApp);
        },error);
    };

    _this.getClassify = function(success,error){
        service.get("/classify",function(data){
            var rs = [];
            data.forEach(function(item){
                rs.push($.applyObject(new Classify(),item, $.POMAP["classify"]));
            });
            if(success)success.call(_this,rs);
        },error);
    };

    _this.getRemoteApps = function(param,success,error){
        service.get("/apps",{
            LABEL:param.label,
            ORDER_BY:param.orderBy,
            PAGE_INDEX:param.pageIndex,
            PAGE_SIZE:param.pageSize
        },function(data){
            var page = new Page();
            page.pageIndex = data["PAGE_INDEX"];
            page.pageSize = data["PAGE_SIZE"];
            page.totalPage = data["TOTAL_PAGE"];
            var apps = data["APPS"];
            apps.forEach(function(app){
                page.add($.applyObject(new RemoteApplication(),app, $.POMAP["remoteApp"]));
            });
            if(success)success.call(_this,page);
        },error);
    };

    _this.getRandomAppsOnline = function(size,success,error){
        service.post("/randomApps",{size:size},function(apps){
            var rs = [];
            (apps || []).forEach(function(app){
                rs.push($.applyObject(new RemoteApplication(),app,$.POMAP["remoteApp"]));
            });
            if(success)success.call(_this,rs);
        },error);
    };

    _this.searchAppOnline = function(keyword,success,error){
        service.post("/apps/search",{
            "KEYWORD":keyword
        },function(apps){
            var rs = [];
            apps.forEach(function(app){
                rs.push($.applyObject(new RemoteApplication(),app,$.POMAP["remoteApp"]));
            });
            if(success)success.call(_this,rs);
        },error)
    };

    _this.checkAppUpdate = function(apps,success,error){
        var param = [];
        apps.forEach(function(app){
            param.push({id:app.id,version:app.version});
        });
        service.post("/apps/checkUpdate",param,success,error);
    };

    _this.checkClientUpdate = function(success,error){
        service.get("/client/"+device.productVersion+"/checkUpdate",{
            "VERSION":device.productVersion,
            "PLATFORM":device.platform,
            "DEVICE_VERSION":device.version
        },function(data){
            if(data["HAS_UPDATE"])_this.clientUpdateInfo = data;
            if(success)success.call(_this,data);
        },error);
    };
}