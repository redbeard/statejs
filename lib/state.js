jQuery.fn.log = function(msg, fmt) {
    if (typeof console == 'undefined') {
        return this;
    }
	
    console.log(fmt == null ? "%s %o" : fmt, msg, this);
    return this;
};

State = function(props) {
    $(props).log("Created...");

    result = $.extend(this, props);
    result.wireSubstates();

    return result;
};

state = function(props) {
    return new State(props);
}

var historyManager = {
    previousState: {},
    known: {},

    stack: [],

    register: function(identifier, rootState) {
        this.known[identifier] = rootState;

        $(rootState).log("Registered root state as: " + identifier);
    },

    push: function() {
       this.stack.push($.bbq.getState());
    },

    pop: function() {
       $.bbq.pushState(this.stack.pop());
    },

    _hashChangedStates: function(newState, previousState) {
        difference = {};
        $.each(newState,
            function(key, value) {
                if (value != previousState[key])
                {
                    difference[key] = value;
                }
            });

        return difference;
    },

    _hashChange:  function( event ) {
        try {
            newState = event.getState();

            diffs = historyManager._hashChangedStates(newState, historyManager.previousState);

            $(diffs).log("Difference from previous hash");

            historyManager.previousState = newState;
            historyManager._notifyRestores(diffs);
        }
        catch (e) {
            $(e).log("Error while processing hash change!");
        }
    },

    _notifyRestores: function(diffs) {
        $.each(diffs,
            function(identifier, newState) {
                var rootState = historyManager.known[identifier];

                if (rootState != null) {
                    rootState.hashChanged(newState);
                }
            });
    },

    ignoreNextChangeOfTo: function(key, newState) {
        this.previousState[key] = newState;
    }

};

$(window).bind( 'hashchange', this, historyManager._hashChange);

$.extend(State.prototype, {

    load: function(options) {
        if (options == null) {
            options = {}
        }

        $(this).log("Loaded...");
        historyManager.register(this.name, this);
        
        this.start();
    },

    start: function(options) {
        if (options == null) {
            options = {}
        }
        if (this.active) {
            throw ("Can't start state " + this.fullName() + " as it is already active.")
        }

        try {
            this._startParentState(options);

            $(this).log("Starting state '" + this.fullName() + "'");
            this.active = true;
        
            this.persistState();
            this.entry();
        
            this._startSubstate(options);

        }
        catch (e) {
            $(e).log("Error while starting state: " + this.fullName() + "!");
        }
    },

    hashChanged: function(newState) {
        $(this).log("Notified of restore state to: " + newState);

        this.restoring = true;
        this._depersistState(newState);
        this.restoring = false;
    },

    isRestoring: function() {
        return (this.restoring == true);
    },

    _bindToHashChange: function() {
        $(window).bind( 'hashchange', this, this._hashChange);
    },

    _hashChange:  function( event ) {

        var stateRoot = event.data;
        try {
            var startState = event.getState( stateRoot.name );
            stateRoot._depersistState($.isEmptyObject(startState) ? "" : startState);
        }
        catch (e) {
            $(e).log("Error while processing hash change for " + stateRoot.fullName() + "!");
        }
    },

    _depersistState: function(startState) {
        var depersistedState = this._depersistedState(startState);
        this.currentState().safeTransitionTo(depersistedState);
    },

    _depersistedState: function(compressedStatePath) {
        var targetState = this.locate(compressedStatePath);
        var initialSubstate = null;
        do {
            initialSubstate = targetState.initialSubstate();
            if (initialSubstate != null) {
                targetState = initialSubstate;
            }
        } while (initialSubstate != null);

        return targetState;
    },

    _startParentState: function(options) {
        if ((this.parentState() != null) && (!this.parentState().active))
        {
            options.pathToStart = [ this ];
            this.parentState().start(options);
        }
    },

    _startSubstate: function(options) {
        var initialSub = null;
        if ((options.pathToStart == null) || (options.pathToStart.length == 0)) {
            // If no target sub state provided, go for the initial substate if it exists
            initialSub = this.initialSubstate();
        }
        else {
            initialSub = options.pathToStart.shift();
        }

        if (initialSub != null) {
            initialSub.start(options);
        }
    },

    stop: function() {
        if (!this.active) {
            throw ("Can't stop state " + this.fullName() + " as it isn't active.")
        }
	
        var currentSub = this.currentSub();
        if (currentSub != null) {
            currentSub.stop();
        }
	
        $(this).log("Stopping state '" + this.fullName() + "'");
		
        this.exit();
        this.active = false;
    },

    parentState: function() {
        return null;
    },

    addSubstate: function(state) {
        $(state).log("Wiring state " + state.name + " as child of state " + this.name);
        var me = this;
        state.parentState = function() {
            return me;
        }
    },

    wireSubstates: function() {
        if (this.subs == null) {
            return;
        }

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
        if (this.parentState() == null) {
            return this;
        }
		
        return this.parentState().root();
    },

    initialSubstate: function() {
        if (this.subs == null) {
            return null;
        }

        return this.subs.initial;
    },

    currentSub: function() {
        var result = null;
	
        if (this.subs == null) {
            return null;
        };
	
        $.each(this.subs, function(key, state) {
            if (state.active) {
                result = state;
            }
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

    path: function() {
        return this.fullName();
    },

    persistState: function() {
        var persistedState = $.bbq.getState();
        var persistedPath = this.peristedPath();
        var name = this.root().name;

        historyManager.ignoreNextChangeOfTo(name, persistedPath);
        
        if ($.isEmptyObject(persistedPath)) {
            $.bbq.removeState(name);
        }
        else {
            persistedState[name] =  persistedPath;
            $.bbq.pushState(persistedState);
        }
    },

    peristedPath: function() {
        var statesToRoot = this.statesToRoot();
        statesToRoot.shift();

        while (statesToRoot.length > 0)
        {
            var last = statesToRoot.pop();

            if (last.shouldPersist()) {
                statesToRoot.push(last);
                break;
            }
        }

        var segments = [];
        $.each(statesToRoot, function(index, value) {
            segments.push(value.name);
        });

        return segments.join("/");
    },

    shouldPersist: function() {
        return !this.isInitialState() && !this.root().doNotPersist;
    },

    locate: function(relativePath) {
        if ($.isEmptyObject(relativePath)) {
            return this;
        }
        pathSegments = relativePath.split(/\//);

        return this.locatePath(pathSegments);
    },

    _: function(relativePath) {
        return this.locate(relativePath);
    },

    // A safe transition, which just remains in place if the target state is already active
    safeTransitionTo: function(targetState) {
        if (!targetState.active) {
            this.transitionTo(targetState);
        }
    },

    transitionTo: function(targetState) {
        if (targetState == null) {
            throw ("Can't transition from " + this.fullName() + " as the other state is null.");
        }
        if (targetState == this) {
            throw ("Can't transition from " + this.fullName() + " to itself.");
        }
        if (!this.root().active) {
            throw ("Can't transition from " + this.fullName() + " as it is not active.");
        }
        if (targetState.active) {
            throw("Target state is already active.");
        }

        var pivotPoint = this.pivotPoint(targetState);

        if (pivotPoint.lastCommon == null) {
            throw ("No common ancestor, can't transition between state " + this.fullName() + " and state " + targetState.fullName());
        }
		
        //$(this).log("About to transition from state " + this.fullName() + " to state " + targetState.fullName());
		
        pivotPoint.thisFirstNonCommonAncestor.stop();
        pivotPoint.targetFirstNonCommonAncestor.start( {
            pathToStart: pivotPoint.pathToTargetFromCommonAncestor
        });
    },
	
    pivotPoint: function(targetState) {
        var thisToRoot = this.statesToRoot();
        var targetToRoot = targetState.statesToRoot();
		
        var lastCommon = null;
		
        var thisFirstNonCommonAncestor = thisToRoot.shift();
        var targetFirstNonCommonAncestor = targetToRoot.shift();
		
        while (thisFirstNonCommonAncestor == targetFirstNonCommonAncestor)
        {
            lastCommon = thisFirstNonCommonAncestor;
			
            thisFirstNonCommonAncestor = thisToRoot.shift();
            targetFirstNonCommonAncestor = targetToRoot.shift();
        }
		
        return {
            lastCommon: lastCommon,
            thisFirstNonCommonAncestor: thisFirstNonCommonAncestor,
            targetFirstNonCommonAncestor: targetFirstNonCommonAncestor,
            pathToTargetFromCommonAncestor: targetToRoot
        };
    },

    commonAncestorWith: function(targetState) {
        return this.pivotPoint(targetState).lastCommon;
    },

    statesToRoot: function() {
        if (this.parentState() == null) {
            return [ this ];
        }
        return this.parentState().statesToRoot().concat([ this ]);
    },

    isInitialState: function() {
        if (this.parentState() == null) {
            return true;
        }
        return this.parentState().initialSubstate() == this;
    },

    locatePath: function(pathSegments) {
        if (pathSegments.length == 0) {
            return this;
        }

        firstOnPath = pathSegments[0];
	    
        var result = null;
	
        $.each(this.subs, function(key, state) {
            if (state.name == firstOnPath) {
                result = state.locatePath(pathSegments.slice(1))
            }
        });
		
        return result;
    },
	
    pathSegments: function() {
        if (this.parentState() == null) {
            return [ this.name ];
        }
        return this.parentState().pathSegments().concat([ this.name ]);
    },
	
    entry: function() {
    //$(this).log("Default entry activity for state '" + this.fullName() + "'");
    },

    exit: function() {
    //$(this).log("Default exit activity for state '" + this.fullName() + "'");;
    }
});

