steal('jquery/class', 'jquery/lang/string', 'jquery/event/destroyed', function($) {
	// ------- HELPER FUNCTIONS  ------

	// Binds an element, returns a function that unbinds
	var bind = function( el, ev, callback, eventData ) {
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
		// !-- FOUNDRY HACK --! //
		// Support for passing event data
		if (eventData) {
			binder.bind(ev, eventData, wrappedCallback || callback);
		} else {
			binder.bind(ev, wrappedCallback || callback);
		}
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
		delegate = function( el, selector, ev, callback, eventData ) {

			// !-- FOUNDRY HACK --! //
			// Make event delegation work with direct child selector
			if ( selector.indexOf(">") === 0 ) {
				selector = (el.data("directSelector") + " " || "") + selector;
			}

			var binder = el.delegate && el.undelegate ? el : $(isFunction(el) ? [el] : el)

			// !-- FOUNDRY HACK --! //
			// Support for passing event data
			if (eventData) {
				binder.delegate(selector, ev, eventData, callback);
			} else {
				binder.delegate(selector, ev, callback);
			}

			return function() {
				binder.undelegate(selector, ev, callback);
				binder = el = ev = callback = selector = null;
			};
		},

		// calls bind or unbind depending if there is a selector
		binder = function( el, ev, callback, selector, eventData ) {
			// !-- FOUNDRY HACK --! //
			// Support for passing event data
			return selector ? delegate(el, selector, ev, callback, eventData) : bind(el, ev, callback, eventData);
		},

		// moves 'this' to the first argument, wraps it with jQuery if it's an element
		shifter = function shifter(context, name) {
			var method = typeof name == "string" ? context[name] : name;

			// !-- FOUNDRY HACK --! //
			// Support for passing event data
			if (isArray(method) && isFunction(method[1])) {
				method = method[1];
			}

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

			// !-- FOUNDRY HACK --! //
			// Added support for expandable elements.
			var elements = this.elements || [],
				i = 0,
				defaults = this.defaults;

			while (element = elements[i++]) {

			    var start  = element.indexOf("{"),
				    end    = element.indexOf("}"),
				    length = element.length,
				    prefix = element.slice(0, start),
				    suffix = element.slice(end + 1),
				    names  = element.slice(start + 1, end).split("|"),
				    j = 0;

					while (name = names[j++]) {

						var prop = "{" + $.camelize(name) + "}";

						!$.has(defaults, prop) &&
							(defaults[prop] = prefix + name + suffix);
					}
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

						var args = makeArray(arguments);

						// Returning controller instance if it exists
						if ($.isString(options) && options==="controller") {

							var controllers = data(this[0]),
								instance = controllers && controllers[_fullName];

							return instance;
						}

						return this.each(function() {
							//check if created
							var controllers = data(this),
								//plugin is actually the controller instance
								//plugin = controllers && controllers[pluginname];

								// !-- FOUNDRY HACK --! //
								// Check using controller full name
								instance = controllers && controllers[_fullName];

							if (instance) {

								// call a method on the controller with the remaining args
								if ($.isString(options)) {
									var method = instance[options];
									$.isFunction(method) && method.apply(instance, args.slice(1));
									return;
								}

								// call the plugin's update method
								instance.update.apply(instance, args);

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

			// !-- FOUNDRY HACK --! //
			// Support for handlers that also pass in event data
			for (funcName in prototype) {

				if (funcName=='constructor') continue;

				if (this._isAction(funcName)) {

					var method   = prototype[funcName],
						isMethod = isFunction(method) || (isArray(method) && isFunction(method[1]));

					if (!isMethod) continue;

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

			var _fullName = Class._fullName;

			// !-- FOUNDRY HACK --! //
			// Unique id for every controller instance.
			instance.instanceId = $.uid(_fullName + '_');

			// !-- FOUNDRY HACK --! //
			// Added defaultOptions as an alternative to defaults
			var instanceOptions = instance.options
								= extend(true, {}, Class.defaults, Class.defaultOptions, options);

			// Convert HTML element into a jQuery element
			// and store it inside instance.element.
			var element = instance.element
						= $(elem);

			// !-- FOUNDRY HACK --! //
			// Execute factory function if exists, extends the properties
			// of the returned object onto the instance.
			if (Class.protoFactory) {

				// This is where "self" keyword is passed as first argument.
				prototype = Class.protoFactory.apply(Class, [instance, instanceOptions, element]);

				// Extend the properties of the prototype object onto the instance.
				extend(true, instance, prototype);
			}

			// !-- FOUNDRY HACK --! //
			// Use _fullName instead
			// This actually does $(e).data("controllers", _fullName);
			(data(elem) || data(elem, {}))[_fullName] = instance;

			// !-- FOUNDRY HACK --~ //
			// Add a unique direct selector for every controller instance.
			if (!element.data("directSelector")) {
				var selector = $.uid("DS");
				element
					.addClass(selector)
					.data("directSelector", "." + selector);
			}

			// !-- FOUNDRY HACK --! //
			// Augment selector properties into selector functions.
			// The rest are passed in as controller properties.
			for (name in instanceOptions) {

				if (!name.match(/^\{.+\}$/)) continue;

				var key = name.replace(/^\{|\}$/g,''),
					val = instanceOptions[name];

				// Augmented selector function
				if (isString(val)) {

					var selectorFuncExtension = instance[key];

					instance[key] = (function(instance, selector, funcName) {

						// Selector shorthand for controllers
						selector = /^(\.|\#)$/.test(selector) ? selector + funcName : selector;

						// Create selector function
						var selectorFunc = function(filter) {

							var elements = instance.element.find(selector);

							if ($.isString(filter)) {
								elements = elements.filter(filter);
							}

							if ($.isPlainObject(filter)) {
								$.each(filter, function(key, val){
									elements = elements.filterBy(key, val);
								});
							}

							return elements;
						};

						// Keep the selector as a property of the function
						selectorFunc.selector = selector;

						selectorFunc.css = function() {

							var cssRule = selectorFunc.cssRule;

							if (!cssRule) {

								var directSelector = element.data("directSelector"),

									ruleSelector = $.map(selector.split(","), function(selector) {
														return directSelector + " " + selector
													});

								cssRule = selectorFunc.cssRule = $.cssRule(ruleSelector);
								cssRule.important = true;
							}

							return (arguments.length) ? cssRule.css.apply(cssRule, arguments) : cssRule;
						};

						selectorFunc.inside = function(el) {
							return $(el).find(selector);
						};

						selectorFunc.of = function(el) {
							return $(el).parents(selector).eq(0);
						};

						if ($.isPlainObject(selectorFuncExtension)) {
							$.extend(selectorFunc, selectorFuncExtension);
						}

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

			// Prevent augmented functions from being
			// extended onto the prototype view function.
			var __view = instance.view;

			instance.view = function() {
				return __view.apply(this, arguments);
			};

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

			// !--- FOUNDRY HACK --! //
			instance.pluginInstances = {};

			/**
			 * @attribute called
			 * String name of current function being called on controller instance.  This is
			 * used for picking the right view in render.
			 * @hide
			 */
			instance.called = "init";

			// bind all event handlers
			instance._bind();

			var __init = instance.init || $.noop;

			// !-- FOUNDRY HACK --! //
			// Trigger init event when controller is created.
			instance.init = function(){
				instance.init = __init;
				result = __init.apply(instance, arguments);
				instance.trigger("init." + Class.fullName.toLowerCase(), [instance]);
				return result;
			}

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
			// args[1] == selector, jquery collection or dom node.
			// args[2] == eventHandler.
			if (length==3 && isString(args[1])) {
				return this._binder(element, eventName, args[2], args[1]);
			} else {
				return this._binder(args[1], eventName, args[2]);
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
		trigger: function(name) {

			var el = this.element;
			if (!el) return;

			var event = $.Event(name);
				el.trigger.apply(el, [event].concat($.makeArray(arguments).slice(1)));

			return event;
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
				return;
			}
			var fname = this[STR_CONSTRUCTOR]._fullName,
				controllers;

			// remove all plugins
			for (pname in this.pluginInstances) {
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

			// !-- FOUNDRY HACK --! //
			// Reassign this.element to an empty jQuery element instead.
			this.element = $();
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

			return (useHtml) ? html : $($.parseHTML($.trim(html)));
		},

		getPlugin: function(name) {

			return this.pluginInstances[name];
		},

		addSubscriber: function(instance) {

			var instances = ($.isArray(instance)) ? instance : [instance || {}];

			// Prep options
			var host = this,
				hostname = this.Class.hostname,
				options = {};
				options["{" + hostname + "}"] = host;

			$.map(instances, function(instance, i){

				// If this is not a controller instance.
				if (!$.isControllerInstance(instance)) return false;

				// If instance is already a subscriber,skip.
				if (instance.options[hostname]===this) return instance;

				// Also map itself as a method name
				instance[hostname] = host;

				// Attach publisher to subscriber
				return instance.update(options);
			});

			return instances;
		},

		// addPlugin(name, object, [options]);
		// The object should consist of a method called destroy();

		// addPlugin(name, function, [options]);
		// The function should return an object with a method called destroy();

		addPlugin: function(name, plugin, options) {

			if (!name) return;

			// This means we are working with plugin shorthand
			if ((!plugin && !options) || $.isPlainObject(plugin)) {
				options = plugin;
				plugin = [this.Class.root, this.Class.fullName, $.String.capitalize(name)].join(".");
			}

			// If plugin is a string, get the controller from it.
			if ($.isString(plugin)) {
				plugin = $.getController(plugin);
			}

			var isPluginInstance = $.isControllerInstance(plugin);

			// Controller class are also functions,
			// so this simple test is good enough.
			if (!isFunction(plugin) && !isPluginInstance) return;

			// Normalize plugin options
			var pluginOptions =
				this.Class.pluginExtendsInstance ?
					this.options[name] :
					(this.options.plugin || {})[name];

			options = $.extend(true, {element: this.element}, options, pluginOptions);

			// Determine plugin type
			var type =
				((isPluginInstance) ? "instance" :
				(($.isController(plugin)) ? "controller" : "function"));

			// Trigger addPlugin event so controller can decorate the options
			this.trigger("addPlugin", [name, plugin, options, type]);

			var hostname = this.Class.hostname;

			// Subcontrollers should have a way to listen back to host controller
			options["{" + hostname + "}"] = this;

			var pluginInstance;

			switch(type) {

				// Plugin instance
				case "instance":

					pluginInstance = plugin;

					// Update child plugin with custom plugin options from host
					plugin.update(options);

					plugin[hostname] = this;
					break;

				// Plugin controller
				case "controller":
					pluginInstance = options.element.addController(plugin, options);
					break;

				// Plugin function
				case "function":
					pluginInstance = plugin(this, options);
					break;
			}

			// If pluginInstance could not be created, stop.
			if (!pluginInstance) return;

			// Register plugin
			this.pluginInstances[name] = pluginInstance;

			// Also extend instance with a property point to the plugin
			if (this.Class.pluginExtendsInstance) {
				this[name] = pluginInstance;
			}

			// Host controller should also have a way to listen back to the child controller
			if (type!=="function") {

				var hostOptions = {};
				hostOptions["{" + name + "}"] = pluginInstance;

				this.update(hostOptions);
			}

			// Trigger registerPlugin
			this.trigger("registerPlugin", [name, pluginInstance, options, type]);

			return pluginInstance;
		},

		removePlugin: function(name) {

			var plugin = this.getPlugin(name);

			if (!plugin) return;

			// Trigger removePlugin
			this.trigger("removePlugin", [name, plugin]);

			delete this.pluginInstances[name];

			return $.isFunction(plugin.destroy) ? plugin.destroy() : null;
		},

		invokePlugin: function(name, method, args) {

			var plugin = this.getPlugin(name);

			// If plugin not exist, stop.
			if (!plugin) return;

			// If plugin method not exist, stop.
			if (!$.isFunction(plugin[method])) return;

			// Let any third party modify the arguments if required
			this.trigger("invokePlugin", [name, plugin, args]);

			return plugin[method].apply(this, args);
		},

		getMessageGroup: function() {

			// Find parent element
			var messageGroup = ($.isFunction(this.messageGroup)) ? this.messageGroup() : this.element.find("[data-message-group]");

			if (messageGroup.length < 1) {
				messageGroup = $("<div data-message-group></div>").prependTo(this.element);
			}

			return messageGroup;
		},

		setMessage: function(message, type) {

			// Normalize arguments
			var defaultOptions = {
					type   : "warning", // type: info, error, success
					message: "",
					parent : this.getMessageGroup(),
					element: $('<div class="alert fade in"><button type="button" class="close" data-bs-dismiss="alert">×</button></div>')
				},
				userOptions = {},
				isDeferred = $.isDeferred(message);

			// Normalize user options
			if ($.isPlainObject(message) && !isDeferred) {
				userOptions = message;
			} else {
				userOptions = {
					message: message,
					type   : type || "warning"
				}
			}

			var options = $.extend({}, defaultOptions, userOptions),
				element = options.element;

			if ($.isDeferred(message)) {

				var myself = arguments.callee,
					context = this;

				message.done(function(message, type) {
					options.message = message;
					options.type = type || "warning";
					myself.call(context, options);
					element.show();
				});

			} else {

				element
					.addClass("alert-" + options.type)
					.append(options.message);

				if ($('html').has(element).length < 1) {
					element.appendTo(options.parent);
				}
			}

			return element;
		},

		clearMessage: function() {

			this.getMessageGroup().empty();
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

		// !-- FOUNDRY HACK --! //
		// Support for passing event data

		var method = controller[methodName],
			eventData;

		if (isArray(method) && isFunction(method[1])) {
			eventData = method[0];
		}

		return binder(el, event, shifter(controller, methodName), selector, eventData);
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

		for (var i=0; i<controllers.length; i++) {
			var controller = getController(controllers[i]);
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

				// Do not add controller on script node or non-element nodes.
				if (this.nodeType!==1 || this.nodeName=="SCRIPT") return;

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

	// !-- FOUNDRY HACK --! //
	// Add support for augmented selector function on jQuery's DOM traversal/filtering methods.
	(function(){
	var fns = ["children", "closest", "find", "next", "nextAll", "nextUntil", "parent", "parents", "parentsUntil", "prev", "prevAll", "prevUntil", "siblings", "eq", "filter", "first", "has", "is", "last", "not"],
		_fns = {},
		fn;

	while (fn = fns.shift()) {
		_fns[fn] = $.fn[fn];
	    $.fn[fn] = (function(fn) {
	        return function(obj) {
	            return _fns[fn].apply(this, obj.hasOwnProperty("of") ? [obj.selector] : arguments);
	        }
	    })(fn);
	}
	})();

});
