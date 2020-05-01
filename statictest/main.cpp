#include "Superpowered.h"
#include "SuperpoweredSimple.h"
#include <emscripten.h>
#include <emscripten/bind.h>

static unsigned int testFunction() {
    Superpowered::Initialize("ExampleLicenseKey-WillExpire-OnNextUpdate", false, false, false, false, false, false, false);
    return Superpowered::Version();
}

EMSCRIPTEN_BINDINGS (TEST) {
    emscripten::function("testFunction", &testFunction);
}
