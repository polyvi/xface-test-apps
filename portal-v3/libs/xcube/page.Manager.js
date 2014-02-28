
function Manager(_){
	
	var _this = this;
	var _pageCache = {};
	var _activePage;
	var _param = {};
	var _pageBox = new DisorderFlipBox().appendTo(_this);
	_param.invokeScript = getParam('invokeScript', false);
	_param.onloadPage = getParam('onloadPage', null);
	_param.onloadError = getParam('onloadError', null);
	_param.defaultPage = getParam('defaultPage', null);
	_param.useCache = getParam('cache', true);
	_param.defaultPageCallback = getParam('defaultPageCallback', null);
	_param.sync = getParam('sync', false);
	
	var _CONST = {
		MOVE_FROM_LEFT:1,
		MOVE_FROM_RIGHT:2,
		MOVE_NONE:3 
	};

//    _this.param = _param;
//    if(!window.PageManager){
//        window.PageManager = {DIRECTION:_CONST,frames:[]};
//        window.pageManager.getter("")
//    }
//    frames.push(_this);
	
	/////////////////////////////////////////////////////////
	//	Initialize
	/////////////////////////////////////////////////////////
	
	_this.css({
		display:'block',
		overflow:'hidden',
		height:'100%'
	});
	
	/////////////////////////////////////////////////////////
	//	Public: propertys
	/////////////////////////////////////////////////////////
	
	_this.getter('activePage', function(){return _activePage;});
	_this.getter('MOVE_FROM_LEFT', function(){return _CONST.MOVE_FROM_LEFT;});
	_this.getter('MOVE_FROM_RIGHT', function(){return _CONST.MOVE_FROM_RIGHT;});
	_this.getter('MOVE_NONE', function(){return _CONST.MOVE_NONE;});
	
	/////////////////////////////////////////////////////////
	//	Public: method
	/////////////////////////////////////////////////////////
	
	_this.open = function(url, initFun, param, direction, noAnimation){
			if(url.tagName){
				handleOnGetPage(url, direction, noAnimation);
			}else if(_param.useCache&&_pageCache[url]){
				handleOnGetPageHTML(url, _pageCache[url], initFun, param, direction, noAnimation);
			}else{
				var _url = url;
				_.get(_url, {
					type:'text',
					sync:_param.sync,
					success:function(data){
						handleOnGetPageHTML(url, data, initFun, param, direction, noAnimation);
					}, 
					error:function(code){handleOnLoadError(url);}
				});
			}
			return _this;
	};
	
	_this.registerSystemEvent = function(srcElement, eventType, useCapture){
		srcElement.bind(eventType, throwEvent2ActivePage, !!useCapture);
		return _this;
	}

    _this.unRegisterSystemEvent = function(srcElement, eventType, useCapture){
        srcElement.unbind(eventType, throwEvent2ActivePage, !!useCapture);
		return _this;
    }
	
	/////////////////////////////////////////////////////////
	//	Private: method
	/////////////////////////////////////////////////////////
	
	function throwEvent2ActivePage(evt){
		if(!_this.activePage || _locked) return;
		var event = _.Event(evt.type, evt.bubbles, evt.cancelabel);
		_.merge(event, evt);
		_this.activePage.trigger(event);
	}
	
	function handleOnGetPageHTML(url, html, initFun, param, direction, noAnimation){
		handleOnGetPage(new Page(url, html, initFun, param), direction, noAnimation);
	}
	
	function handleOnGetPage(page, direction, noAnimation){
		page.show(direction, noAnimation);
		var evt = _.Event('loadpage');
		evt.data = page;
		evt.title = page.title;
		_this.trigger(evt);
		if(_param.onloadPage) _param.onloadPage.call(_this, evt);
	}
	
	function handleOnLoadError(url){
		var evt = _.Event('error');
		evt.data = url;
		_this.trigger(evt);
		if(_param.onloadError) _param.onloadError.call(_this, evt);
	}
	
	/////////////////////////////////////////////////////////
	//	InnerClass: Page
	/////////////////////////////////////////////////////////
	
	function Page(url, html, initFun, param){
		if(_param.useCache) _pageCache[url] = html;
		var _bodyHTML = fetchBodyHTML(html);
		var _newURL = url.replace(/\/(?![^?]*\/)([\w\W]+)/, '');
		var _xFields = [];
		var _page = _.Element('div').css('height', '100%');
		_page.innerHTML = fetchCssfromHead(html)+_bodyHTML;
		_page.param = param;
		_page.bind('DOMNodeInsertedIntoDocument', parseXTag);
		
		fixAnchors(_page.child('a[href]'));
		attachModelFields(_page.child('*[x-field]'));
		syncTitle(html);

		if(_param.invokeScript) setTimeout(function(){invokeScript(html)},0)
		
		_page.getter('url', function(){return url;});
		
		_page.show = function(direction, noAnimation){
			if(_page.parentNode==_this || _activePage==_page) return;
            if(_activePage)_activePage.trigger($.Event("hide"));
			_activePage = _page;
			_pageBox.open(_page, direction, noAnimation);
			var evt = _.Event('show');
			_page.trigger(evt);
			if(initFun) initFun.call(_page, evt);
			return _page;
		}
		
		_page.close = function(){
			dettachModelFields(_xFields);
			setTimeout(function(){_page.term();}, 1000);
			return _page;
		}
		
		_page.term = function(){
			_page.html('');
			if(_page.parentNode) _page.parentNode.removeChild(_page);
		}
		
		function parseXTag(){
			_.parseXTag(_page);
			_page.unbind('DOMNodeInsertedIntoDocument', parseXTag);
			_page.trigger($.Event('pageReady'));
		}
		
		function attachModelFields(fields){
			if(!fields) return;
			if(fields instanceof NodeList){
				$.each(fields, function(index, value){fixXField(value);});
			}else{
				fixXField(fields);
			}
		}
		
		function dettachModelFields(fields){
			while(fields.length>0){
				fields.pop().trigger($.Event('term'));
			}
		}
		
		function syncTitle(html){
			var title = _page.title = String(html.match(/<title>[\w\W]*<\/title>/i)).replace(/<title>|<\/title>/gi, '');
			var titleElement = _page.child('*[x-page=title]');
			if(titleElement) titleElement.html(title);
		}
		
		function fixXField(field){
			_xFields.push(field);
			var evt = $.Event('xfield');
			evt.name = field.attribute('x-field');
			evt.element = field;
			evt.page = _page;
			_this.trigger(evt);
		}
		
		function fixAnchors(anchors){
			if(anchors){
				if(anchors.length){
					for(var i=0; i<anchors.length; i++)
						makeupAnchor(anchors[i]);
				}else{
					makeupAnchor(anchors);
				}
			}
			
			function makeupAnchor(a){
				var href = a.attribute('href');
				if(href=='#'||href.indexOf('javascript:')==0) return;
				a.bind('click', function(evt){
					if(href.indexOf('#xcube:')==0){
						var evt = _.Event('xanchor');
						evt.data = href.replace(/(^#xcube:)|(-[\S]*$)/g, '');
						evt.param = String(href.match(/-[\S]*/g)).replace('-', '').split('-');
						_this.trigger(evt);
					}else{
						_this.open(href);
					}
				}).attribute('href', '#');
			}
		}
		
		function fetchBodyHTML(html){
			var body = html.match(/<body[^>]*?>[\W\w]*<\/body>/i);
			if(!body) throw new Error('Can not find body element @ ' + url);
			return body[0];
		}
		
		function fetchCssfromHead(html){
			var css = '';
			html.replace(/<head[^>]*?>[\W\w]*<\/head>/gi, function(head){
				head.replace(/<link[^>]+((rel=\"stylesheet\")|(type=\"text\/css\")){1,}[^>]+\/>|<style[^>]*?>[\W\w]*<\/style>/gi, function(item){
					css+=item.replace(/<link[^>]+href=\"/gi, function(str){return str+_newURL+'/';});
				});
			});

			return css;
		}
		
		function invokeScript(html){
			var result = [];
			var ajaxCount = 0;
			html.replace(/<script.*?>((.*?)||([\w\W]*))<\/script>/gi, function(script){
				var link = script.match(/src=['|"][^>]*['|"]/i);
				if(link){
					var src = link[0].replace(/src="|"/gi, '');
					loadExternalScript(_newURL+'/'+src, result);
					result.push('');
				}else{
					result.push(script.replace(/(<((script|script[^>]+)|\/script)>)/gi, ''));
				}
			});

			invokeIfReady();
			
			function mappingHandlersFromAttribute(node){
				if(!node.childNodes||node.childNodes.length==0) return;
				_.each(node.childNodes, function(i, item){
					if(item.nodeType!=1) return;
					_.each(item.attributes, function(j, att){
						if(att.name.match(/^on[\w]/)){
							item.bind(att.name.replace(/^on/, ''), function(event){eval(att.value);})
							.attribute(att.name, null);
						}
					});
					mappingHandlersFromAttribute(item);
				});
			}
			
			function invokeIfReady(){
				if(ajaxCount==0){
                    try{
                        var fun = eval('(function constructor(){'+result.join(';')+';('+mappingHandlersFromAttribute.toString()+')(this);})');
                        _page.runtime = fun.call(_page);
                    }catch (e){
                        throw e;
                    }finally{
                        _this.trigger(_.Event('ready'));
                        _page.trigger(_.Event('ready'));
                    }
				}
			}
			
			function loadExternalScript(url, queue){
				var index = queue.length;
				ajaxCount++;
				_.get(url, {
					dataType:'text',
					success:function(data){
						queue[index] = data;
					},
					always:function(){
						ajaxCount--;
						invokeIfReady();
					}
				});			
			}
		}
		
		return _page;
	}
	
	if(_param.defaultPage)
		_this.open(_param.defaultPage, _param.defaultPageCallback, null, _CONST.MOVE_NONE);
	
	
	
	/*
	###################################################################
	
		DisorderFlipBox
	
	###################################################################
	*/
    var _locked = false;
    _this.getter("locked",function(){return _locked});

	function DisorderFlipBox(){
		var _easeDuration = 0.3;
		var _this = _.Element('div').css('height', '100%');
		var _slider = _.Element('div')
								.css({position:'relative', height:'100%'})
								.appendTo(_this);
		var _pos = 0;
		var _lastPage, _currentPage;
        var _container;
		
		_this.open = function(page, direction, noAnimation){
			if(_locked) return;
			
			_container = _.Element('div').css({
                width:"100%",
                height:"100%",
                position:'absolute'
			}).appendTo(_slider);
			
			_lastPage = _currentPage;
			_currentPage = _container;

			var fromLeft = false;
            var _property = _.browserCore+'transform';
            if(direction !== _CONST.MOVE_NONE)_slider.defineCssAnimation(_property, noAnimation?0:_easeDuration, 'ease-out');
            _container.appendChild(page);
			switch(direction){
				case _CONST.MOVE_NONE:
					if(_lastPage&&_lastPage.parentNode) _lastPage.parentNode.removeChild(_lastPage);
                    _slider.css(_property, '');
                    _container.css({'left':_pos = 0});
					return;
				case _CONST.MOVE_FROM_LEFT:
					fromLeft = true;
                    _pos = -_this.clientWidth;
                    _slider.css(_property, 'translate3d('+(-_pos)+'px,0,0)');
                    _container.css({'left':_pos+"px"});
					break;
				case _CONST.MOVE_FROM_RIGHT:
                default:
                    _pos = _this.clientWidth;
                    _slider.css(_property, 'translate3d('+(-_pos)+'px,0,0)');
                    _container.css({'left':_pos+"px"});
					break;
			}
            lockInteractive(_property);
		}

		function lockInteractive(_property){
			var events = 'touchstart touchmove click';
			_locked = true;
			_this.bind(events, cancelEventFlow);
			setTimeout(function(){
                if(_lastPage && _lastPage.parentNode==_slider) _slider.removeChild(_lastPage);
                _locked=false;
                _this.unbind(events, cancelEventFlow);
                _slider.defineCssAnimation('transform', 0, '').css(_property, '');
                _container.css({'left':0});
            }, _easeDuration*1000);
		}
		
		function cancelEventFlow(evt){
			evt.stopPropagation();
			evt.preventDefault();
		}
		
		return _this;
	}
}