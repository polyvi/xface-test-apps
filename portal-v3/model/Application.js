function Application(){
    var _this = this;
    _this.id = "";
    _this.name = "";
    _this.icon = "";
    _this.bgColor = "";
    _this.type = "";
    _this.version = "";
    _this.appCode = "";
    _this.isAMSAPP = true;

    _this.start = function(success,error,param){
        if(_this.isAMSAPP){
            xFace.AMS.startApplication(_this.appCode, success, error, param);
        }else{
            navigator.app.startNativeApp(_this.appCode, param, success, error);
        }
    };

    _this.uninstall = function(success,error){
        xmesh.model["ApplicationManager"].uninstallApp(_this,success,error);
    };

    _this.update = function(path,success,error){
        xmesh.model["ApplicationManager"].updateAMSApp(path,function(newApp){
            $.applyObject(_this,newApp);
            if(success)success.call(_this,newApp);
        },error);
    }
}