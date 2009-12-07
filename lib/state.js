jQuery.fn.log = function(msg) {
    console.log("%s: %o", msg, this);
    return this;
};

State = function(props) {
    $(props).log("Created");

    result = $.extend(this, props);
    result.wireSubstates();

    return result;
};

state = function(props) {
    return new State(props);
}

$.extend(State.prototype, {

    start: function() {
        $(this).log("Starting state '" + this.fullName() + "'");
        this.entry();

        var initialSub = this.initialSubstate();
        if (initialSub != null) {
			this.currentSub = initialSub;
            initialSub.start();
        }
    },

    stop: function() {
	    if (this.currentSub != null) {
			this.currentSub.stop();
			this.currentSub = null;
	    }
	
		$(this).log("Stopping state '" + this.fullName() + "'");
		this.exit();
    },

    addSubstate: function(state) {
		$(state).log("Wiring state " + state.name + " as child of: " + this.name);
        state.parent = this;
    },

    wireSubstates: function() {
        if (this.subs == null) {
            return;
        };

        var parent = this;
        $.each(this.subs,
        function(key, state) {
            if (state.name == null) {
                state.name = key;
            }

            parent.addSubstate(state);
        });

    },

    initialSubstate: function() {
        if (this.subs == null) {
            return null;
        };

        return this.subs.initial;
    },

    fullName: function() {
        return this.pathSegments().join("/");
    },

	path: function() { return this.fullName(); },

    locate: function(relativePath) {
		if (relativePath.length == 0) { return this; }
		pathSegments = relativePath.split(/\//);

		return this.locatePath(pathSegments);
    },

	commonAncestorOf: function(otherState) {
		var thisToRoot = this.statesToRoot();
		var otherToRoot = otherState.statesToRoot();
		
		var lastCommon = null;
		
		var thisCurrent = thisToRoot.unshift();
		var otherCurrent = otherToRoot.unshift();
		
		while (thisCurrent == otherCurrent) 
		{
			lastCommon = thisCurrent;
			
			thisCurrent = thisToRoot.unshift();
			otherCurrent = otherToRoot.unshift();
		}
		
		return lastCommon;
	}

	statesToRoot: function() {
		if (this.parent == null) { return [ this ]; }
		return this.parent.statesToRoot().concat([ this ]);
	},

    locatePath: function(pathSegments) {
		if (pathSegments.length == 0) { return this; }

		firstOnPath = pathSegments[0];
		alert(firstOnPath);
	    
	    var result = null;
	
	    $.each(this.subs, function(key, state) {
			if (state.name == firstOnPath) { result = state.locatePath(pathSegments.slice(1)) }
		});		
		
		return result;
	},
	
	pathSegments: function() {
		if (this.parent == null) { return [ this.name ]; }
		return this.parent.pathSegments().concat([ this.name ]);
	},
	
    entry: function() {
        $(this).log("Default entry activity for state '" + this.fullName() + "'");
    },
    exit: function() {
        $(this).log("Default exit activity for state '" + this.fullName() + "'");;
    }
});

