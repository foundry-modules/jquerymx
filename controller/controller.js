steal('jquery/class', 'jquery/lang/string', 'jquery/event/destroyed', function($) {
	// ------- HELPER FUNCTIONS  ------

	// Binds an element, returns a function that unbinds
	var bind = function( el, ev, callback ) {
		var wrappedCallback,
			binder = el.bind && el.unbind ? el : $(isFunction(el) ? [el] : el);
		//this is for events like >click.
		if ( ev.indexOf(">") === 0 ) {
			ev = ev.substr(1);
			wrappedCallback = function( event ) {
				if ( event.target === el ) {
					callback.apply(this, arguments);
				}
			};
		}
		binder.bind(ev, wrappedCallback || callback);
		// if ev name has >, change the name and bind
		// in the wrapped callback, check that the element matches the actual element
		return function() {
			binder.unbind(ev, wrappedCallback || callback);
			el = ev = callback = wrappedCallback = null;
		};
	},
		makeArray = $.makeArray,
		isArray = $.isArray,
		isFunction = $.isFunction,
		isString = $.isString,
		extend = $.extend,
		Str = $.String,
		each = $.each,
		getObject = Str.getObject,

		STR_PROTOTYPE = 'prototype',
		STR_CONSTRUCTOR = 'constructor',
		slice = Array[STR_PROTOTYPE].slice,

		// Binds an element, returns a function that unbinds
		delegate = function( el, selector, ev, callback ) {

			// !-- FOUNDRY HACK --! //
			// Make event delegation work with direct child selector
			if ( selector.indexOf(">") === 0 ) {
				selector = (el.data("directSelector") + " " || "") + selector;
			}

			var binder = el.delegate && el.undelegate ? el : $(isFunction(el) ? [el] : el)
			binder.delegate(selector, ev, callback);

			return function() {
				binder.undelegate(selector, ev, callback);
				binder = el = ev = callback = selector = null;
			};
		},

		// calls bind or unbind depending if there is a selector
		binder = function( el, ev, callback, selector ) {
			return selector ? delegate(el, selector, ev, callback) : bind(el, ev, callback);
		},

		// moves 'this' to the first argument, wraps it with jQuery if it's an element
		shifter = function shifter(context, name) {
			var method = typeof name == "string" ? context[name] : name;
			return function() {
				context.called = name;
    			return method.apply(context, [this.nodeName ? $(this) : this].concat( slice.call(arguments, 0) ) );
			};
		},
		// matches dots
		dotsReg = /\./g,
		// matches controller
		controllersReg = /_?controllers?/ig,
		//used to remove the controller from the name
		underscoreAndRemoveController = function( className ) {
			return Str.underscore(className.replace($.globalNamespace + ".", "").replace(dotsReg, '_').replace(controllersReg, ""));
		},
		// checks if it looks like an action
		// actionMatcher = /[^\w]/,

		// !-- FOUNDRY HACK --! //
		// Prevent inclusion of single word property name that starts with a symbol, e.g. $family from MooTools.
		// This is coming from an environment where jQuery and MooTools may coexist.
		actionMatcher = /^\S(.*)\s(.*)/,

		// handles parameterized action names
		parameterReplacer = /\{([^\}]+)\}/g,
		controllerReplacer = /\{([^\.]+[\.][^\.]+)\}/g,
		breaker = /^(?:(.*?)\s)?([\w\.\:>]+)$/,
		basicProcessor,
		data = function(el, data){
			return $.data(el, "controllers", data)
		};
	/**
	 * @class jQuery.Controller
	 * @parent jquerymx
	 * @plugin jquery/controller
	 * @download  http://jmvcsite.heroku.com/pluginify?plugins[]=jquery/controller/controller.js
	 * @test jquery/controller/qunit.html
	 * @inherits jQuery.Class
	 * @description jQuery widget factory.
	 *
	 * jQuery.Controller helps create organized, memory-leak free, rapidly performing
	 * jQuery widgets.  Its extreme flexibility allows it to serve as both
	 * a traditional View and a traditional Controller.
	 *
	 * This means it is used to
	 * create things like tabs, grids, and contextmenus as well as
	 * organizing them into higher-order business rules.
	 *
	 * Controllers make your code deterministic, reusable, organized and can tear themselves
	 * down auto-magically. Read about [http://jupiterjs.com/news/writing-the-perfect-jquery-plugin
	 * the theory behind controller] and
	 * a [http://jupiterjs.com/news/organize-jquery-widgets-with-jquery-controller walkthrough of its features]
	 * on Jupiter's blog. [mvc.controller Get Started with jQueryMX] also has a great walkthrough.
	 *
	 * Controller inherits from [jQuery.Class $.Class] and makes heavy use of
	 * [http://api.jquery.com/delegate/ event delegation]. Make sure
	 * you understand these concepts before using it.
	 *
	 * ## Basic Example
	 *
	 * Instead of
	 *
	 *
	 *     $(function(){
	 *       $('#tabs').click(someCallbackFunction1)
	 *       $('#tabs .tab').click(someCallbackFunction2)
	 *       $('#tabs .delete click').click(someCallbackFunction3)
	 *     });
	 *
	 * do this
	 *
	 *     $.Controller('Tabs',{
	 *       click: function() {...},
	 *       '.tab click' : function() {...},
	 *       '.delete click' : function() {...}
	 *     })
	 *     $('#tabs').tabs();
	 *
	 *
	 * ## Tabs Example
	 *
	 * @demo jquery/controller/controller.html
	 *
	 * ## Using Controller
	 *
	 * Controller helps you build and organize jQuery plugins.  It can be used
	 * to build simple widgets, like a slider, or organize multiple
	 * widgets into something greater.
	 *
	 * To understand how to use Controller, you need to understand
	 * the typical lifecycle of a jQuery widget and how that maps to
	 * controller's functionality:
	 *
	 * ### A controller class is created.
	 *
	 *     $.Controller("MyWidget",
	 *     {
	 *       defaults :  {
	 *         message : "Remove Me"
	 *       }
	 *     },
	 *     {
	 *       init : function(rawEl, rawOptions){
	 *         this.element.append(
	 *            "<div>"+this.options.message+"</div>"
	 *           );
	 *       },
	 *       "div click" : function(div, ev){
	 *         div.remove();
	 *       }
	 *     })
	 *
	 * This creates a <code>$.fn.my_widget</code> jQuery helper function
	 * that can be used to create a new controller instance on an element. Find
	 * more information [jquery.controller.plugin  here] about the plugin gets created
	 * and the rules around its name.
	 *
	 * ### An instance of controller is created on an element
	 *
	 *     $('.thing').my_widget(options) // calls new MyWidget(el, options)
	 *
	 * This calls <code>new MyWidget(el, options)</code> on
	 * each <code>'.thing'</code> element.
	 *
	 * When a new [jQuery.Class Class] instance is created, it calls the class's
	 * prototype setup and init methods. Controller's [jQuery.Controller.prototype.setup setup]
	 * method:
	 *
	 *  - Sets [jQuery.Controller.prototype.element this.element] and adds the controller's name to element's className.
	 *  - Merges passed in options with defaults object and sets it as [jQuery.Controller.prototype.options this.options]
	 *  - Saves a reference to the controller in <code>$.data</code>.
	 *  - [jquery.controller.listening Binds all event handler methods].
	 *
	 *
	 * ### The controller responds to events
	 *
	 * Typically, Controller event handlers are automatically bound.  However, there are
	 * multiple ways to [jquery.controller.listening listen to events] with a controller.
	 *
	 * Once an event does happen, the callback function is always called with 'this'
	 * referencing the controller instance.  This makes it easy to use helper functions and
	 * save state on the controller.
	 *
	 *
	 * ### The widget is destroyed
	 *
	 * If the element is removed from the page, the
	 * controller's [jQuery.Controller.prototype.destroy] method is called.
	 * This is a great place to put any additional teardown functionality.
	 *
	 * You can also teardown a controller programatically like:
	 *
	 *     $('.thing').my_widget('destroy');
	 *
	 * ## Todos Example
	 *
	 * Lets look at a very basic example -
	 * a list of todos and a button you want to click to create a new todo.
	 * Your HTML might look like:
	 *
	 * @codestart html
	 * &lt;div id='todos'>
	 *  &lt;ol>
	 *    &lt;li class="todo">Laundry&lt;/li>
	 *    &lt;li class="todo">Dishes&lt;/li>
	 *    &lt;li class="todo">Walk Dog&lt;/li>
	 *  &lt;/ol>
	 *  &lt;a class="create">Create&lt;/a>
	 * &lt;/div>
	 * @codeend
	 *
	 * To add a mousover effect and create todos, your controller might look like:
	 *
	 *     $.Controller('Todos',{
	 *       ".todo mouseover" : function( el, ev ) {
	 *         el.css("backgroundColor","red")
	 *       },
	 *       ".todo mouseout" : function( el, ev ) {
	 *         el.css("backgroundColor","")
	 *       },
	 *       ".create click" : function() {
	 *         this.find("ol").append("<li class='todo'>New Todo</li>");
	 *       }
	 *     })
	 *
	 * Now that you've created the controller class, you've must attach the event handlers on the '#todos' div by
	 * creating [jQuery.Controller.prototype.setup|a new controller instance].  There are 2 ways of doing this.
	 *
	 * @codestart
	 * //1. Create a new controller directly:
	 * new Todos($('#todos'));
	 * //2. Use jQuery function
	 * $('#todos').todos();
	 * @codeend
	 *
	 * ## Controller Initialization
	 *
	 * It can be extremely useful to add an init method with
	 * setup functionality for your widget.
	 *
	 * In the following example, I create a controller that when created, will put a message as the content of the element:
	 *
	 *     $.Controller("SpecialController",
	 *     {
	 *       init: function( el, message ) {
	 *         this.element.html(message)
	 *       }
	 *     })
	 *     $(".special").special("Hello World")
	 *
	 * ## Removing Controllers
	 *
	 * Controller removal is built into jQuery.  So to remove a controller, you just have to remove its element:
	 *
	 * @codestart
	 * $(".special_controller").remove()
	 * $("#containsControllers").html("")
	 * @codeend
	 *
	 * It's important to note that if you use raw DOM methods (<code>innerHTML, removeChild</code>), the controllers won't be destroyed.
	 *
	 * If you just want to remove controller functionality, call destroy on the controller instance:
	 *
	 * @codestart
	 * $(".special_controller").controller().destroy()
	 * @codeend
	 *
	 * ## Accessing Controllers
	 *
	 * Often you need to get a reference to a controller, there are a few ways of doing that.  For the
	 * following example, we assume there are 2 elements with <code>className="special"</code>.
	 *
	 * @codestart
	 * //creates 2 foo controllers
	 * $(".special").foo()
	 *
	 * //creates 2 bar controllers
	 * $(".special").bar()
	 *
	 * //gets all controllers on all elements:
	 * $(".special").controllers() //-> [foo, bar, foo, bar]
	 *
	 * //gets only foo controllers
	 * $(".special").controllers(FooController) //-> [foo, foo]
	 *
	 * //gets all bar controllers
	 * $(".special").controllers(BarController) //-> [bar, bar]
	 *
	 * //gets first controller
	 * $(".special").controller() //-> foo
	 *
	 * //gets foo controller via data
	 * $(".special").data("controllers")["FooController"] //-> foo
	 * @codeend
	 *
	 * ## Calling methods on Controllers
	 *
	 * Once you have a reference to an element, you can call methods on it.  However, Controller has
	 * a few shortcuts:
	 *
	 * @codestart
	 * //creates foo controller
	 * $(".special").foo({name: "value"})
	 *
	 * //calls FooController.prototype.update
	 * $(".special").foo({name: "value2"})
	 *
	 * //calls FooController.prototype.bar
	 * $(".special").foo("bar","something I want to pass")
	 * @codeend
	 *
	 * These methods let you call one controller from another controller.
	 *
	 */
	var controllerRoot = $.globalNamespace + ".Controller";

	$.Controller = function(name) {

		// !-- FOUNDRY HACK --! //
		// By default, all controllers are created under the
		// $.Controller root namespace.
		var args = makeArray(arguments),
			_static = {
				root: controllerRoot
			},
			_prototype;

		if (args.length > 2) {
			// Namespace can be overriden
			_static = $.extend(_static, args[1]);
			_prototype = args[2];
		} else {
			_prototype = args[1];
		}

		if (_static.namespace) {
			name = _static.namespace + "." + name;
		}

		return $.Controller.Class(name, _static, _prototype);
	}

	var controllerClass = controllerRoot + ".Class";

	$.Class(controllerClass,
	/**
	 * @Static
	 */
	{
		/**
		 * Does 2 things:
		 *
		 *   - Creates a jQuery helper for this controller.</li>
		 *   - Calculates and caches which functions listen for events.</li>
		 *
		 * ### jQuery Helper Naming Examples
		 *
		 *
		 *     "TaskController" -> $().task_controller()
		 *     "Controllers.Task" -> $().controllers_task()
		 *
		 */
		setup: function(baseClass, name) {

			// Allow contollers to inherit "defaults" from superclasses as it done in $.Class
			this._super.apply(this, arguments);

			// if you didn't provide a name, or are controller, don't do anything
			if (!this.shortName || this.fullName == controllerClass) {
				return;
			}

			// cache the underscored names
			this._fullName = underscoreAndRemoveController(this.fullName);
			this._shortName = underscoreAndRemoveController(this.shortName);

			var controller = this,
				/**
				 * @attribute pluginName
				 * Setting the <code>pluginName</code> property allows you
				 * to change the jQuery plugin helper name from its
				 * default value.
				 *
				 *     $.Controller("Mxui.Layout.Fill",{
				 *       pluginName: "fillWith"
				 *     },{});
				 *
				 *     $("#foo").fillWith();
				 */
				funcName, forLint;

			// !-- FOUNDRY HACK --! //
			// Make creation of jQuery plugin by testing the existence of pluginName.
			if (isString(this.pluginName)) {

				// !-- FOUNDRY HACK --! //
				// Add a reference to the fullname
				var _fullName = this._fullName;
				var pluginname = this.pluginName;

				// create jQuery plugin
				if (!$.fn[pluginname] ) {
					$.fn[pluginname] = function( options ) {

						var args = makeArray(arguments),
							//if the arg is a method on this controller
							isMethod = typeof options == "string" && isFunction(controller[STR_PROTOTYPE][options]),
							meth = args[0];
						return this.each(function() {
							//check if created
							var controllers = data(this),
								//plugin is actually the controller instance
								//plugin = controllers && controllers[pluginname];

								// !-- FOUNDRY HACK --! //
								// Check using controller full name
								plugin = controllers && controllers[_fullName];

							if ( plugin ) {
								if ( isMethod ) {
									// call a method on the controller with the remaining args
									plugin[meth].apply(plugin, args.slice(1));
								} else {
									// call the plugin's update method
									plugin.update.apply(plugin, args);
								}

							} else {
								//create a new controller instance
								controller.newInstance.apply(controller, [this].concat(args));
							}
						});
					};
				}
			}

			// !-- FOUNDRY HACK --! //
			// If a prototype factory function was given instead of a prototype object,
			// we expect the factory function to return the prototype object upon execution
			// of the factory function. This factory function gets executed during the
			// instantiation of the controller.

			var args         = makeArray(arguments),
				prototype    = this[STR_PROTOTYPE],
				protoFactory = args[(args.length > 3) ? 3 : 2];

			if (isFunction(protoFactory)) {

				// Remap the factory function
				this.protoFactory = protoFactory;

				// Attempt to execute the prototype factory once to get
				// a list of actions that we can cache first.
				prototype = this.protoFactory.call(this, null);
			}

			// calculate and cache actions
			this.actions = {};

			for (funcName in prototype) {
				if (funcName == 'constructor' || !isFunction(prototype[funcName]) ) {
					continue;
				}
				if ( this._isAction(funcName) ) {
					this.actions[funcName] = this._action(funcName);
				}
			}

			// !-- FOUNDRY HACK --! //
			// Controller has been created. Resolve module.
			$.module("$:/Controllers/" + this.fullName).resolve(this);
		},

		hookup: function( el ) {
			return new this(el);
		},

		/**
		 * @hide
		 * @param {String} methodName a prototype function
		 * @return {Boolean} truthy if an action or not
		 */
		_isAction: function( methodName ) {
			if ( actionMatcher.test(methodName) ) {
				return true;
			} else {
				return $.inArray(methodName, this.listensTo) > -1 || $.event.special[methodName] || processors[methodName];
			}

		},
		/**
		 * @hide
		 * This takes a method name and the options passed to a controller
		 * and tries to return the data necessary to pass to a processor
		 * (something that binds things).
		 *
		 * For performance reasons, this called twice.  First, it is called when
		 * the Controller class is created.  If the methodName is templated
		 * like : "{window} foo", it returns null.  If it is not templated
		 * it returns event binding data.
		 *
		 * The resulting data is added to this.actions.
		 *
		 * When a controller instance is created, _action is called again, but only
		 * on templated actions.
		 *
		 * @param {Object} methodName the method that will be bound
		 * @param {Object} [options] first param merged with class default options
		 * @return {Object} null or the processor and pre-split parts.
		 * The processor is what does the binding/subscribing.
		 */
		_action: function( methodName, options ) {
			// reset the test index
			parameterReplacer.lastIndex = 0;

			//if we don't have options (a controller instance), we'll run this later
			if (!options && parameterReplacer.test(methodName) ) {
				return null;
			}

			// !-- FOUNDRY HACK --! //
			// Ability to bind custom event to self.
			// "{self} customEvent"
			methodName = methodName.replace("{self} ", "");

			// If we have options, run sub to replace templates "{}" with a value from the options
			// or the window
			var convertedName = methodName;

			if (options) {

				var bindingOtherController = false;

				if (controllerReplacer.test(methodName)) {

					var controller, selector = "";
					convertedName =
						methodName
							.replace(controllerReplacer, function(whole, inside){
								var parts = inside.split(".");
								controller = options["{"+parts[0]+"}"] || {};
								if ($.isControllerInstance(controller)) {
									selector = (controller[parts[1]] || {})["selector"];
								}
								return selector;
							})
							.match(breaker);

					// If there is a selector, this will be true.
					bindingOtherController = !!selector;

					convertedName = [controller.element].concat(convertedName || []);
				}

				if (!bindingOtherController) {

					convertedName = Str.sub(methodName, [options, window]);
				}
			}

			// If a "{}" resolves to an object, convertedName will be an array
			var arr = isArray(convertedName),

				// get the parts of the function = [convertedName, delegatePart, eventPart]
				parts = (arr ? convertedName[1] : convertedName).match(breaker),
				event = parts[2],
				processor = processors[event] || basicProcessor;

			return {
				processor: processor,
				parts: parts,
				delegate : arr ? convertedName[0] : undefined
			};
		},

		/**
		 * @attribute processors
		 * An object of {eventName : function} pairs that Controller uses to hook up events
		 * auto-magically.  A processor function looks like:
		 *
		 *     jQuery.Controller.processors.
		 *       myprocessor = function( el, event, selector, cb, controller ) {
		 *          //el - the controller's element
		 *          //event - the event (myprocessor)
		 *          //selector - the left of the selector
		 *          //cb - the function to call
		 *          //controller - the binding controller
		 *       };
		 *
		 * This would bind anything like: "foo~3242 myprocessor".
		 *
		 * The processor must return a function that when called,
		 * unbinds the event handler.
		 *
		 * Controller already has processors for the following events:
		 *
		 *   - change
		 *   - click
		 *   - contextmenu
		 *   - dblclick
		 *   - focusin
		 *   - focusout
		 *   - keydown
		 *   - keyup
		 *   - keypress
		 *   - mousedown
		 *   - mouseenter
		 *   - mouseleave
		 *   - mousemove
		 *   - mouseout
		 *   - mouseover
		 *   - mouseup
		 *   - reset
		 *   - resize
		 *   - scroll
		 *   - select
		 *   - submit
		 *
		 * Listen to events on the document or window
		 * with templated event handlers:
		 *
		 *
		 *     $.Controller('Sized',{
		 *       "{window} resize" : function(){
		 *         this.element.width(this.element.parent().width() / 2);
		 *       }
		 *     });
		 *
		 *     $('.foo').sized();
		 */
		processors: {},
		/**
		 * @attribute listensTo
		 * An array of special events this controller
		 * listens too.  You only need to add event names that
		 * are whole words (ie have no special characters).
		 *
		 *     $.Controller('TabPanel',{
		 *       listensTo : ['show']
		 *     },{
		 *       'show' : function(){
		 *         this.element.show();
		 *       }
		 *     })
		 *
		 *     $('.foo').tab_panel().trigger("show");
		 *
		 */
		listensTo: [],
		/**
		 * @attribute defaults
		 * A object of name-value pairs that act as default values for a controller's
		 * [jQuery.Controller.prototype.options options].
		 *
		 *     $.Controller("Message",
		 *     {
		 *       defaults : {
		 *         message : "Hello World"
		 *       }
		 *     },{
		 *       init : function(){
		 *         this.element.text(this.options.message);
		 *       }
		 *     })
		 *
		 *     $("#el1").message(); //writes "Hello World"
		 *     $("#el12").message({message: "hi"}); //writes hi
		 *
		 * In [jQuery.Controller.prototype.setup setup] the options passed to the controller
		 * are merged with defaults.  This is not a deep merge.
		 */
		defaults: {},

		hostname: "parent"
	},
	/**
	 * @Prototype
	 */
	{
		/**
		 * Setup is where most of controller's magic happens.  It does the following:
		 *
		 * ### 1. Sets this.element
		 *
		 * The first parameter passed to new Controller(el, options) is expected to be
		 * an element.  This gets converted to a jQuery wrapped element and set as
		 * [jQuery.Controller.prototype.element this.element].
		 *
		 * ### 2. Adds the controller's name to the element's className.
		 *
		 * Controller adds it's plugin name to the element's className for easier
		 * debugging.  For example, if your Controller is named "Foo.Bar", it adds
		 * "foo_bar" to the className.
		 *
		 * ### 3. Saves the controller in $.data
		 *
		 * A reference to the controller instance is saved in $.data.  You can find
		 * instances of "Foo.Bar" like:
		 *
		 *     $("#el").data("controllers")['foo_bar'].
		 *
		 * ### Binds event handlers
		 *
		 * Setup does the event binding described in [jquery.controller.listening Listening To Events].
		 *
		 * @param {HTMLElement} element the element this instance operates on.
		 * @param {Object} [options] option values for the controller.  These get added to
		 * this.options and merged with [jQuery.Controller.static.defaults defaults].
		 * @return {Array} return an array if you wan to change what init is called with. By
		 * default it is called with the element and options passed to the controller.
		 */
		setup: function(elem, options) {

			var instance  = this,
				Class     = instance[STR_CONSTRUCTOR],
				prototype = instance[STR_PROTOTYPE];

			// !-- FOUNDRY HACK --! //
			// Execute factory function if exists, extends the properties
			// of the returned object onto the instance.
			if (Class.protoFactory) {

				// This is where "self" keyword is passed as first argument.
				prototype = Class.protoFactory.apply(Class, [instance]);

				// Extend the properties of the prototype object onto the instance.
				extend(true, instance, prototype);
			}

			var _fullName = Class._fullName;

			// !-- FOUNDRY HACK --! //
			// Unique id for every controller instance.
			instance.instanceId = $.uid(_fullName + '_');

			// !-- FOUNDRY HACK --! //
			// Use _fullName instead
			// This actually does $(e).data("controllers", _fullName);
			(data(elem) || data(elem, {}))[_fullName] = instance;

			// Convert HTML element into a jQuery element
			// and store it inside instance.element.
			var element = instance.element
						= $(elem);

			// !-- FOUNDRY HACK --~ //
			// Add a unique direct selector for every controller instance.
			if (!element.data("directSelector")) {
				var selector = $.uid("DS");
				element
					.addClass(selector)
					.data("directSelector", "." + selector);
			}

			// !-- FOUNDRY HACK --! //
			// Added defaultOptions as an alternative to defaults
			var instanceOptions = instance.options
								= extend(true, {}, Class.defaults, Class.defaultOptions, options);

			// !-- FOUNDRY HACK --! //
			// Augment selector properties into selector functions.
			// The rest are passed in as controller properties.
			for (name in instanceOptions) {

				if (!name.match(/^\{.+\}$/)) continue;

				var key = name.replace(/^\{|\}$/g,''),
					val = instanceOptions[name];

				// Augmented selector function
				if (isString(val)) {

					instance[key] = (function(instance, selector, funcName) {

						// Selector shorthand for controllers
						selector = /^(\.|\#)$/.test(selector) ? selector + funcName : selector;

						// Create selector function
						var selectorFunc = function(filter) {

							var elements = instance.element.find(selector);

							if (filter) {
								elements = elements.filter(filter);
							}

							return elements;
						};

						// Keep the selector as a property of the function
						selectorFunc.selector = selector;

						return selectorFunc;

					})(instance, val, key);

				// Else just reference it, e.g. controller instance
				} else {

					instance[key] = val;
				}
			}

			// !-- FOUNDRY HACK --! //
			// Augment view properties into view functions.
			// self.view.listItem(useHtml, data, callback);
			var views = instanceOptions.view;

			each(views || {}, function(name, view){

				instance.view[name] = function(useHtml) {

					var args = makeArray(arguments);

					if ($.isBoolean(useHtml)) {
						args = args.slice(1);
					} else {
						useHtml = false;
					}

					return instance.view.apply(instance, [useHtml, name].concat(args));
				}
			});

			// !-- FOUNDRY HACK --! //
			// Instance property override
			$.extend(instance, instanceOptions.controller);

			/**
			 * @attribute called
			 * String name of current function being called on controller instance.  This is
			 * used for picking the right view in render.
			 * @hide
			 */
			instance.called = "init";

			// bind all event handlers
			instance._bind();

			/**
			 * @attribute element
			 * The controller instance's delegated element. This
			 * is set by [jQuery.Controller.prototype.setup setup]. It
			 * is a jQuery wrapped element.
			 *
			 * For example, if I add MyWidget to a '#myelement' element like:
			 *
			 *     $.Controller("MyWidget",{
			 *       init : function(){
			 *         this.element.css("color","red")
			 *       }
			 *     })
			 *
			 *     $("#myelement").my_widget()
			 *
			 * MyWidget will turn #myelement's font color red.
			 *
			 * ## Using a different element.
			 *
			 * Sometimes, you want a different element to be this.element.  A
			 * very common example is making progressively enhanced form widgets.
			 *
			 * To change this.element, overwrite Controller's setup method like:
			 *
			 *     $.Controller("Combobox",{
			 *       setup : function(el, options){
			 *          this.oldElement = $(el);
			 *          var newEl = $('<div/>');
			 *          this.oldElement.wrap(newEl);
			 *          this._super(newEl, options);
			 *       },
			 *       init : function(){
			 *          this.element //-> the div
			 *       },
			 *       ".option click" : function(){
			 *         // event handler bound on the div
			 *       },
			 *       destroy : function(){
			 *          var div = this.element; //save reference
			 *          this._super();
			 *          div.replaceWith(this.oldElement);
			 *       }
			 *     }
			 */
			return [element, instanceOptions].concat(makeArray(arguments).slice(2));
			/**
			 * @function init
			 *
			 * Implement this.
			 */
		},
		/**
		 * Bind attaches event handlers that will be
		 * removed when the controller is removed.
		 *
		 * This used to be a good way to listen to events outside the controller's
		 * [jQuery.Controller.prototype.element element].  However,
		 * using templated event listeners is now the prefered way of doing this.
		 *
		 * ### Example:
		 *
		 *     init: function() {
		 *        // calls somethingClicked(el,ev)
		 *        this.bind('click','somethingClicked')
		 *
		 *        // calls function when the window is clicked
		 *        this.bind(window, 'click', function(ev){
		 *          //do something
		 *        })
		 *     },
		 *     somethingClicked: function( el, ev ) {
		 *
		 *     }
		 *
		 * @param {HTMLElement|jQuery.fn|Object} [el=this.element]
		 * The element to be bound.  If an eventName is provided,
		 * the controller's element is used instead.
		 *
		 * @param {String} eventName The event to listen for.
		 * @param {Function|String} func A callback function or the String name of a controller function.  If a controller
		 * function name is given, the controller function is called back with the bound element and event as the first
		 * and second parameter.  Otherwise the function is called back like a normal bind.
		 * @return {Integer} The id of the binding in this._bindings
		 */

		on: function(eventName) {

			var args = makeArray(arguments),
				element = this.element,
				length = args.length;

			// Listen to the controller's element
			// on(eventName, eventHandler);
			if (length==2) {
				return this._binder(element, eventName, args[1]);
			}

			// Listen to controller's child elements matching the selector
			// on(eventName, selector, eventHandler);
			if (length==3) {
				return this._binder(element, eventName, args[2], args[1]);
			}

			// Listen to an element from another element
			// on(eventName, element, selector, eventHandler);
			if (length==4) {
				return this._binder($(args[1]), eventName, args[3], args[2]);
			}
		},

		// !-- FOUNDRY HACK --! //
		// Rename this.bind from this_bind. Conflict with mootools.
		// _bind: function( el, eventName, func ) {
		_bind: function() {

			var instance = this,
				Class    = instance[STR_CONSTRUCTOR],
				actions  = Class.actions,
				bindings = instance._bindings = [],
				element  = instance.element;

			each(actions || {}, function(name, action){

				if (!actions.hasOwnProperty(name)) return;

				var ready = Class.actions[name] || Class._action(name, instance.options);

				// Translate to the controller element first
				if ($.isControllerInstance(ready.delegate)) {
					ready.delegate = ready.delegate.element;
				}

				bindings.push(
					ready.processor(
						ready.delegate || element,
						ready.parts[2],
						ready.parts[1],
						name,
						instance
					)
				);
			});

			//setup to be destroyed ... don't bind b/c we don't want to remove it
			var destroyCB = shifter(this,"destroy");
			element.bind("destroyed", destroyCB);
			bindings.push(function( el ) {
				$(el).unbind("destroyed", destroyCB);
			});
			return bindings.length;
		},
		_binder: function( el, eventName, func, selector ) {
			if ( typeof func == 'string' ) {
				func = shifter(this,func);
			}
			this._bindings.push(binder(el, eventName, func, selector));
			return this._bindings.length;
		},
		_unbind : function(){
			var el = this.element[0];
			each(this._bindings, function( key, value ) {
				value(el);
			});
			//adds bindings
			this._bindings = [];
		},
		// !-- FOUNDRY HACK --! //
		// Element event triggering
		trigger: function() {
			return this.element.trigger.apply(this.element, arguments);
		},
		/**
		 * Delegate will delegate on an elememt and will be undelegated when the controller is removed.
		 * This is a good way to delegate on elements not in a controller's element.<br/>
		 * <h3>Example:</h3>
		 * @codestart
		 * // calls function when the any 'a.foo' is clicked.
		 * this.delegate(document.documentElement,'a.foo', 'click', function(ev){
		 *   //do something
		 * })
		 * @codeend
		 * @param {HTMLElement|jQuery.fn} [element=this.element] the element to delegate from
		 * @param {String} selector the css selector
		 * @param {String} eventName the event to bind to
		 * @param {Function|String} func A callback function or the String name of a controller function.  If a controller
		 * function name is given, the controller function is called back with the bound element and event as the first
		 * and second parameter.  Otherwise the function is called back like a normal bind.
		 * @return {Integer} The id of the binding in this._bindings
		 */
		delegate: function( element, selector, eventName, func ) {
			if ( typeof element == 'string' ) {
				func = eventName;
				eventName = selector;
				selector = element;
				element = this.element;
			}
			return this._binder(element, eventName, func, selector);
		},
		/**
		 * Update extends [jQuery.Controller.prototype.options this.options]
		 * with the `options` argument and rebinds all events.  It basically
		 * re-configures the controller.
		 *
		 * For example, the following controller wraps a recipe form. When the form
		 * is submitted, it creates the recipe on the server.  When the recipe
		 * is `created`, it resets the form with a new instance.
		 *
		 *     $.Controller('Creator',{
		 *       "{recipe} created" : function(){
		 *         this.update({recipe : new Recipe()});
		 *         this.element[0].reset();
		 *         this.find("[type=submit]").val("Create Recipe")
		 *       },
		 *       "submit" : function(el, ev){
		 *         ev.preventDefault();
		 *         var recipe = this.options.recipe;
		 *         recipe.attrs( this.element.formParams() );
		 *         this.find("[type=submit]").val("Saving...")
		 *         recipe.save();
		 *       }
		 *     });
		 *     $('#createRecipes').creator({recipe : new Recipe()})
		 *
		 *
		 * @demo jquery/controller/demo-update.html
		 *
		 * Update is called if a controller's [jquery.controller.plugin jQuery helper] is
		 * called on an element that already has a controller instance
		 * of the same type.
		 *
		 * For example, a widget that listens for model updates
		 * and updates it's html would look like.
		 *
		 *     $.Controller('Updater',{
		 *       // when the controller is created, update the html
		 *       init : function(){
		 *         this.updateView();
		 *       },
		 *
		 *       // update the html with a template
		 *       updateView : function(){
		 *         this.element.html( "content.ejs",
		 *                            this.options.model );
		 *       },
		 *
		 *       // if the model is updated
		 *       "{model} updated" : function(){
		 *         this.updateView();
		 *       },
		 *       update : function(options){
		 *         // make sure you call super
		 *         this._super(options);
		 *
		 *         this.updateView();
		 *       }
		 *     })
		 *
		 *     // create the controller
		 *     // this calls init
		 *     $('#item').updater({model: recipe1});
		 *
		 *     // later, update that model
		 *     // this calls "{model} updated"
		 *     recipe1.update({name: "something new"});
		 *
		 *     // later, update the controller with a new recipe
		 *     // this calls update
		 *     $('#item').updater({model: recipe2});
		 *
		 *     // later, update the new model
		 *     // this calls "{model} updated"
		 *     recipe2.update({name: "something newer"});
		 *
		 * _NOTE:_ If you overwrite `update`, you probably need to call
		 * this._super.
		 *
		 * ### Example
		 *
		 *     $.Controller("Thing",{
		 *       init: function( el, options ) {
		 *         alert( 'init:'+this.options.prop )
		 *       },
		 *       update: function( options ) {
		 *         this._super(options);
		 *         alert('update:'+this.options.prop)
		 *       }
		 *     });
		 *     $('#myel').thing({prop : 'val1'}); // alerts init:val1
		 *     $('#myel').thing({prop : 'val2'}); // alerts update:val2
		 *
		 * @param {Object} options A list of options to merge with
		 * [jQuery.Controller.prototype.options this.options].  Often, this method
		 * is called by the [jquery.controller.plugin jQuery helper function].
		 */
		update: function( options ) {
			extend(this.options, options);
			this._unbind();
			this._bind();
		},
		/**
		 * Destroy unbinds and undelegates all event handlers on this controller,
		 * and prevents memory leaks.  This is called automatically
		 * if the element is removed.  You can overwrite it to add your own
		 * teardown functionality:
		 *
		 *     $.Controller("ChangeText",{
		 *       init : function(){
		 *         this.oldText = this.element.text();
		 *         this.element.text("Changed!!!")
		 *       },
		 *       destroy : function(){
		 *         this.element.text(this.oldText);
		 *         this._super(); //Always call this!
		 *     })
		 *
		 * Make sure you always call <code>_super</code> when overwriting
		 * controller's destroy event.  The base destroy functionality unbinds
		 * all event handlers the controller has created.
		 *
		 * You could call destroy manually on an element with ChangeText
		 * added like:
		 *
		 *     $("#changed").change_text("destroy");
		 *
		 */
		destroy: function() {
			if ( this._destroyed ) {
				try {
					console.error(this[STR_CONSTRUCTOR].shortName + " controller already deleted");
				} catch(e) {};
				return;
			}
			var fname = this[STR_CONSTRUCTOR]._fullName,
				controllers;

			// remove all plugins
			for (pname in this.plugin.registry) {
				this.removePlugin(pname);
			}

			// mark as destroyed
			this._destroyed = true;

			// remove the className
			this.element.removeClass(fname);

			// unbind bindings
			this._unbind();
			// clean up
			delete this._actions;

			delete this.element.data("controllers")[fname];

			$(this).triggerHandler("destroyed"); //in case we want to know if the controller is removed

			this.element = null;
		},
		/**
		 * Queries from the controller's element.
		 * @codestart
		 * ".destroy_all click" : function() {
		 *    this.find(".todos").remove();
		 * }
		 * @codeend
		 * @param {String} selector selection string
		 * @return {jQuery.fn} returns the matched elements
		 */
		find: function( selector ) {
			return this.element.find(selector);
		},

		// !-- FOUNDRY HACK --! //
		// Quick acccess to views.
		view: function() {

			var args = makeArray(arguments),
				name,
				options = args,
				useHtml = false,
				context = this[STR_CONSTRUCTOR].component || $,
				html = "",
				view = this.options.view || {};

			if (typeof args[0] == "boolean") {
				useHtml = args[0];
				options = args.slice(1);
			}

			name = options[0] = view[options[0]];

			// If view is not assigned, return empty string.
			if (name==undefined) {
				return (useHtml) ? "" : $("");
			}

			html = context.View.apply(context, options);

			return (useHtml) ? html : $(html);
		},

		_plugin: {},

		plugin: function(name) {

			return this._plugin[name];
		},

		// addPlugin(name, object, [options]);
		// The object should consist of a method called destroy();

		// addPlugin(name, function, [options]);
		// The function should return an object with a method called destroy();

		addPlugin: function(name, plugin, options) {

			if (!name) return;

			// This means we are working with plugin shorthand
			if ($.isPlainObject(plugin)) {
				options = plugin;
				plugin = [this.Class.root, this.Class.fullName, $.String.capitalize(name)].join(".");
			}

			// If plugin is a string, get the controller from it.
			if ($.isString(plugin)) {
				plugin = $.getController(plugin);
			}

			// Controller class are also functions,
			// so this simple test is good enough.
			if (!isFunction(plugin)) return;

			// Normalize plugin options
			options = $.extend(true, {element: this.element}, options, ((this.options.plugin || {})[name] || {}));

			// Trigger addPlugin event so controller can decorate the options
			this.trigger("addPlugin", name, plugin, options);

			var pluginInstance;

			// Controller plugins
			if ($.isController(plugin)) {

				// Subcontrollers should have a way to listen back to host controller
				options["{" + this.Class.hostname + "}"] = this;

				pluginInstance = options.element.addController(plugin, options);

			// Custom plugins
			} else {
				pluginInstance = plugin(this, options);
			}

			// If pluginInstance could not be created, stop.
			if (!pluginInstance) return;

			// Register plugin
			this._plugin[name] = pluginInstance;

			// Trigger registerPlugin
			this.trigger("registerPlugin", name, pluginInstance, options);

			return pluginInstance;
		},

		removePlugin: function(name) {

			var plugin = this.plugin[name];

			// Trigger removePlugin
			this.trigger("removePlugin", name, plugin);

			delete this._plugin[name];

			return $.isFunction(plugin.destroy) ? plugin.destroy() : null;
		},

		//tells callback to set called on this.  I hate this.
		_set_called: true
	});

	var processors = $.Controller.Class.processors,

	//------------- PROCESSSORS -----------------------------
	//processors do the binding.  They return a function that
	//unbinds when called.
	//the basic processor that binds events
	basicProcessor = function( el, event, selector, methodName, controller ) {
		return binder(el, event, shifter(controller, methodName), selector);
	};




	//set common events to be processed as a basicProcessor
	each("change click contextmenu dblclick keydown keyup keypress mousedown mousemove mouseout mouseover mouseup reset resize scroll select submit focusin focusout mouseenter mouseleave".split(" "), function( i, v ) {
		processors[v] = basicProcessor;
	});
	/**
	 *  @add jQuery.fn
	 */

	//used to determine if a controller instance is one of controllers
	//controllers can be strings or classes

	var normalizeController = function(controller) {
		return controller.replace("$.Controller", controllerRoot);
	}

	var getController = function(controller) {
		if (isString(controller)) {
			controller = normalizeController(controller);
			controller = getObject(controller) || getObject(controllerRoot + "." + controller);
		};
		if (isController(controller)) {
			return controller;
		};
	}

	var isController = function(controller) {
		return isFunction(controller) && controller.hasOwnProperty("_fullName");
	}

	var flattenControllers = function(controllers) {
		return $.map(controllers, function(controller){
			return (isArray(controller)) ? flattenControllers(controller) : getController(controller);
		});
	};

	$.getController = getController;

	$.isController = function(controller) {
		return !!getController(controller);
	}

	$.isControllerInstance = function(instance) {
		return instance && instance[STR_CONSTRUCTOR] && isController(instance[STR_CONSTRUCTOR]);
	}

	$.isControllerOf = function(instance, controllers) {

		if (!controllers) return false;

		if (!isArray(controllers)) {
			controllers = [controllers];
		}

		while (controllers.length) {
			var controller = getController(controllers.shift());
			if (instance instanceof controller) return true;
		}

		return false;
	};

	$.fn.extend({
		/**
		 * @function controllers
		 * Gets all controllers in the jQuery element.
		 * @return {Array} an array of controller instances.
		 */
		controllers: function() {

			var candidates = flattenControllers(makeArray(arguments)),
				instances = [];

			this.each(function() {

				var controllers = $.data(this, "controllers");

				each(controllers || {}, function(_fullName, instance){

					if (!controllers.hasOwnProperty(_fullName)) return;

					if (!candidates.length || $.isControllerOf(instance, candidates)) {
						instances.push(instance);
					}
				});
			});

			return instances;
		},

		/**
		 * @function controller
		 * Gets a controller in the jQuery element.  With no arguments, returns the first one found.
		 * @param {Object} controller (optional) if exists, the first controller instance with this class type will be returned.
		 * @return {jQuery.Controller} the first controller.
		 */
		controller: function(controller, options) {

			// Getter
			if (options===undefined) {
				return this.controllers(controller)[0];
			}

			// Setter
			this.addController.apply(this, arguments);
			return this;
		},

		hasController: function(controller) {

			var _fullName =
				(getController(controller) || {})._fullName ||
				(isString(controller) ? underscoreAndRemoveController(normalizeController(controller)) : "");

			return (!_fullName) ? false : (($(this).data("controllers") || {}).hasOwnProperty(_fullName));
		},

		addController: function(controller, options, callback) {

			var Controller = getController(controller);

			if (!Controller) return;

			var instances = [];

			this.each(function(){

				// Just return existing instance
				var existingInstance = $(this).controller(controller);
				if (existingInstance) {
					instances.push(existingInstance);
					return;
				}

				// Or create a new instance
				var instance = new Controller(this, options);
				isFunction(callback) && callback.apply(instance, [$(this), instance]);
				instances.push(instance);
			});

			return (instances.length > 1) ? instances : instances[0];
		},

		removeController: function(controller) {
			this.each(function(){
				var instances = $(this).controllers(controller);
				while (instances.length) {
					instances.shift().destroy();
				}
			});
			return this;
		},

		addControllerWhenAvailable: function(controller) {

			var elements = this,
				args = arguments,
				task = $.Deferred();

			if ($.isController(controller)) {
				controller = controller.fullName;
			}

			if (!isString(controller)) {
				return task.reject();
			}

			$.module("$:/Controllers/" + controller)
				.pipe(
					function(){
						var instance = elements.addController.apply(elements, args);
						task.resolveWith(instance, [elements, instance]);
					},
					task.reject,
					task.fail
				);

			return task;
		},

		// @deprecated 2.2
		implement: function() {
			this.addController.apply(this, arguments);
			return this;
		}

	});

});
