function XAudio(src){
    var _this = $(this);
    var media = new Media(src, null, function(){
        _this.trigger($.Event("error"));
    }, function(state){});

    _this.seek = function(milliseconds){
        if(!xmesh.model["Setting"].sound)return;
        media.seekTo(milliseconds);
    };

    _this.play = function(){
        if(!xmesh.model["Setting"].sound)return;
        media.play();
    };

    _this.stop = function(){
        if(!xmesh.model["Setting"].sound)return;
        media.stop();
    }
}

document.bind("deviceready",function(){
    XAudio.SOUNDS = {
        DELETED:new XAudio("audio/deleted.mp3"),
        SHAKE:new XAudio("audio/shake.mp3"),
        SUCCESS:new XAudio("audio/success.mp3")
    };
});