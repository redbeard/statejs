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
        if (options == null) {
            options = {}
        };
        if (this.active) {
            throw ("Can't start state " + this.fullName() + " as it is already active.")
        };
        if ((this.parentState() != null) && (!this.parentState().active))
        {
            options.pathToStart = [ this ];
            this.parentState().start(options);
        }
	
        $(this).log("Starting state '" + this.fullName() + "'");
        //$(options).log("Options for start");
        this.active = true;

        this.persistState();

        this.entry();

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

    persistState: function() {
        persistedState = {};
        persistedState[this.root().name] = this.peristedPath();
        anchorManager.set($.extend(anchorManager.get(), persistedState));
    },

    stop: function() {
        if (!this.active) {
            throw ("Can't stop state " + this.fullName() + " as it isn't active.")
        };
	
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
        if (this.parentState() == null) {
            return this;
        }
		
        return this.parentState().root();
    },

    initialSubstate: function() {
        if (this.subs == null) {
            return null;
        };

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
        return !this.isInitialState() && !this.doNotPersist;
    },

    locate: function(relativePath) {
        if (relativePath.length == 0) {
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

