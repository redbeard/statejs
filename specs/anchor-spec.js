var banker, account;

mockedAnchor = mimic(new AnchorManager());
anchor = new AnchorManager();

Screw.Unit(function() {
    describe('AnchorManager', function() {
        describe('#set', function() {
            describe('with an empty hash', function() {
                it('should set an empty anchor', function() {
                    given.mockedAnchor.should("_setRawAnchor").using("");
                    anchor.set.apply(mockedAnchor, [ {} ]);
                });
            });

            describe('with a null hash', function() {
                it('should set an empty anchor', function() {
                    given.mockedAnchor.should("_setRawAnchor").using("");
                    anchor.set.apply(mockedAnchor, [ null ]);
                });
            });

            describe('with an root only hash', function() {
                it('should set a state only anchor', function() {
                    given.mockedAnchor.should("_setRawAnchor").using("state1/state2");
                    anchor.set.apply(mockedAnchor, [ { root: "state1/state2"} ]);
                });
            });

            describe('with an named only hash', function() {
                it('should set a state only anchor', function() {
                    given.mockedAnchor.should("_setRawAnchor").using(",tabs1:state1/state2");
                    anchor.set.apply(mockedAnchor, [ { tabs1: "state1/state2"} ]);
                });
            });

            describe('with a root and  named state hash', function() {
                it('should set a full spec anchor', function() {
                    given.mockedAnchor.should("_setRawAnchor").using("state1/state2,tabs1:state1/state2");
                    anchor.set.apply(mockedAnchor, [ { root: "state1/state2", tabs1: "state1/state2"} ]);
                });
            });
        });

        describe('#get', function() {
            describe('with an empty anchor', function() {
                it('should return an empty hash', function() {
                    given.mockedAnchor.should("_getRawAnchor").andReturn("");
                    then.expect(anchor.get.apply(mockedAnchor, null)).to(equal, { });
                });
            });

            describe('with a null anchor', function() {
                it('should return an empty hash', function() {
                    given.mockedAnchor.should("_getRawAnchor").andReturn(null);
                    then.expect(anchor.get.apply(mockedAnchor, null)).to(equal, { });
                });
            });

            describe('with only a root state', function() {
                it('should return a hash mapping root to the state name', function() {
                    given.mockedAnchor.should("_getRawAnchor").andReturn("state1/substate2/sub2");
                    then.expect(anchor.get.apply(mockedAnchor, null)).to(equal, {
                        root: "state1/substate2/sub2"
                    });
                });
            });

            describe('with both a root state and a named state', function() {
                it('should return a hash mapping correctly to the state path', function() {
                    given.mockedAnchor.should("_getRawAnchor").andReturn("state1/substate2,tabs:tab1/expanded");
                    given.mockedAnchor.should("_parseAnchorSegment").using("tabs:tab1/expanded").andReturn(anchor._parseAnchorSegment("tabs:tab1/expanded"));
                    then.expect(anchor.get.apply(mockedAnchor, null)).to(equal, {
                        root: "state1/substate2",
                        tabs: "tab1/expanded"
                    });
                });
            });
        });
    });
});