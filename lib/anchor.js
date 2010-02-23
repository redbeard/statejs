AnchorManager = function() {
    return { 
        _setRawAnchor: function(anchorStr) {
            document.location.hash = ("#" + anchorStr);
        },

        _getRawAnchor: function() {
            if (document.location.hash == null)
            {
                return "";
            }
            return document.location.hash.substr(1);
        },

        _parseAnchorSegment: function(anchorSegment) {
            nameAndStateParts = anchorSegment.split(":");

            var name = nameAndStateParts[0];
            var statePath = nameAndStateParts[1];
            var result = {};

            result[name] = statePath;
            
            return result;
        },

        set: function(stateHash) {
            if (stateHash == null) {
                stateHash = {};
            }
            
            var rootSection = stateHash.root;
            if (rootSection == null) {
                rootSection = "";
            }

            var anchorStr = rootSection;
            $.each(stateHash, function(name, state) {
                if (name != "root") {
                    anchorStr += "," + name + ":" + state;
                }
            });

            this._setRawAnchor(anchorStr);
        },

        get: function() {
            var anchorStr = this._getRawAnchor();
            if ((anchorStr == null) || (anchorStr.length <= 0)) {
                return {};
            }

            var states = anchorStr.split(",");
            var result = { 
                root: states[0]
            };

            for (i = 1; i < states.length; i++) {
                var namedStateHash = this._parseAnchorSegment(states[i]);
                $.extend(result, namedStateHash);
            }

            return result;
        }
    }
};

var anchorManager = new AnchorManager();