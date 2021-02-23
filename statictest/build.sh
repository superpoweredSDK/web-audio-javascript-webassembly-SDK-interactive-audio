echo "Don't forget to run this before using this terminal window:"
echo "source /PATH/TO/emsdk_env.sh --build=Release"
echo
echo "You might need to run this using sudo as well."

em++ --bind \
./main.cpp \
../superpowered.bc \
-I../../SuperpoweredSDK/Superpowered \
-DJSWASM="" \
-flto \
-s WASM=1 \
-s MODULARIZE=1 \
-s SINGLE_FILE=1 \
-s EXPORT_NAME="'TestModule'" \
-O3 -g0 \
-o testmodule.js

# EXPORT_ES6 option does not work as described at
# https://github.com/kripken/emscripten/issues/6284, so we have to
# manually add this by '--post-js' setting when the Emscripten compilation.
echo "export default TestModule;" >> ./testmodule.js
