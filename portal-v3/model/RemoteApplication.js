function RemoteApplication(){
    Application.call(this);
    var _this = this;
    _this.merchant = "";
    _this.content = "";
    _this.grade = 0;
    _this.packageUrl = "";
    _this.previewImages = [];
    _this.classify = "";
    _this.updateDate = "";

    _this.packageSize = 0;
    _this.insatlled = false;
    _this.packagePath = "";
    _this.fileName = "";

    _this.install = function(success,error){
        _this._installing = true;
        xmesh.model["ApplicationManager"].installApp(_this.packagePath,function(){
            _this._installing = false;
            if(success)success.apply(this,arguments);
        },function(){
            _this._installing = false;
            if(error)error.apply(this,arguments);
        });
    };
}