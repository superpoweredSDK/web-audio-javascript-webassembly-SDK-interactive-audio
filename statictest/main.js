import TestModule from './testmodule.js'

var test = TestModule({
    postRun: function() {
        document.write(test.testFunction());
    }
});
