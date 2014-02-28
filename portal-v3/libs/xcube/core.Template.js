function Template(_){
	
	this.get = function(selector, param,sync){
		var item = this.child(selector).clone(true).attachData(param,sync);
        item.getter("resData",function(){return param});
        var images;
        if(item.tagName == "IMG")images = item;
        else images = item.child("img");
        if(images)images.bind("error load",function(e){
            var evt = $.Event("imageStatusChange");
            evt.status = e.type;
            evt.img = e.currentTarget;
            document.trigger(evt);
        });
        return item;
	}
}