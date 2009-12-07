jQuery.fn.log = function(msg, fmt) {
	if (typeof console == 'undefined') {
		return this;
	}
	
	console.log(fmt == null ? "%s %o" : fmt, msg, this);
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

    start: function(options) {
		if (options == null) { options = {} };
	    if (this.active) { throw ("Can't start state " + this.fullName() + "as it is already active.") };	
		if ((this.parent != null) && (!this.parent.active))
		{
			this.parent.start({ targetSub: this });
		}
	
        $(this).log("Starting state '" + this.fullName() + "'");
		this.active = true;
        this.entry();

		if (options.targetSub == null) { 
			// If no target sub state provided, go for the initial substate if it exists	
	        var initialSub = this.initialSubstate();
	        if (initialSub != null) {
	            initialSub.start();
	        }
		}
    },

    stop: function() {
	    if (!this.active) { throw ("Can't stop state " + this.fullName() + "as it isn't active.") };
	
	    var currentSub = this.currentSub();
	    if (currentSub != null) {
			currentSub.stop();
	    }
	
		$(this).log("Stopping state '" + this.fullName() + "'");
		
		this.exit();
		this.active = false;
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

	root: function () {
		if (this.parent == null) { return this; }
		
		return this.parent.root();
	},

    initialSubstate: function() {
        if (this.subs == null) {
            return null;
        };

        return this.subs.initial;
    },

	currentSub: function() {
	    var result = null;
	
	    if (this.subs == null) { return null; };
	
	    $.each(this.subs, function(key, state) {
			if (state.active) { result = state; }
		});		
		
		return result;		
	},

	currentState: function() {
		var currentSub = this.currentSub();
		if (currentSub != null) {
			return currentSub.currentState();
		}
		
		return this;
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

	transitionTo: function(otherState) {
		if (otherState == null) { throw ("Other state is null."); }
		if (otherState == this) { throw ("Can't transition to self."); }
		if (!this.root().active) { 
			throw ("Can't transition from " + this.fullName() + " as it is not active."); 
		}
		
		var junctionPoints = this.junctionPoints(otherState);

		if (junctionPoints.lastCommon == null) { 
			throw ("No common ancestor, can't transition between state " + this.fullName() + " and state " + otherState.fullName());
		}
		
		$(this).log("About to transition from state " + this.fullName() + " to state " + otherState.fullName());
		
		junctionPoints.thisFirstNonCommonAncestor.stop();
		otherState.start();
	},
	
	junctionPoints: function(otherState) {
		var thisToRoot = this.statesToRoot();
		var otherToRoot = otherState.statesToRoot();
		
		var lastCommon = null;
		
		var thisFirstNonCommonAncestor = thisToRoot.shift();
		var otherFirstNonCommonAncestor = otherToRoot.shift();
		
		while (thisFirstNonCommonAncestor == otherFirstNonCommonAncestor) 
		{
			lastCommon = thisFirstNonCommonAncestor;
			
			thisFirstNonCommonAncestor = thisToRoot.shift();
			otherFirstNonCommonAncestor = otherToRoot.shift();
		}
		
		return { 
			lastCommon: lastCommon, 
			thisFirstNonCommonAncestor: thisFirstNonCommonAncestor, 
			otherFirstNonCommonAncestor: otherFirstNonCommonAncestor };		
	},

	commonAncestorWith: function(otherState) {
		return this.junctionPoints(otherState).lastCommon;
	},

	statesToRoot: function() {
		if (this.parent == null) { return [ this ]; }
		return this.parent.statesToRoot().concat([ this ]);
	},

    locatePath: function(pathSegments) {
		if (pathSegments.length == 0) { return this; }

		firstOnPath = pathSegments[0];
	    
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

