var root = state({
	name: "Root",
	entry: function() {
		  // You can override shit here!
		  $(this).log("Non-default entry activity for state '" + this.fullName() + "'");
		 },
	
	subs: {
		initial: state({ 
			name: "1",
			subs: {
				initial: state(),
				beta: state()
			} }),
		2: state(),
		3: state()
	}
});

root.start();

// alert( root.locate("1/initial") );
alert( "Current sub of 1: " + root.locate("1").currentSub.fullName() );

