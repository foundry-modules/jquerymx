// load('jquery/buildAll.js')

load('steal/rhino/rhino.js')


// load every plugin in a single app
// get dependency graph
// generate single script

steal('steal/build/pluginify','steal/build/apps','steal/build/scripts').then( function(s){
	var ignore = /\.\w+|test|generate|dist|qunit|fixtures|pages/

	var plugins = [],
		/**
		 * {"path/to/file.js" : ["file2/thing.js", ...]}
		 */
		files = {};

	s.File('jquery').contents(function( name, type, current ) {
		if (type !== 'file' && !ignore.test(name)) {
			var folder = current+"/"+name;
			if(readFile(folder+"/"+name+".js")){
				print(folder);
				plugins.push(folder);
				steal.File(folder).contents(arguments.callee, folder)
			}

			//steal.File(path + "/" + (current ? current + "/" : "") + name).contents(arguments.callee, (current ? current + "/" : "") + name);
		}
	},"jquery");

	// tell it to load all plugins into this page


	//steal.win().build_in_progress = true;
	print("  LOADING APP ")
	steal.build.open('steal/rhino/blank.html', {
			startFiles: plugins
	}, function(opener){

		opener.each('js', function(options, text, stl){
			print(options.rootSrc)
			var dependencies = files[options.rootSrc] = [];
			if(stl.dependencies){
				for (var d = 0; d < stl.dependencies.length; d++) {
					var depend = stl.dependencies[d];
					if (depend.options.rootSrc !== "jquery/jquery.js") {
						dependencies.push(depend.options.rootSrc);
					}
				}
			}
		});

		var toModuleName = function(path) {
			return path.replace(/\/\w+\.js/,"").replace(/\//g,".").replace("jquery.","");
		};

		var excludeModule = "";

		s.File("jquery/dist/modules/mvc").mkdirs();

		//get each file ...
		print("Creating jquery/dist/modules/")

		for (var path in files) {

 			if (path=="jquery/jquery.js") {
				continue;
			}

			var name    = toModuleName(path),
				content = readFile(path),
				deps    = files[path],
				exports = s.build.pluginify.getFunction(content);

			var module = "",
				moduleName = "mvc/" + name;

			// Do not build empty scripts.
			if(typeof exports ==  "undefined") {
				excludeModule += moduleName + ",";
				continue;
			}

			// Translate dependencies
			var moduleDeps = [];
			for (var i in deps) {
				var moduleDep = "mvc/" + toModuleName(deps[i]);

				if (moduleDep == moduleName || excludeModule.indexOf(moduleName) > -1) {
					continue;
				}

				moduleDeps.push(moduleDep);
			}

			var moduleExports  = "var exports = " + exports + "; \n";
				moduleExports += "exports($); \n";
				moduleExports += "module.resolveWith(exports); \n";
				moduleExports += "); \n";

			module += "$.module(" + moduleName + ", function() { \n";
			module += "var module = this; \n";

			if (moduleDeps.length > 0) {

				module += "$.require().script(\"" + moduleDeps.join('","') + "\").done(function() { \n";
				module +=       moduleExports;
				module += "});\n";
			} else {

				module += moduleExports;
			}

			module += "});";

			module = s.build.builders.scripts.clean(module);

			print(" "+moduleName+"");

			s.File("jquery/dist/modules/"+moduleName+".js").save(module);
		}

	})

	/*
	var pageSteal = steal.build.open("steal/rhino/empty.html").steal,
		steals = pageSteal.total,

		files = {},
		depends = function(stl, steals){
			if(stl.dependencies){
				for (var d = 0; d < stl.dependencies.length; d++) {
					var depend = stl.dependencies[d];
					if(!steals[depend.path]){
						steals[depend.path] = true;
						print("123  " + depend.path);
						//depends(depend, steals);
					}


				}
			}
		},
		all = function(c){
			for(var i =0; i < steals.length; i++){
				var pSteal =steals[i];

				if(!pSteal.func){
					c(pSteal)
				}

			}

		};
	print("  LOADED, GETTING DEPENDS");
	all(function(stl){
		files[stl.path] = stl;
	})
	all(function(stl){
		print(stl.path)
		var dependencies = files[stl.path] = [];
		if(stl.dependencies){
			for (var d = 0; d < stl.dependencies.length; d++) {
				var depend = stl.dependencies[d];
				if (depend.path !== "jquery/jquery.js") {
					dependencies.push(depend.path);
				}
			}
		}
	})*/




})
