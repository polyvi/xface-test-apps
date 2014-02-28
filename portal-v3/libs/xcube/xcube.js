/*
#########################################################################

	xCube v1.0
	Author: Songjc 
	Run @ Webkit & IE10+
	Polyvi

#########################################################################
*/


(function(){
	
	var xCube = (function(_){
		_.isXFace = /xface/gi.test(navigator.appName);
		_.isAndroid = /android/gi.test(navigator.appVersion);
		_.isIOS = /iphone|ipad/gi.test(navigator.appVersion);
		_.isIE = /MSIE/gi.test(navigator.appVersion);
		_.hasTouch = 'ontouchstart' in window;
		_.browserCore = _.isIE?'':'-webkit-';
		_.usePointerEvents = navigator.msPointerEnabled;
		
		//----------------------------------------------------------------------
		//	Private variables
		//----------------------------------------------------------------------
		
		var _xcubeLib = {};
		var _pluginLib = {};
		var _prefetchLib = {};
		var _ajaxCache = {};
		var _theme;
		
		var _PLUGIN_TAG_MAP = {};
		var _XTAG_MAP = {
			SCROLLPANE: 'ui.ScrollPane',
			PAGEMANAGER: 'page.Manager',
			PREFETCH: 'core.Prefetch',
			LIST:'ui.List',
			TILEBOX:'ui.TileBox',
			DATA:'core.Data',
			IMAGEROLLER:'ui.ImageRoller',
			CLONENODE:'ui.CloneNode',
			PARAM:'core.Param',
			TEMPLATE:'core.Template'
		}
		
		
		
		/*
		#############################################################################
			Public
		#############################################################################
		*/
		
		_.by = {
			id:function(id){return document.getElementById(id);},
			name:function(name){return filterCollection(document.getElementsByName(name));},
			tagName:function(name, ns){return filterCollection(ns?document.getElementsByTagNameNS(ns, name):document.getElementsByTagName(name))},
			className:function(name){return filterCollection(document.getElementsByClassName(name))}
		}
		
		_.plugin = function(type, constructor){
			var _constructor = constructor;
			var _type = type;
			if(typeof type=='function'){
				_type = type.name;
				_constructor = type;
			}
			_pluginLib[_type] = _constructor;
			_PLUGIN_TAG_MAP[_type.toUpperCase()] = _type;
		}
		
		_.drawFrames = function(onEnterFrame, condition, onFinished){
			if(typeof condition!='function')
				throw new Error('xCube:drawFrames needs condition Function.');
			nextFrame();
			function draw(){
				window.requestAnimationFrame(function(){
					onEnterFrame();
					nextFrame();
				});
			}
			function nextFrame(){
				if(condition())
					draw();
				else
					if(onFinished) onFinished();
			}
		}
		
		_.js = function(url){
			_.get(url, {
				sync:true,
				dataType:'javascript',
				cache:true
			});
		}
		
		_.log = function(){
			var msg = Array.prototype.join.call(arguments, ', ');
			if(window.console)
				window.console.log('xCube: '+msg);
			else
				alert('xCube:'+msg);
		}
		
		_.each = function(queue, onEachItem){
			if(isNaN(queue.length)){
				for(var i in queue){
					if(queue.hasOwnProperty(i)&&i!='_')
						if(onEachItem.call(this, i, queue[i])) break;
				}
			}else{
				for(var i=0; i<queue.length; i++)
					if(onEachItem.call(this, i, queue[i])) break;
			}
		}
		
		_.merge = function(a, b){
			if(!a||!b) return a||b||null;
			for(var i in b){
				if(b.hasOwnProperty(i))
					a[i] = b[i];
			}
			return a;
		}
		
		_.isEmptyObject = function(obj) {
			for(var name in obj ) return false;
			return true;
		}
		
		_.parseJson = function(str){
			try{
				return window.JSON.parse(str);
			}catch(e){
				_.log(e.message+'\n'+str);
				return null;
			}
		}
		
		_.toJson = function(obj){
            if("JSON" in window)return JSON.stringify(obj);
			var isArray = obj instanceof Array;
			var r = [];
			for(var i in obj){
				var value = obj[i];
                if(typeof value == "function"){
                    continue;
                }
				if(typeof value == 'string'){
					value = "'" + value + "'";
				}else if(value != null && typeof value == 'object'){
					value = arguments.callee(value);
				}
				r.push((isArray?'':"'"+i+"'"+':')+value);
			}
			return isArray ? '['+r.join(',')+']' : '{'+r.join(',')+'}';
		}

		_.prefetch = function(url, param){
			_.XElement(_XTAG_MAP.PREFETCH, param);
		}
		
		_.get = function(url, param){
			return _.Ajax(url, 'GET', param);
		}
		
		_.post = function(url, param){
			return _.Ajax(url, 'POST', param);
		}
		
		_.put = function(url, param){
			return _.Ajax(url, 'PUT', param);
		}
		
		_.del = function(url, param){
			return _.Ajax(url, 'DELETE', param);
		}
		
		_.Event = function(eventType, useCapture, cancelabel){
			var evt = document.createEvent('HTMLEvents');
			evt.initEvent(eventType, !!useCapture, !!cancelabel);
			return  evt;
		}
		
		_.Element = function(tagName){
			return document.createElement(tagName);
		}
		
		_.TextNode = function(text){
			return document.createTextNode(text);
		}
		
		_.Image = function(src, width, height){
			var img;
			if(isNaN(width))
				img = new Image();
			else if(isNaN(height))
				img = new Image(width);
			else
				img = new Image(width, height);
			img.src = src;
			return img;
		}
		
		_.XObject = function(obj){
			return XObject.call(obj||{});
		}
		
		_.XElement = function(xType, param){
			if(!xType) return null;
			return _.Element('xcube:element').as(xType, param);
		}
		
		_.Ajax = function(url, method, param){
			return new Ajax(url, method, param);	
		}
		
		_.StyleSheet = function(){
			_.Element('style').appendTo(_('head'));
			var _styleSheet = document.styleSheets[document.styleSheets.length-1];
			_styleSheet.destroy = function(){this.ownerNode.remove();}
			_styleSheet.getCssText = function(){
				var text = '';
				_.each(this.cssRules, function(i, item){
					text += item.cssText;
				});
				return text;
			};
			return _styleSheet;
		}
		
		_.loadTheme = function(url){
			_.get(url, {
				sync:true,
				dataType:'xml',
				success:function(data){
					if(_theme) _theme.destroy();
					_theme = new Theme(data);					
				},
				error:function(){_.log('Can not find theme file: '+url);}
			});
		}
		
		_.now = function(){
			return new Date().valueOf();	
		}
		
		_.expand = function(target, url){
			PluginConstructor.prototype.extend.call(_, target, url);
			return this;
		}
		
		_.XElement.expand = function(target, url){
			_.expand.call(XElement.prototype, target, url);
			return this;
		}
		
		_.trim = function(str){
			return str.replace(/(^[\s]+)|([\s]+$)/g, '');
		}

		_.parseXTag = function(node){
			xCube.each(node.childNodes, function(i, kid){
				if(kid.nodeType!=1) return;
				_.parseXTag(kid);
			});
			if(node.tagName.match(/^xtag:/i))
				convertXNode(node, node.tagName.replace(/^xtag:/i, ''));
				
			function convertXNode(node, tagName){
				var param = {};
				xCube.each(node.attributes, function(i, item){
					param[item.nodeName.toUpperCase()] = parseValue(item.nodeValue);
				});	
				var type = xCube._PLUGIN_TAG_MAP[tagName] || xCube._XTAG_MAP[tagName];
				if(!type) throw new Error('Tag not found: ' + tagName);
				node.as(type, param);
			}
			
			function parseValue(value){
				if(!value) return null;
				if(/^(true|false|[\d]{1,}|null|undefined)$/i.test(value)){
					return eval(value);
				}else if(/\w+\([\w,]*\)|\w+=[\w\d]+/.test(value)){
					return function(event){eval(value);};
				}else if(/^#/.test(value)){
					return xCube.by.id(value.replace(/^#/,''));
				}else if(/^\{[\w\W]+\}$/.test(value)){
					return eval(value.replace(/^\{|\}$/g, ''));
				}else{
					return value;
				}
			}
		}
		
		/*
		#############################################################################
			Private methods
		#############################################################################
		*/
		
		function duplicateObject(obj){
			return _.merge({}, obj);
		}
		
		function importXComponent(xcubeType){
			if(_xcubeLib[xcubeType]) return;
			importPlugin(xcubeType, _XCUBE_BASE_+xcubeType+'.js', _xcubeLib);
		}
		
		function importCustomizedPlugin(type, url){
			if(_pluginLib[type] && typeof _pluginLib[type]!='string') return;
			importPlugin(type, url, _pluginLib);
		}
		
		function importPlugin(type, url, lib){
			_.get(url, {
				sync:true,
				dataType:'text',
				cache:true,
				success:function(data){
					lib[type] = eval('(function(){'+data+';return '+type.split('.').pop()+'})()');
					if(!lib[type]) throw new Error('Can not find the plugin constructor ['+ type + '] @ file: '+ url);
				},
				error:function(code){
					throw new Error('Can not find specified plugin file: '+ url);
				}
			});
		}
		
		function makeAdvancedClosureForPluginConstructor(constructor){
			return (function(){
				var utils = 'var log=arguments[0], getParam=arguments[1];';
				eval(utils+'var c='+constructor.toString());
				return c;
			})(_.log, function(name, defaultValue){
				var param = arguments.callee.caller.arguments[1]||{};
				var fromElement = param[name.toUpperCase()];
				var fromConstructor = param[name];
				if(hasValue(fromElement)) return fromElement;
				if(hasValue(fromConstructor)) return fromConstructor;
				return defaultValue;
			});
		}
		
		function hasValue(variable){
			return variable!=undefined;
		}
		
		function PluginConstructor(){
			fetchPrototype.call(this, arguments.callee);
		}
		
		PluginConstructor.prototype.extend = function(superClass, url){
			if(url) _.plugin(superClass, url);
			var param = Array.prototype.slice.call(arguments.callee.caller.arguments, 1);
			param.unshift(superClass); // Automaticly inherit the initialized arguments for super class
			XElement.prototype.as.apply(this, param); // 'this' might be anything without method 'as'
			return this;
		}
		
		function fetchPrototype(Constructor){
			var _this = this;
			if(!(this instanceof Constructor))
				_.each(Constructor.prototype, function(i, item){_this[i] = item;});
		}
		
		function getClassNameRegExp(className){
			return  new RegExp('[\b]?'+className+'[\b]?', 'gi');
		}
		
		/*
		#############################################################################
			Theme
		#############################################################################
		*/
		function Theme(_root){
			if(!_root) return;
			var _tempLib = {};
			var _styleSheet = _.StyleSheet();
			parseNode(_root.documentElement, '');
			return _styleSheet;
			
			function parseNode(node, path){
				_.each(node.childNodes, function(index, item){
					if(item.nodeType!=1) return;
					var name = item.tagName;
					if(/^xtag:/.test(name)){
						switch(name){
							case 'xtag:temp':
								var ref = item.getAttribute('call');
								var id = item.getAttribute('id');
								if(id) _tempLib[id] = item;
								if(ref){
									var target = _tempLib[ref].cloneNode(true);
									if(target){
										var blankNode = _root.createElement('xtag:placeholder');
										while(target.childNodes.length>0) blankNode.appendChild(target.childNodes[0]);
										with(item.parentNode){
											appendChild(blankNode);
											removeChild(item);
										}
									}
								}
								return;
							case 'xtag:rule':
								name = item.getAttribute('name');
								break;
							case 'xtag:placeholder':
								name = '';
								break;
						}
					}
					var filter = item.getAttribute('filter');
					var className = (path?path+' ':'') + name.replace(':', '\\:') + (filter?filter:'');
					var rule = getNodeText(item);
					if(rule) _styleSheet.addRule(className, rule);
					parseNode(item, className);
				});
			}
			
			function getNodeText(node){
				var str = '';
				_.each(node.childNodes, function(index, item){
					if(item.nodeType==3&&!(/^[\s]+$/g.test(item.nodeValue))) str += item.nodeValue;
				});
				return str;
			}
		}
		
        /*
         #############################################################################
             XEvent
         #############################################################################
         */

        function XEvent(){
            var _this = this;
            _this.isUsedXEvent = false;
            _this.XEvent = {};

            _this.XEvent.register = function(){
                if(_this.isUsedXEvent || !_.usePointerEvents)return;
                _this.bind("mousedown",_pointerDown, false);
                _this.isUsedXEvent = true;
            };

            _this.XEvent.unRegister = function(){
                _this.unbind("mousedown",_pointerDown, false);
                _this.isUsedXEvent = false;
            };

            function _pointerDown(e){
                _this.setCapture();
                throwEvent(e);
                _this.bind("mousemove", _pointerMove, false);
                _this.bind("mouseup", _pointerEnd, false);
            }

            function _pointerMove(e){
                throwEvent(e);
            }

            function _pointerEnd(e){
                _this.releaseCapture();
                throwEvent(e);
                _this.unbind("mousemove", _pointerMove, false);
                _this.unbind("mouseup", _pointerEnd, false);
            }

            function throwEvent(event){
                var eventMap = {"mousedown":"touchstart","mousemove":"touchmove","mouseup":"touchend"};
                var touchObj = {};
                for(var k in event){touchObj[k] = event[k]};
                var eventType = eventMap[event.type];
                touchObj.type = eventType;
                var touchEvent = $.Event(eventType,true,true);
                touchEvent.touches = [touchObj];
                touchEvent.targetTouches = [touchObj];
                touchEvent.changedTouches = [touchObj];
                ['clientX', 'clientY', 'pageX', 'pageY', 'x', 'y', 'screenX', 'screenY'].forEach(function(item, index){touchObj[item] = event[item];});
                _this.trigger(touchEvent);
            }
        }

		/*
		#############################################################################
			EventDispatcher
		#############################################################################
		*/
		
		function EventDispatcher(){
			if(this.addEventListener) return;
			this._= this._||{};
			this._.EVENT_MAP = {};
			fetchPrototype.call(this, arguments.callee);
		}
		
		EventDispatcher.prototype.addEventListener = function(type, callback){
			var _type = type;
			if(_type=='' || !callback instanceof Function) return;
			if(this.hasEventListener(type, callback)) return;
			if(!this._.EVENT_MAP[_type])
				this._.EVENT_MAP[_type] = [];
			this._.EVENT_MAP[_type].push(callback);
		}
		
		EventDispatcher.prototype.removeEventListener = function(type, callback){
			var _type = type;
			if(!callback){
				if(!this._.EVENT_MAP[_type]) return;
				this._.EVENT_MAP[_type] = null;
				return;
			}
			if(_type=='' || !callback instanceof Function) return;
			if(!this._.EVENT_MAP[_type]) return;
			var listeners = this._.EVENT_MAP[_type];
			for(var i=0; i<listeners.length; i++){
				if(listeners[i]==callback){
					listeners.splice(i, 1);
					break;
				}
			}
			if(listeners.length==0)
				this._.EVENT_MAP[_type] = null;
		}
		
		EventDispatcher.prototype.hasEventListener = function(type, callback){
			var _type = type;
			if(_type==''||!callback) return false;
			var listeners = this._.EVENT_MAP[_type];
			if(listeners){
				for(var i=0; i<listeners.length; i++)
					if(listeners[i] == callback) return true;
			}
			return false;
		}
		
		EventDispatcher.prototype.dispatchEvent = function(event){
			if(!event) return;
			var eventType = event.type;
			var listeners = this._.EVENT_MAP[eventType];
			if(!listeners) return;
			if(!event.target) event.target = this;
			for(var i=0; i<listeners.length; i++){
				var needStop = listeners[i].call(this, event);
				if(needStop===false) break;
			}
		}
		
		/*
		#############################################################################
			Ajax
		#############################################################################
		*/
		
		function Ajax(url, method, param){
			
			var _timeoutClock;
			var _this = _(this);
			var _param = param||{};
			var _isAbort = false;
			
			_param.sync = _param.sync||false;
			_param.timeout = _param.timeout||60000;
			_param.success = _param.success||null;
            _param.beforeSend = _param.beforeSend || null;
            _param.error = _param.error||null;
			_param.always = _param.always||null;
			_param.headers = _param.headers||[];
			_param.dataType = _param.dataType||'text';
			_param.data = _fixData(_param.data||null);
			_param.cache = _param.cache||false;
			_param.type = method||'post';
			_param.contentType = param.contentType||(_isJsObject(_param.data)?'application/json':'application/x-www-form-urlencoded');
			_param.headers.push(['Content-Type', _param.contentType]);
			
			if((_param.cache&&_ajaxCache[url])||_prefetchLib[url]){
				_onResponse(_ajaxCache[url]||_prefetchLib[url]);
				return;
			}
		
			var _core = new XMLHttpRequest();
			_core.onreadystatechange = function(){
				switch(_core.readyState){
                    case 4:
                        clearTimeout(_timeoutClock);
                        if ((_core.status == 200||_core.status == 0)&&!_isAbort){
                            var result = _core.responseText;
                            if(_param.cache) _ajaxCache[url] = result;
                            _throwGlobalEvent(4);
                            _onResponse(result);
                        }else{
                            _throwGlobalEvent(5);
                            if(_param.error) _param.error.call(_core, {status:_core.status,
                                response:_core.responseText,type:_isAbort?"abort":"error"});
                            _isAbort = false;
                        }
                        _throwGlobalEvent(6);
                        _throwGlobalEvent(9);
                        if(_param.always) _param.always.call(_core,result,_param);
                        break;
                    default:
                        _throwGlobalEvent(_core.readyState);
                        break;
				}
			}

			XObject.prototype.redefine.call(_core, 'abort', function(){
                _isAbort = true;
				_throwGlobalEvent(7);
				_throwGlobalEvent(9);
			}, true);
			
			function _isJsObject(obj){
				if(!obj) return false;
				if(typeof obj=='string' || obj=='') return false;
				return true;
			}
			
			function _fixData(data){
				return _isJsObject(data)?_.toJson(data):data;
			}
			
			function _throwGlobalEvent(key){
				var globalEvent = ['ajaxstart', 'ajaxsend', 'ajaxload', 'ajaxparse', 'ajaxsuccess', 'ajaxerror', 'ajaxcomplete', 'ajaxabort', 'ajaxtimeout', 'ajaxstop'];
				var evt = _.Event(globalEvent[key]||key);
				evt.ajax = _core;
				_.trigger(evt);
			}
			
			function _onResponse(result){
				switch(_param.dataType){
					case 'json':
                        result = _.parseJson(result);
                        break;
					case 'javascript':
						result = eval(result);
						break;
					case 'xml':
						result = _core.responseXML;
						break;
					case 'text':
					default:
						break;
				}
				if(_param.success) _param.success.call(_core, result,_param);
			}
			
			function _watchConnection(){
				_timeoutClock = setTimeout(_checkIfConnectionOK, _param.timeout);
			}
			
			function _checkIfConnectionOK(){
				if(_core.readyState==4&&(_core.status==200||_core.status==0)) return;
				_this.trigger(_.Event('timeout'));
				_throwGlobalEvent(8);
				_this.trigger(_.Event('abort'));
				_core.abort();
				if(_param.error)_param.error.call(_core,{status:_core.status,type:"timeout"});
			}

            if(_param.beforeSend)_param.beforeSend.call(_core,_core.status,_param);
			_core.open(_param.type, url, !_param.sync);
			for(var i in _param.headers){
				var header = _param.headers[i];
				_core.setRequestHeader(header[0],header[1]);
			}
			_core.send(_param.data || null);
			_watchConnection();
			return _core;
		};
		
		/*
		#############################################################################
			XObject
		#############################################################################
		*/
		
		function XObject(){
			if(!this._) this._ = {};
			if(this._.isXObject) return this;
			this._.isXObject = true;
			EventDispatcher.call(this);
			fetchPrototype.call(this, arguments.callee);
			return this;
		}
		
		XObject.prototype.bind = function(eventType, callback, useCapture){
			if(!eventType||!callback) return;
			var eventArray = typeof eventType=='string' ? eventType.split(' ') : eventType;
			for(var i=0; i<eventArray.length; i++)
				this.addEventListener(eventArray[i], callback, !!useCapture);
			return this;
		}
		
		XObject.prototype.unbind = function(eventType, callback, useCapture){
			if(!eventType||!callback) return;
			var eventArray = typeof eventType=='string' ? eventType.split(' ') : eventType;
			for(var i=0; i<eventArray.length; i++)
				this.removeEventListener(eventArray[i], callback, !!useCapture);
			return this;
		}
		
		XObject.prototype.trigger = function(evt){
			this.dispatchEvent(evt);
			return this;
		}
		
		XObject.prototype.redefine = function(method, customizedFun, callSuper){
			var targetMethod = this[method];
			if(!targetMethod) throw new Error('Method "' + method + '" is not existed. ');
			if(callSuper) this['_'+method] = targetMethod;
			this[method] = function(){
				customizedFun.apply(this, arguments);
				if(callSuper) this['_'+method].apply(this, arguments);
			}
			return this;
		}
		
		XObject.prototype.setter = function(property, callback){
			if(this.__defineSetter__){
				this.__defineSetter__(property, callback);
			}else{
				Object.defineProperty(this, property, {set:callback, configurable:true});
			}
			if(!this._) this._ = {};
			if(!this._.SETTER_MAP) this._.SETTER_MAP = {};
			this._.SETTER_MAP[property] = callback;
			return this;
		}
		
		XObject.prototype.getSetter = function(property){
			if(!this._||!this._.SETTER_MAP) return null;
			return this._.SETTER_MAP[property];
		}
		
		XObject.prototype.getter = function(property, callback){
			if(this.__defineGetter__){
				this.__defineGetter__(property, callback);
			}else{
				Object.defineProperty(this, property, {get:callback, configurable:true});
			}
			if(!this._) this._ = {};
			if(!this._.GETTER_MAP) this._.GETTER_MAP = {};
			this._.GETTER_MAP[property] = callback;
			return this;
		}
		
		XObject.prototype.getGetter = function(property){
			if(!this._||!this._.GETTER_MAP) return null;
			return this._.GETTER_MAP[property];
		}
		
		XObject.prototype.clone = function(){
			return duplicateObject(this);
		}
		
		/*
		#############################################################################
			XElement
		#############################################################################
		*/
		
		function XElement(){
			if(this.isXElement) return this;
			this.isXElement = true;
			this._data = {};
			fetchPrototype.call(this, arguments.callee);
			if(!this.click) this.click = function(){
				this.trigger(_.Event('click'));	
			}
			this.getter('clientX', function(){
				return getClientPosition(this, 'offsetLeft');
			});
			this.getter('clientY', function(){
				return getClientPosition(this, 'offsetTop');
			});

			return this;
		}
		
		function getClientPosition(target, property){
			var _offset = 0;
			while(target && target!=document.body){
				_offset += target[property];
				target = target.parantNode;
			}
			return _offset;
		}
		
		_.merge(XElement.prototype, XObject.prototype);

		XElement.prototype.as = function(pluginType, param){
			var constructor;
			if(typeof pluginType=='function'){
				constructor = pluginType;
			}else if(_pluginLib[pluginType]){
				importCustomizedPlugin(pluginType, _pluginLib[pluginType]);
				constructor = _pluginLib[pluginType];
			}else{
				importXComponent(pluginType);
				constructor = _xcubeLib[pluginType];
			}
			PluginConstructor.call(this);
			constructor = makeAdvancedClosureForPluginConstructor(constructor);
			constructor.call(this, _, param);
			return this;
		}
		
		XElement.prototype.css = function(name, value){
			switch(arguments.length){
				case 1:
					if(typeof name == 'string')
						return this.style[name];
					else
						_.merge(this.style, name);
					break;
				case 2:
					this.style[name] = value;
					break;
			}
			return this;
		}
		
		XElement.prototype.attribute = function(name, value){
			switch(arguments.length){
				case 0:
					return this.attributes;
				case 1:
					return this.getAttribute(name);
				case 2:
					if(value==null){
						this.removeAttribute(name);
					}else{
						this.setAttribute(name, value);
					}
					break;
			}
			return this;
		}
		
		XElement.prototype.html = function(what){
			if(what || what==''){
				this.innerHTML = what;
				return this;
			}else{
				return this.innerHTML;
			}
		}

        XElement.prototype.val = function(value){
            if(undefined === value)return this.value;
            this.value = value;
            return this;
        }
		
		XElement.prototype.child = function(selector){
			if(!selector){
				return this.childNodes;
			}else if(!isNaN(selector)){
				return this.getChildAt(selector);
			}else{
				var collection = this.querySelectorAll(selector);
				return filterCollection(collection, true);
			}
		}
		
		XElement.prototype.named = function(name){
			return this.child('[name='+name+']');
		}
		
		XElement.prototype.append = function(node){
			this.appendChild(node);
			return this;
		}
		
		XElement.prototype.clone = function(bDeepClone){
			var node = this.cloneNode(bDeepClone);
			_.parseXTag(node);
			return node;
		};
		
		XElement.prototype.attachData = function(data,sync){
			if(!data) return this;
			var _this = this;
            parseExpression(_this);
            if(_this.hasAttribute("data-property"))onItem(_this);
            var items = _this.child("[data-property]");
            if(!items)return this;
            var _fomart = data._format;
            if(isNaN(items.length)){
                onItem(items);
            }else{
                _.each(items, function(i, item){onItem(item)});
            }
            function parseExpression(dom){
                var reg = /(\$\{)(\w|\d|\.|(\[\d+\]))+(\})/gi;
                if(!dom.outerHTML.match(reg))return;
                eachElement(dom);

                function eachElement(el){
                    if(!el || !el.outerHTML.match(reg))return;
                    parseElement(el);
                    var children = el.children;
                    if(children && children.length>0){
                        _.each(children,function(index,child){
                            eachElement(child);
                        });
                    }
                    var next = el.nextElementSibling;
                    if(next)eachElement(next);
                }
                function parseElement(el){
                    _.each(el.attributes,function(i,attr){
                        if(attr.value.match(reg))el.attribute(attr.name,_parse(attr.value));
                    });
                    function _parse(str){
                        return str.replace(reg,function(expression){
                            var exp = expression.replace(/^(\$\{)/,"").replace(/\}$/,"");
                            var value = "";
                            if(_fomart && _fomart[exp]){
                                var fun = _fomart[exp];
                                value = fun.call(data, data[exp]);
                            }else{
                                value = eval("data."+exp);
                            }
                            return (value === undefined || value === null)?"":value;
                        });
                    }
                }
            }
            function onItem(item){
                var key = item.attribute("data-property");
                if(_fomart && _fomart[key]){
                    var fun = _fomart[key];
                    setValue(item, fun.call(data, data[key]));
                }else{
                    var value = eval("data."+key);
                    if(value === null || value === undefined)value = "";
                    setValue(item,value);
                }
            }
            if(true === sync){
                var format = data._format;
                data.bind("propertyChange",function(evt){
                    var node = _this.child("[data-property='"+evt.property+"']");
                    if(!node || !node.tagName)return;
                    if(format && format[evt.property]){
                        var fun = format[evt.property];
                        setValue(node, fun.call(data, evt.value));
                    }else{
                        setValue(node,evt.value);
                    }
                });
            }
			return this;
			function setValue(element, value){
                var defaultValue = element.attribute("data-default");
                if(null !== defaultValue && undefined !== defaultValue){
                    if("" === value || null === value || undefined === value)value = defaultValue;
                }
				switch(element.tagName.toUpperCase()){
					case 'IMG':
						element.src = value;
						break;
					case 'INPUT':
					case 'TEXTAREA':
					case 'SELECT':
						element.value = value;
						break;
					default:
						element.html(value);
						break;
				}
			}
		}
		
		XElement.prototype.defineCssAnimation = function(property, duration, easeFunction, delay){
			if(!property) throw new Error('Need css property.');
			var propertys = {};
			[['transition-property',property],
			['transition-duration',isNaN(duration)?1:duration+'s'],
			['transition-timing-function',easeFunction||'ease'],
			['transition-delay',isNaN(delay)?0:delay+'s']]
			.forEach(function(item, index, sourceArray){
				propertys[_.browserCore+item[0]] = item[1];
			});
			return this.css(propertys);
		}
		
        XElement.prototype.useXEvent = function(bUseXEvent){
            XEvent.call(this);
            if(bUseXEvent === undefined) bUseXEvent = true;
            if(bUseXEvent)
                this.XEvent.register();
            else
                this.XEvent.unRegister();
            return this;
        }

		XElement.prototype.hitTest = function(target){
			return !(target.offsetLeft>this.offsetLeft+this.clientWidth
			|| target.offsetTop>this.offsetTop+this.clientHeight
			|| target.offsetLeft+target.clientWidth<this.offsetLeft
			|| target.offsetTop+target.clientHeight<this.offsetTop);
		}
		
		XElement.prototype.show = function(){
            this.style.display == "none" && (this.style.display = null)
            if (getComputedStyle(this, '').getPropertyValue("display") == "none")
                this.style.display = defaultDisplay(this.nodeName);

            function defaultDisplay(nodeName) {
                var element, display;
                var elementDisplay = {};
                if (!elementDisplay[nodeName]) {
                    element = document.createElement(nodeName)
                    document.body.appendChild(element)
                    display = getComputedStyle(element, '').getPropertyValue("display")
                    element.parentNode.removeChild(element)
                    display == "none" && (display = "block")
                    elementDisplay[nodeName] = display
                }
                return elementDisplay[nodeName]
            }
			return this;
		}
		
		XElement.prototype.hide = function(){
			if(this.style.display == 'none') return this;
			return this.css({display:"none"});
		}
		
		XElement.prototype.toggle = function(){
			return this.style.display=='none' ? this.show() : this.hide();
		}
		
		XElement.prototype.remove = function(){
			if(this.parentNode)
				this.parentNode.removeChild(this);
			return this;
		}
		
		XElement.prototype.appendTo = function(target){
			target.appendChild(this);
			return this;
		}
		
		XElement.prototype.addClass = function(className){
			if(this.hasClass(className)) return this;
			this.className += ' ' + className;
			return this;
		}
		
		XElement.prototype.removeClass = function(className){
			if(!this.hasClass(className)) return this;
			this.className = _.trim(this.className.replace(getClassNameRegExp(className), ''));
			return this;
		}
		
		XElement.prototype.hasClass = function(className){
			return getClassNameRegExp(className).test(this.className);
		}
		
		XElement.prototype.toggleClass = function(className){
			if(this.hasClass(className)){
				return this.removeClass(className);
			}else{
				return this.addClass(className);
			}
		}
		
		XElement.prototype.hasChild = function(selector){
			return !!this.child(selector);
		}
		
		XElement.prototype.empty = function(){
            this.innerHTML = "";
			return this;
		}

		
		
		/*
		#############################################################################
			DOM Extension
		#############################################################################
		*/
		
		XObject.call(_);
		XObject.call(window);
		XElement.call(document);
		XElement.call(HTMLElement.prototype);

		if(!_.hasTouch&&!_.isIE){
			var touch={};
			document.bind('mousedown mouseup resize click mouseout', function(evt){
				switch(evt.type){
					case 'mousedown':
						touch = {pageX:evt.pageX, pageY:evt.pageY, target:evt.target}
						document.bind('mousemove', throwEvent);
						break;
					case 'mouseup':
						touch.movedX = touch.pageX!=evt.pageX;
						touch.movedY = touch.pageY!=evt.pageY;
						touch.target = evt.target;
						document.unbind('mousemove', throwEvent);
						break;
					case 'mouseout':
						if(evt.target!=touch.target) return;
						break;
					case 'click':
						if(touch.movedX||touch.movedY){
							evt.preventDefault();
							evt.stopPropagation();
						};
						return;
				}
				throwEvent(evt);
			}, true).bind('selectstart', function(evt){
				evt.preventDefault();
			});
			
			function throwEvent(evt){
				var mapping = {
					mousedown:'touchstart',
					mousemove:'touchmove',
					mouseup:'touchend',
					mouseout:'touchend',
					resize:'onorientationchange'
				}
				var touchEvent = _.Event(mapping[evt.type], !/^mouseout$/.test(evt.type), false);
				touchEvent.touches = [_.merge(touchEvent, evt)];
				evt.target.trigger(touchEvent);
			}
		}
		
		
		//----------------------------------------------------------------------
		//	System Animation Frame
		//----------------------------------------------------------------------
		
		window.requestAnimationFrame  = 
		window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(callback) { return setTimeout(callback, 20); };
		
		window.cancelRequestAnimationFrame = 
		window.cancelRequestAnimationFrame ||
		window.webkitCancelAnimationFrame ||
		window.webkitCancelRequestAnimationFrame ||
		window.mozCancelRequestAnimationFrame ||
		window.oCancelRequestAnimationFrame ||
		window.msCancelRequestAnimationFrame ||
		clearTimeout;
		
		//----------------------------------------------------------------------
		//	Protected [READ ONLY]
		//----------------------------------------------------------------------
		
		_.getter('_prefetchLib', function(){return _prefetchLib;});
		_.getter('_pluginLib', function(){return _pluginLib;});
		_.getter('_XTAG_MAP', function(){return _XTAG_MAP;});
		_.getter('_PLUGIN_TAG_MAP', function(){return _PLUGIN_TAG_MAP;});
		_.getter('_XElement', function(){return XElement;});


		//----------------------------------------------------------------------
		//	get FPS
		//----------------------------------------------------------------------
		(function getFPS(){
			var start = _.now();
			var count = 0, totalTime = 0, frameCount = 15;
			var fps = 30;
			_.drawFrames(function(){
				var now = _.now();
				totalTime+=(now-start);
				start = now;
				count++;
			}, function(){
				return count<frameCount;
			}, function(){
				fps = Math.max(Math.round(1000/(totalTime/count)), fps);
			});
			_.getter('FPS', function(){return fps;});
		})();
		
		return _;
		
	})(function(selector){
			if(!selector) return xCube.XObject();
			if(typeof selector!='string') return xCube.XObject(selector);
			return document.child(selector);
	});
	
	
	//------------------------------------------------------------------------------------
	//	Collection filter
	//------------------------------------------------------------------------------------
	
	function filterCollection(queue, trim){
		if(!queue||isNaN(queue.length)){
			return queue;
		}else if((queue.length==0)){
			return null;
		}else if(trim&&(queue.length==1)){
			return queue[0];
		}else{
			return Collection.call(queue);	
		}
		
		function Collection(){
			copyMethods.call(this, xCube._XElement.prototype);
			return this;
		}
		
		function copyMethods(sourceObj){
			var _this = this;
			xCube.each(sourceObj, function(property, item){
				if(typeof item == 'function')
					_this[property] = function(){batch(_this, arguments, property);}
			});
			return _this;
		}
		
		function batch(queue, args, name){
			var fun = xCube._XElement.prototype[name];
			for(var i=0; i<queue.length; i++)
				fun.apply(queue[i], args);
			return queue;
		}
	}
	
	
	//------------------------------------------------------------------------------------
	//	START
	//------------------------------------------------------------------------------------
	
	function handleOnDOMContentLoaded(evt){
		try{
			if(useXTag) xCube.parseXTag(document.documentElement);
		}catch(e){
			alert(e)
		}
		if(handleOnReady) eval(handleOnReady);
		xCube.trigger(xCube.Event('ready'));
	}
	
	
	
	//------------------------------------------------------------------------------------
	//	Init
	//------------------------------------------------------------------------------------
	
	var _scripts = xCube.by.tagName('script');
	var _baseNode = _scripts[_scripts.length-1];
	var _XCUBE_BASE_ = _baseNode.attribute('src').replace('xcube.js', '');
	var mark = _baseNode.attribute('mark')||'xcube';
	var useXTag = _baseNode.attribute('xtag')=='true'||false;
	var handleOnReady = _baseNode.attribute('ready');
	var _defaultTheme = _baseNode.attribute('theme')||_XCUBE_BASE_+'theme/default.xml';
	
	(function initialize(){
//		xCube.loadTheme(_defaultTheme);
		window.setter(mark, function(what){throw new Error('Namespace conflicts. "'+ mark +'" is uesd by xCube.');})
		getter(mark, function(){return xCube;})
		getter('POLYVI_XCUBE', function(){return xCube;});
		document.bind('DOMContentLoaded', handleOnDOMContentLoaded);
	})();

})();
