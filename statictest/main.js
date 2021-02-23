import TestModule from './testmodule.js'

TestModule({
    postRun: function(module) {
        document.write(module.testFunction());
    }
});
