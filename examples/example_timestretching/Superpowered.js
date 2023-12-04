/* eslint-disable */

class SuperpoweredGlue {

    static wasmCDNUrl = "https://www.unpkg.com/@superpoweredsdk/web@2.6.4/dist/superpowered-npm.wasm"

    niceSize(bytes) {
        if (bytes == 0) return '0 byte'; else if (bytes == 1) return '1 byte';
        const postfix = [ ' bytes', ' kb', ' mb', ' gb', ' tb' ], n = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, n), 2) + postfix[n];
    }
    
    createFloatArray(length) {
        return this.createViewFromType(9, this.malloc(length * 4), length);
    }
    
    static async Instantiate(licenseKey, wasmUrl = SuperpoweredGlue.wasmCDNUrl) {
        SuperpoweredGlue.wasmCDNUrl = wasmUrl;
        const obj = new SuperpoweredGlue();
        await fetch(wasmUrl).then(response => response.arrayBuffer() ).then(bytes => obj.loadFromArrayBuffer(bytes) );
        obj.Initialize(licenseKey);
        return obj;
    }
    
    constructor() {
        this.id = Math.floor(Math.random() * Date.now());
        this.linearMemory = null;
        this.__lastObject__ = null;
        this.__classUnderConstruction__ = null;
        this.__functions__ = {};
        this.__classes__ = {};
        this.__exportsToWasm__ = {};
        this.__views__ = new Set();
        this.trackLoaderReceivers = [];
    
        const glue = this;
        this.Uint8Buffer = class { constructor(length) { return glue.createViewFromType(1, glue.malloc(length), length); } }
        this.Int8Buffer = class { constructor(length) { return glue.createViewFromType(2, glue.malloc(length), length); } }
        this.Uint16Buffer = class { constructor(length) { return glue.createViewFromType(3, glue.malloc(length * 2), length); } }
        this.Int16Buffer = class { constructor(length) { return glue.createViewFromType(4, glue.malloc(length * 2), length); } }
        this.Uint32Buffer = class { constructor(length) { return glue.createViewFromType(5, glue.malloc(length * 4), length); } }
        this.Int32Buffer = class { constructor(length) { return glue.createViewFromType(6, glue.malloc(length * 4), length); } }
        this.BigUint64Buffer = class { constructor(length) { return glue.createViewFromType(7, glue.malloc(length * 8), length); } }
        this.BigInt64Buffer = class { constructor(length) { return glue.createViewFromType(8, glue.malloc(length * 8), length); } }
        this.Float32Buffer = class { constructor(length) { return glue.createViewFromType(9, glue.malloc(length * 4), length); } }
        this.Float64Buffer = class { constructor(length) { return glue.createViewFromType(10, glue.malloc(length * 8), length); } }
    
        this.__exportsToWasm__.consolelog = this.consolelog.bind(this);
        this.__exportsToWasm__.emscripten_notify_memory_growth = this.onMemoryGrowth.bind(this);
    
        this.__exportsToWasm__.__createClass__ = this.createClass.bind(this);
        this.__exportsToWasm__.__createStaticProperty__ = this.createStaticProperty.bind(this);
        this.__exportsToWasm__.__createStaticMethod__ = this.createStaticMethod.bind(this);
        this.__exportsToWasm__.__createConstructor__ = this.createConstructor.bind(this);
        this.__exportsToWasm__.__createDestructor__ = this.createDestructor.bind(this);
        this.__exportsToWasm__.__createProperty__ = this.createProperty.bind(this);
        this.__exportsToWasm__.__createMethod__ = this.createMethod.bind(this);
        this.__exportsToWasm__.__createFunction__ = this.createFunction.bind(this);
        this.__exportsToWasm__.__createClassConstant__ = this.createClassConstant.bind(this);
        this.__exportsToWasm__.__createConstant__ = this.createConstant.bind(this);
        this.__exportsToWasm__.__runjs__ = function(pointer) {
            return eval(this.toString(pointer));
        }.bind(this);
    
        this.__exportsToWasm__.abs = function(value) { return Math.abs(value); }
        this.__exportsToWasm__.round = function(value) { return Math.round(value); }
        this.__exportsToWasm__.roundf = function(value) { return Math.fround(value); }
    
        this.wasi = {
            proc_exit: function() { console.log('abort'); },
        };
    }
    
    updateBuffer(buffer, arraybuffer) {
        buffer.__arraybuffer__ = arraybuffer;
        switch (buffer.__type__) {
            case 1: buffer.array = new Uint8Array(buffer.__arraybuffer__, buffer.pointer, (buffer.length < 0) ? (buffer.__arraybuffer__.byteLength - buffer.pointer) : buffer.length); break;
            case 2: buffer.array = new Int8Array(buffer.__arraybuffer__, buffer.pointer, (buffer.length < 0) ? (buffer.__arraybuffer__.byteLength - buffer.pointer) : buffer.length); break;
            case 3: buffer.array = new Uint16Array(buffer.__arraybuffer__, buffer.pointer, (buffer.length < 0) ? (buffer.__arraybuffer__.byteLength - buffer.pointer) / 2 : buffer.length); break;
            case 4: buffer.array = new Int16Array(buffer.__arraybuffer__, buffer.pointer, (buffer.length < 0) ? (buffer.__arraybuffer__.byteLength - buffer.pointer) / 2 : buffer.length); break;
            case 5: buffer.array = new Uint32Array(buffer.__arraybuffer__, buffer.pointer, (buffer.length < 0) ? (buffer.__arraybuffer__.byteLength - buffer.pointer) / 4 : buffer.length); break;
            case 6: buffer.array = new Int32Array(buffer.__arraybuffer__, buffer.pointer, (buffer.length < 0) ? (buffer.__arraybuffer__.byteLength - buffer.pointer) / 4 : buffer.length); break;
            case 7: buffer.array = new BigUint64Array(buffer.__arraybuffer__, buffer.pointer, (buffer.length < 0) ? (buffer.__arraybuffer__.byteLength - buffer.pointer) / 8 : buffer.length); break;
            case 8: buffer.array = new BigInt64Array(buffer.__arraybuffer__, buffer.pointer, (buffer.length < 0) ? (buffer.__arraybuffer__.byteLength - buffer.pointer) / 8 : buffer.length); break;
            case 9: buffer.array = new Float32Array(buffer.__arraybuffer__, buffer.pointer, (buffer.length < 0) ? (buffer.__arraybuffer__.byteLength - buffer.pointer) / 4 : buffer.length); break;
            case 10: buffer.array = new Float64Array(buffer.__arraybuffer__, buffer.pointer, (buffer.length < 0) ? (buffer.__arraybuffer__.byteLength - buffer.pointer) / 8 : buffer.length); break;
        }
    }
    
    createViewFromType(type, pointer, length) {
        const buffer = {
            pointer: pointer,
            length: length,
            __arraybuffer__: this.linearMemory,
            __type__: type,
            __glue__: this,
            free() {
                this.__glue__.free(this.pointer);
                Object.getOwnPropertyNames(this).forEach((property) => delete this[property] );
                Object.setPrototypeOf(this, null);
            }
        };
        this.updateBuffer(buffer, this.linearMemory);
        this.__views__.add(buffer);
        return buffer;
    }
    
    returnPointerToView(r, type) {
        if ((type > 0) && (typeof r !== 'undefined')) {
            const length = this.__functions__.__lastarraylength__();
            r = this.createViewFromType(type, r, length > 0 ? length : -1);
        }
        return r;
    }
    
    invokeMethod() {
        if ((arguments.length == 2) && (typeof arguments[1] == 'object')) {
            const obj = arguments[1]; let n = 1;
            for (const m in obj) arguments[n++] = obj[m];
            arguments.length = n;
        }
        const strings = [];
        for (let index = arguments.length - 1; index > 0; index--) {
            if (arguments[index].array != undefined) arguments[index] = arguments[index].array.byteOffset;
            else if (arguments[index].__pointer__ != undefined) arguments[index] = arguments[index].__pointer__;
            else if (typeof arguments[index] == 'string') {
                arguments[index] = this.__glue__.toWASMString(arguments[index]);
                strings.push(arguments[index]);
            }
        }
        const info = arguments[0];
        arguments[0] = this.__pointer__;
        let r = info.function.apply(this, arguments);
        for (const string of strings) this.__glue__.free(string);
        r = this.__glue__.returnPointerToView(r, info.returnPointerType);
        return r;
    }
    
    invokeFunction() {
        if ((arguments.length == 1) && (typeof arguments[0] == 'object')) {
            const obj = arguments[0]; let n = 0;
            for (const m in obj) arguments[n++] = obj[m];
            arguments.length = n;
        }
        const strings = [];
        for (let index = arguments.length - 1; index >= 0; index--) {
            if (arguments[index].array != undefined) arguments[index] = arguments[index].array.byteOffset;
            else if (arguments[index].__pointer__ != undefined) arguments[index] = arguments[index].__pointer__;
            else if (typeof arguments[index] == 'string') {
                arguments[index] = this.glue.toWASMString(arguments[index]);
                strings.push(arguments[index]);
            }
        }
        let r = this.apply(this, arguments);
        for (const string of strings) this.glue.free(string);
        r = this.glue.returnPointerToView(r, this.returnPointerType);
        return r;
    }
    
    invokeExportedFunction() {
        let r = this.apply(this, arguments);
        if (r.array !== undefined) r = r.array.byteOffset;
        return r;
    }
    
    createClass(classnamePointer, classnameLen, sizeofClass) {
        const glue = this, classname = glue.toString(classnamePointer, classnameLen);
        const WASM = class {
            constructor() {
                const meta = Object.getPrototypeOf(this).constructor.__meta__;
                if (!meta.hasConstructor) throw meta.name + ' has no constructor';
    
                this.__class__ = meta.name;
                this.__prev__ = glue.__lastObject__;
                if (glue.__lastObject__ != null) glue.__lastObject__.__next__ = this;
                this.__next__ = null;
                this.__glue__ = glue;
                glue.__lastObject__ = this;
    
                const args = [].slice.call(arguments);
                args.unshift(glue.malloc(meta.size));
                this.__pointer__ = glue[meta.name + '::' + meta.name].apply(null, args);
    
                for (const property of meta.properties) glue.createPropertyFromDescriptor(this, property);
                for (const method of meta.methods) this[method.name] = glue.invokeMethod.bind(this, { function: glue[method.wasmFunction], returnPointerType: method.returnPointerType });
            }
            destruct() {
                const meta = Object.getPrototypeOf(this).constructor.__meta__;
                if (meta.hasDestructor) glue[meta.name + '::~' + meta.name](this.__pointer__);
                glue.free(this.__pointer__);
                if (this.__prev__ != null) this.__prev__.__next__ = this.__next__;
                if (this.__next__ != null) this.__next__.__prev__ = this.__prev__;
                Object.getOwnPropertyNames(this).forEach((property) => delete this[property] );
                Object.setPrototypeOf(this, null);
            }
        }
        glue.__classUnderConstruction__ = glue.__classes__[classname] = glue[classname] = WASM;
        glue.__classUnderConstruction__.__meta__ = {
            name: classname,
            size: sizeofClass,
            hasConstructor: false,
            hasDestructor: false,
            properties: [],
            methods: [],
            staticProperties: []
        }
        delete glue.__functionsWithNamespace__[classname];
    }
    
    createConstructor() {
        this.__classUnderConstruction__.__meta__.hasConstructor = true;
    }
    
    createDestructor() {
        this.__classUnderConstruction__.__meta__.hasDestructor = this.__classUnderConstruction__.__meta__.hasConstructor;
    }
    
    createClassConstant(nameptr, namelen, value) {
        this.__classUnderConstruction__[this.toString(nameptr, namelen)] = value;
    }
    
    createConstant(nameptr, namelen, value) {
        this[this.toString(nameptr, namelen)] = value;
    }
    
    createPropertyFromDescriptor(object, descriptor) {
        const buffer = this.createViewFromType(descriptor.viewType, object.__pointer__ + descriptor.offset, descriptor.viewLength);
        if (descriptor.viewLength > 1) Object.defineProperty(object, descriptor.name, {
            get: function() { return buffer.array; },
            set: function(value) { buffer.array[index] = value; },
            configurable: true,
            enumerable: true
        }); else Object.defineProperty(object, descriptor.name, {
            get: function() { return buffer.array[0]; },
            set: function(value) { buffer.array[0] = value; },
            configurable: true,
            enumerable: true
        });
    }
    
    createProperty(propertynamePointer, propertynameLen, offset, viewType, viewLength) {
        this.__classUnderConstruction__.__meta__.properties.push({
            name: this.toString(propertynamePointer, propertynameLen),
            offset: offset,
            viewType: viewType, 
            viewLength: viewLength 
        });
    }
    
    createStaticPropertyFromDescriptor(wasmClass, descriptor) {
        const buffer = this.createViewFromType(descriptor.viewType, descriptor.pointer, descriptor.viewLength);
        if (descriptor.viewLength > 1) Object.defineProperty(wasmClass, descriptor.name, {
            get: function() { return buffer.array; },
            set: function(value) { buffer.array[index] = value; },
            configurable: true,
            enumerable: true
        }); else Object.defineProperty(wasmClass, descriptor.name, {
            get: function() { return buffer.array[0]; },
            set: function(value) { buffer.array[0] = value; },
            configurable: true,
            enumerable: true
        });
    }
    
    createStaticProperty(propertynamePointer, propertynameLen, pointer, viewType, viewLength) {
        const descriptor = { 
            name: this.toString(propertynamePointer, propertynameLen), 
            pointer: pointer,
            viewType: viewType,
            viewLength: viewLength
        };
        this.__classUnderConstruction__.__meta__.staticProperties.push(descriptor);
        this.createStaticPropertyFromDescriptor(this.__classUnderConstruction__, descriptor);
    }
    
    createMethod(methodnamePointer, methodnameLen, returnPointerType) {
        const methodname = this.toString(methodnamePointer, methodnameLen);
        this.__classUnderConstruction__.__meta__.methods.push({ 
            name: methodname,
            wasmFunction: this.__classUnderConstruction__.__meta__.name + '::' + methodname,
            returnPointerType: returnPointerType
        });
    }
    
    createStaticMethod(methodnamePointer, methodnameLen, returnPointerType) {
        const methodname = this.toString(methodnamePointer, methodnameLen), wasmMethodname = this.__classUnderConstruction__.__meta__.name + '::' + methodname;
        this[wasmMethodname].returnPointerType = returnPointerType;
        this[wasmMethodname].glue = this;
        this.__classUnderConstruction__[methodname] = this.invokeFunction.bind(this[wasmMethodname]);
    }
    
    createFunction(methodnamePointer, methodnameLen, returnPointerType) {
        const methodname = this.toString(methodnamePointer, methodnameLen);
        if (!this[methodname]) { // maybe this function is in a namespace
            for (const namespace in this.__functionsWithNamespace__) {
                if (this.__functionsWithNamespace__[namespace][methodname]) {
                    this[methodname] = this.__functionsWithNamespace__[namespace][methodname];
                    delete this.__functionsWithNamespace__[namespace][methodname];
                    break;
                }
            }
            if (!this[methodname]) return;
        }
        this[methodname].returnPointerType = returnPointerType;
        this[methodname].glue = this;
        this[methodname] = this.invokeFunction.bind(this[methodname]);
    }
    
    exportToWasm(functionName, f) {
        this.__exportsToWasm__[functionName] = this.invokeExportedFunction.bind(f);
    }
    
    onMemoryGrowth(n) {
        this.linearMemory = this.wasmInstance.exports.memory.buffer;
        if (this.__memorygrowview__.buffer.byteLength < 1) this.updateMemoryViews();
        this.logMemory();
    }
    
    consolelog(pointer, strlen) {
        console.log(this.toString(pointer, strlen));
    }
    
    setInstance(wasmInstance) {
        this.wasmInstance = wasmInstance;
        this.wasmInstance.exports._initialize();
    
        this.__functions__ = this.wasmInstance.exports;
        this.linearMemory = this.wasmInstance.exports.memory.buffer;
        this.__memorygrowpointer__ = this.__functions__.__malloc__(16);
        this.__memorygrowview__ = new Uint8Array(this.linearMemory, this.__memorygrowpointer__, 16);
        this.__functionsWithNamespace__ = {};
    
        const outputBuffer = this.__functions__.__malloc__(1024), stringview = new Uint8Array(this.linearMemory, this.__functions__.__malloc__(1024), 1024);
        for (const f in this.__functions__) if (f != '__demangle__') {
            const length = this.__functions__.__demangle__(this.toWASMString(f, stringview), outputBuffer);
            if (length > 0) {
                let name = this.toString(outputBuffer, length);
                const par = name.indexOf('(');
                if (par > 0) name = name.substring(0, par);

                let namespace = name.lastIndexOf('::');
                if (namespace > 0) {
                    namespace = name.lastIndexOf('::', namespace - 1);
                    if (namespace > 0) name = name.substr(namespace + 2);
                }

                // class members have namespaces removed from this point, but functions not
                const split = name.split('::', 2);
                if (split.length == 2) {
                    if (!this.__functionsWithNamespace__[split[0]]) this.__functionsWithNamespace__[split[0]] = {};
                    this.__functionsWithNamespace__[split[0]][split[1]] = this.__functions__[f];
                }

                this[name] = this.__functions__[f];
            } else this[f] = this.__functions__[f];
        }
        this.free(outputBuffer);
        this.free(stringview.byteOffset);
    
        this.__functions__.__initialize__();
        delete this.__functionsWithNamespace__;
        this.logMemory();
        this.__classUnderConstruction__ = null;
    }
    
    async loadFromArrayBuffer(wasmCode, afterWASMLoaded = null) {
        this.wasmCode = wasmCode;
        await WebAssembly.instantiate(wasmCode, {
            wasi_snapshot_preview1: this.wasi,
            env: this.__exportsToWasm__,
        }).then((_module) => {
            this.setInstance(_module.instance);
            if (afterWASMLoaded != null) afterWASMLoaded.afterWASMLoaded();
        });
    }

    async loadFromModule(module) {
        await WebAssembly.instantiate(module, {
            wasi_snapshot_preview1: this.wasi,
            env: this.__exportsToWasm__,
        }).then((instance) => {
            this.setInstance(instance);
        });
    }

    async loadFromURL(url, storeCode = true) {
        if (WebAssembly.instantiateStreaming) {
            await WebAssembly.instantiateStreaming(fetch(url), {
                wasi_snapshot_preview1: this.wasi,
                env: this.__exportsToWasm__,
            }).then((_module) => {
                this.setInstance(_module.instance);
            });
            if (storeCode) {
                const wasmResponse = await fetch(url);
                this.wasmCode = await wasmResponse.arrayBuffer();
            }
        }
        else {
            const response = await fetch(url);
            const wasmCode = await response.arrayBuffer();
            if (storeCode) {
                this.wasmCode = wasmCode;
            }
            await WebAssembly.instantiate(wasmCode, {
                wasi_snapshot_preview1: this.wasi,
                env: this.__exportsToWasm__,
            }).then((_module) => {
                this.setInstance(_module.instance);
            });
        }
    }

    toString(pointer, strlen = 0) {
        let view = null;
        if (strlen < 1) {
            const viewLength = Math.min(16384, this.linearMemory.byteLength - pointer);
            view = new Uint8Array(this.linearMemory, pointer, viewLength);
            for (strlen = 0; strlen < viewLength; strlen++) if (view[strlen] == 0) break;
        } else view = new Uint8Array(this.linearMemory, pointer, strlen);
    
        let str = '', i = 0, bytesNeeded, codePoint;
        while (i < strlen) {
            const octet = view[i];
            bytesNeeded = codePoint = 0;
    
            if (octet <= 0x7f) {
                bytesNeeded = 0;
                codePoint = octet & 0xff;
            } else if (octet <= 0xdf) {
                bytesNeeded = 1;
                codePoint = octet & 0x1f;
            } else if (octet <= 0xef) {
                bytesNeeded = 2;
                codePoint = octet & 0x0f;
            } else if (octet <= 0xf4) {
                bytesNeeded = 3;
                codePoint = octet & 0x07;
            }
    
            if (strlen - i - bytesNeeded > 0) {
                for (let k = 0; k < bytesNeeded; k++) codePoint = (codePoint << 6) | (view[i + k + 1] & 0x3f);
            } else {
                codePoint = 0xfffd;
                bytesNeeded = strlen - i;
            }
    
            str += String.fromCodePoint(codePoint);
            i += bytesNeeded + 1;
        }
        return str;
    }
    
    toWASMString(str, view = null) {
        const length = str.length, maxBytes = length * 4 + 1;
        let i = 0, c, bits, destination = 0;
        if (view == null) {
            const pointer = this.malloc(maxBytes);
            view = new Uint8Array(this.linearMemory, pointer, maxBytes);
        }
        while (i < length) {
            const codePoint = str.codePointAt(i);
            c = bits = 0;
    
            if (codePoint <= 0x0000007f) {
                c = 0;
                bits = 0x00;
            } else if (codePoint <= 0x000007ff) {
                c = 6;
                bits = 0xc0;
            } else if (codePoint <= 0x0000ffff) {
                c = 12;
                bits = 0xe0;
            } else if (codePoint <= 0x001fffff) {
                c = 18;
                bits = 0xf0;
            }
    
            view[destination++] = bits | (codePoint >> c);
            c -= 6;
            while (c >= 0) {
                view[destination++] = 0x80 | ((codePoint >> c) & 0x3f);
                c -= 6;
            }
            i += (codePoint >= 0x10000) ? 2 : 1;
        }
    
        view[destination] = 0;
        return view.byteOffset;
    }
    
    logMemory() {
        console.log('WASM memory ' + this.id + ': ' + this.niceSize(this.__functions__.__stacksize__()) + ' stack, ' + this.niceSize(this.linearMemory.byteLength - this.__functions__.__heapbase__()) + ' heap, ' + this.niceSize(this.linearMemory.byteLength) + ' total.');
    }
    
    malloc(bytes) {
        const pointer = this.__functions__.__malloc__(bytes);
        if (this.__memorygrowview__.buffer.byteLength < 1) this.updateMemoryViews();
        return pointer;
    }
    
    updateMemoryViews() {
        for (const buffer of this.__views__) this.updateBuffer(buffer, this.linearMemory);
        this.__memorygrowview__ = new Uint8Array(this.linearMemory, this.__memorygrowpointer__, 16);
    }
    
    free(pointer) {
        this.__functions__.__free__(pointer);
    }
    
    setInt64(pointer, index, value) {
        this.__functions__.__setint64__(pointer, index, value);
    }
    
    bufferToWASM(buffer, input, index) {
        let inBufferL = null, inBufferR = null;
        if (index === undefined) index = 0;
        if (typeof input.getChannelData === 'function') {
            inBufferL = input.getChannelData(0);
            inBufferR = input.getChannelData(1);
        } else {
            inBufferL = input[index][0];
            inBufferR = input[index][1];
        }
        const arr = (buffer.constructor === Array) ? buffer[index].array : buffer.array, to = arr.length;
        for (let n = 0, i = 0; n < to; n++, i++) {
            arr[n++] = inBufferL[i];
            arr[n] = inBufferR[i];
        }
    }
    
    bufferToJS(buffer, output, index) {
        let outBufferL = null, outBufferR = null;
        if (index === undefined) index = 0;
        if (typeof output.getChannelData === 'function') {
            outBufferL = output.getChannelData(0);
            outBufferR = output.getChannelData(1);
        } else {
            outBufferL = output[index][0];
            outBufferR = output[index][1];
        }
        const arr = (buffer.constructor === Array) ? buffer[index].array : buffer.array, to = arr.length;
        for (let n = 0, i = 0; n < to; n++, i++) {
            outBufferL[i] = arr[n++];
            outBufferR[i] = arr[n];
        }
    }
    
    arrayBufferToWASM(arrayBuffer, offset = 0) {
        const pointer = this.malloc(arrayBuffer.byteLength + offset);
        new Uint8Array(this.linearMemory).set(new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength), pointer + offset);
        return pointer;
    }
    
    copyWASMToArrayBuffer(pointer, lengthBytes) {
        const arrayBuffer = new ArrayBuffer(lengthBytes);
        new Uint8Array(arrayBuffer, 0, lengthBytes).set(new Uint8Array(this.linearMemory, pointer, lengthBytes));
        return arrayBuffer;
    }
    
    moveWASMToArrayBuffer(pointer, lengthBytes) {
        const arrayBuffer = this.copyWASMToArrayBuffer(pointer, lengthBytes);
        this.free(pointer);
        return arrayBuffer;
    }
    
    static async loaderWorkerMain(url) {
        SuperpoweredGlue.__uint_max__sp__ = 255;
        const Superpowered = await SuperpoweredGlue.Instantiate('');
    
        await fetch(url).then(response =>
            response.arrayBuffer()
        ).then(audiofileArrayBuffer => {
            // Copy the ArrayBuffer to WebAssembly Linear Memory.
            const audiofileInWASMHeap = Superpowered.arrayBufferToWASM(audiofileArrayBuffer);
    
            // Decode the entire file into the Audio In Memory format.
            const audioInMemoryFormat = Superpowered.Decoder.decodeToAudioInMemory(audiofileInWASMHeap, audiofileArrayBuffer.byteLength);
    
            // Copy from the WebAssembly heap into a regular ArrayBuffer that can be transfered.
            // Size calculation:  48 bytes (main table is six 64-bit numbers), plus number of audio frames (.getSize) multiplied by four (16-bit stereo is 4 bytes).
            const arrayBuffer = Superpowered.moveWASMToArrayBuffer(audioInMemoryFormat, 48 + Superpowered.AudioInMemory.getSize(audioInMemoryFormat) * 4);
    
            // Transfer the ArrayBuffer.
            if (typeof self.transfer !== 'undefined') self.transfer(url, arrayBuffer);
            else postMessage({ '__transfer__': arrayBuffer, }, [ arrayBuffer ]);
        });
    }
    
    static loaderWorkerOnmessage(message) {
        if (typeof message.data.load === 'string') SuperpoweredGlue.loaderWorkerMain(message.data.load);
    }
    
    registerTrackLoader(receiver) {
        if (typeof receiver.terminate !== 'undefined') receiver.addEventListener('message', this.handleTrackLoaderMessage); // Worker
        return this.trackLoaderReceivers.push((typeof receiver.port !== 'undefined') ? receiver.port : receiver) - 1;
    }
    
    handleTrackLoaderMessage(message) {
        if (typeof message.data.SuperpoweredLoad !== 'string') return false;
        this.loadTrackInWorker(message.data.SuperpoweredLoad, message.data.trackLoaderID);
        return true;
    }
    
    async loadTrackInWorker(url, trackLoaderID) {
        let source = SuperpoweredGlue.toString();
    
        const trackLoaderWorker = new Worker(URL.createObjectURL(new Blob([ source + "\r\n\r\nonmessage = SuperpoweredGlue.loaderWorkerOnmessage;" + `\r\n\r\nSuperpoweredGlue.wasmCDNUrl = "${SuperpoweredGlue.wasmCDNUrl}";` ], { type: 'application/javascript' })));
        trackLoaderWorker.__url__ = url;
        trackLoaderWorker.trackLoaderID = trackLoaderID;
    
        trackLoaderWorker.ontransfer = function(message) { 
            this.transferLoadedTrack(message.transfer, trackLoaderWorker);
        }.bind(this);
    
        trackLoaderWorker.onmessage = function(message) { 
            this.transferLoadedTrack(message.data.__transfer__, trackLoaderWorker);
        }.bind(this);
    
        if ((typeof window !== 'undefined') && (typeof window.location !== 'undefined') && (typeof window.location.origin !== 'undefined')) url = new URL(url, window.location.origin).toString();
        trackLoaderWorker.postMessage({ load: url });
    }
    
    transferLoadedTrack(arrayBuffer, trackLoaderWorker) {
        const receiver = this.trackLoaderReceivers[trackLoaderWorker.trackLoaderID]; 
        if (receiver == null) return;
        if (typeof receiver.postMessage === 'function') receiver.postMessage({ SuperpoweredLoaded: { buffer: arrayBuffer, url: trackLoaderWorker.__url__ }}, [ arrayBuffer ]);
        else receiver({ SuperpoweredLoaded: { buffer: arrayBuffer, url: trackLoaderWorker.__url__ }});
        trackLoaderWorker.terminate();
    }
    
    downloadAndDecode(url, obj) {
        if (obj.trackLoaderID === undefined) return;
        if ((typeof obj.onMessageFromMainScope === 'function') && (typeof obj.sendMessageToMainScope === 'function')) obj.sendMessageToMainScope({ SuperpoweredLoad: url, trackLoaderID: obj.trackLoaderID });
        else this.loadTrackInWorker(url, obj.trackLoaderID);
    }
}

class SuperpoweredWebAudio {
    static AudioWorkletHasBrokenModuleImplementation = false;

    constructor(minimumSamplerate, superpowered) {
        //SuperpoweredWebAudio.AudioWorkletHasBrokenModuleImplementation = (navigator.userAgent.indexOf('AppleWebKit') > -1) || (navigator.userAgent.indexOf('Firefox') > -1);
        //SuperpoweredWebAudio.AudioWorkletHasBrokenModuleImplementation = (navigator.userAgent.indexOf('Firefox') > -1);
        //if (SuperpoweredWebAudio.AudioWorkletHasBrokenModuleImplementation && (navigator.userAgent.indexOf('Chrome') > -1)) SuperpoweredWebAudio.AudioWorkletHasBrokenModuleImplementation = false;
        this.Superpowered = superpowered;
        this.audioContext = null;
        const AudioContext = window.AudioContext || window.webkitAudioContext || false;
        let c = new AudioContext();
        if (c.sampleRate < minimumSamplerate) {
            c.close();
            c = new AudioContext({ sampleRate: minimumSamplerate });
        }
        this.audioContext = c;
    }

    getUserMediaForAudio(constraints, onPermissionGranted, onPermissionDenied) {
        let finalConstraints = {};

        if (navigator.mediaDevices) {
            const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
            for (const constraint in supportedConstraints) if (supportedConstraints.hasOwnProperty(constraint) && (constraints[constraint] !== undefined)) finalConstraints[constraint] = constraints[constraint];
        }

        finalConstraints.audio = true;
        finalConstraints.video = false;

        navigator.fastAndTransparentAudio = constraints.hasOwnProperty('fastAndTransparentAudio') && (constraints.fastAndTransparentAudio === true);
        if (navigator.fastAndTransparentAudio) {
            finalConstraints.echoCancellation = false;
            finalConstraints.disableLocalEcho = false;
            finalConstraints.autoGainControl = false;
            finalConstraints.audio = { mandatory: { googAutoGainControl: false, googAutoGainControl2: false, googEchoCancellation: false, googNoiseSuppression: false, googHighpassFilter: false, googEchoCancellation2: false, googNoiseSuppression2: false, googDAEchoCancellation: false, googNoiseReduction: false } };
        };

        navigator.getUserMediaMethod = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mediaDevices.mozGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        if (navigator.getUserMediaMethod) navigator.getUserMediaMethod(finalConstraints, onPermissionGranted, onPermissionDenied);
        else {
            let userMedia = null;
            try {
                userMedia = navigator.mediaDevices.getUserMedia;
            } catch(error) {
                if ((location.protocol.toLowerCase() != 'https') && (location.hostname.toLowerCase() != 'localhost')) onPermissionDenied("Web Audio requires a secure context (HTTPS or localhost).");
                else onPermissionDenied(error);
                userMedia = null;
            }

            if (userMedia != null) {
                if (userMedia) navigator.mediaDevices.getUserMedia(finalConstraints).then(onPermissionGranted).catch(onPermissionDenied);
                else onPermissionDenied("Can't access getUserMedia.");
            }
        }
    }

    async getUserMediaForAudioAsync(constraints) {
        return new Promise((resolve, reject) => {
            this.getUserMediaForAudio(constraints, function(stream) {
                if (navigator.fastAndTransparentAudio) {
                    const audioTracks = stream.getAudioTracks();
                    for (const audioTrack of audioTracks) audioTrack.applyConstraints({ autoGainControl: false, echoCancellation: false, noiseSuppression: false });
                }
                resolve(stream);
            }, reject);
        });
    }

    async createAudioNodeAsync(url, className, onMessageFromAudioScope, numInputs, numOutputs) {
        if (numInputs === undefined) numInputs = 1;
        if (numOutputs === undefined) numOutputs = 1;
        return new Promise((resolve, reject) => this.createAudioNode(url, className, resolve, onMessageFromAudioScope, numInputs, numOutputs) );
    }

    createAudioNode(url, className, callback, onMessageFromAudioScope, numInputs, numOutputs) {
        if (!SuperpoweredWebAudio.AudioWorkletHasBrokenModuleImplementation && (typeof AudioWorkletNode === 'function')) {
            if (numInputs === undefined) numInputs = 1;
            if (numOutputs === undefined) numOutputs = 1;

            this.audioContext.audioWorklet.addModule(url).then(() => {
                const node = new AudioWorkletNode(this.audioContext, className, {
                    processorOptions: {
                        wasmCode: this.Superpowered.wasmCode,
                        samplerate: this.audioContext.sampleRate,
                        maxChannels: this.Superpowered.__maxChannels__,
                        numberOfInputs: numInputs,
                        numberOfOutputs: numOutputs,
                        trackLoaderID: this.Superpowered.trackLoaderReceivers.length
                    },
                    numberOfInputs: numInputs,
                    numberOfOutputs: numOutputs,
                    outputChannelCount: Array(numOutputs).fill(2)
                });
                node.superpoweredWASMUrl = SuperpoweredGlue.wasmCDNUrl;
                node.trackLoaderID = this.Superpowered.registerTrackLoader(node);
                node.Superpowered = this.Superpowered;
                node.onReadyCallback = callback;
                node.onMessageFromAudioScope = onMessageFromAudioScope;
                node.destruct = function() {
                    node.Superpowered.trackLoaderReceivers[node.trackLoaderID] = null;
                    node.port.postMessage('___superpowered___destruct___');
                }
                node.sendMessageToAudioScope = function(message, transfer = []) { node.port.postMessage(message, transfer); }
                node.port.onmessage = function(event) {
                    if (node.Superpowered.handleTrackLoaderMessage(event)) return;
                    if (event.data == '___superpowered___onready___') {
                        node.state = 1;
                        node.onReadyCallback(node);
                    } else node.onMessageFromAudioScope(event.data);
                }.bind(node);
            });
        } else {
            import(/* webpackIgnore: true */ url).then((processorModule) => {
                const node = this.audioContext.createScriptProcessor(1024, 2, 2);
                node.trackLoaderID = this.Superpowered.registerTrackLoader(node);
                node.samplerate = this.audioContext.sampleRate;
                node.inputBuffer = this.Superpowered.createFloatArray(1024 * 2);
                node.outputBuffer = this.Superpowered.createFloatArray(1024 * 2);
                node.processor = new processorModule.default(this.Superpowered, onMessageFromAudioScope, node.samplerate);
                node.sendMessageToAudioScope = function(message, transfer = 0) { node.processor.onMessageFromMainScope(message); }
                node.destruct = function() {
                    node.processor.Superpowered.trackLoaderReceivers[node.trackLoaderID] = null;
                    node.processor.state = -1;
                    node.processor.onDestruct();
                }
                node.onaudioprocess = function(e) {
                    node.processor.Superpowered.bufferToWASM(node.inputBuffer, e.inputBuffer);
                    if (node.processor.state > 0) node.processor.processAudio(node.inputBuffer, node.outputBuffer, node.inputBuffer.array.length / 2);
                    node.processor.Superpowered.bufferToJS(node.outputBuffer, e.outputBuffer);
                };
                node.processor.state = 1;
                callback(node);
            });
        }
    }
}

if (!SuperpoweredWebAudio.AudioWorkletHasBrokenModuleImplementation && (typeof AudioWorkletProcessor === 'function')) {
    class SuperpoweredAudioWorkletProcessor extends AudioWorkletProcessor {
        constructor(options) {
            super();
            SuperpoweredGlue.__uint_max__sp__ = options.processorOptions.maxChannels;
            this.trackLoaderID = options.processorOptions.trackLoaderID;
            this.state = 0;
            this.port.onmessage = (event) => {
                if (event.data == '___superpowered___destruct___') {
                    this.state = -1;
                    this.onDestruct();
                } else this.onMessageFromMainScope(event.data);
            };
            this.samplerate = options.processorOptions.samplerate;
            this.Superpowered = new SuperpoweredGlue();
            this.Superpowered.loadFromArrayBuffer(options.processorOptions.wasmCode, this);
            this.numberOfInputs = options.processorOptions.numberOfInputs;
            this.numberOfOutputs = options.processorOptions.numberOfOutputs;
        }
        afterWASMLoaded() {
            // Add the user's WASM URL to the SuperpoweredGlue class
            if (this.superpoweredWASMUrl) {
                SuperpoweredGlue.wasmCDNUrl = this.superpoweredWASMUrl;
            }

            this.Superpowered.Initialize();

            this.inputBuffers = [];
            for (let n = this.numberOfInputs; n > 0; n--) this.inputBuffers.push(this.Superpowered.createFloatArray(128 * 2));

            this.outputBuffers = [];
            for (let n = this.numberOfOutputs; n > 0; n--) this.outputBuffers.push(this.Superpowered.createFloatArray(128 * 2));

            this.onReady();
            this.port.postMessage('___superpowered___onready___');
            this.state = 1;
        }
        onReady() {}
        onDestruct() {}
        onMessageFromMainScope(message) {}
        sendMessageToMainScope(message) { this.port.postMessage(message); }
        processAudio(buffer, parameters) {}
        process(inputs, outputs, parameters) {
            if (this.state < 0) return false;
            if (this.state == 1) {
                for (let n = this.numberOfInputs - 1; n >= 0; n--) {
                    if (inputs[n].length > 1) this.Superpowered.bufferToWASM(this.inputBuffers, inputs, n);
                    else this.Superpowered.memorySet(this.inputBuffers[n].pointer, 0, 128 * 8);
                }
                this.processAudio(
                    (this.numberOfInputs == 1) ? this.inputBuffers[0] : this.inputBuffers, 
                    (this.numberOfOutputs == 1) ? this.outputBuffers[0] : this.outputBuffers,
                    128,
                    parameters
                );
                for (let n = this.numberOfOutputs - 1; n >= 0; n--) {
                    if (outputs[n].length > 1) this.Superpowered.bufferToJS(this.outputBuffers, outputs, n);
                }
            }
            return true;
        }
    }
    SuperpoweredWebAudio.AudioWorkletProcessor = SuperpoweredAudioWorkletProcessor;
} else {
    class SuperpoweredAudioWorkletProcessor {
        constructor(sp, oma, sr) {
            this.Superpowered = sp;
            this.samplerate = sr;
            this.onMessageFromAudioScope = oma;
            this.state = 0;
            this.onReady();
        }
        onMessageFromAudioScope = null;
        onReady() {}
        onDestruct() {}
        onMessageFromMainScope(message) {}
        sendMessageToMainScope(message) { if (!this.Superpowered.handleTrackLoaderMessage({ data: message })) this.onMessageFromAudioScope(message); }
        postMessage(message, transfer = []) { this.onMessageFromMainScope(message); }
        processAudio(buffer, parameters) {}
    }
    SuperpoweredWebAudio.AudioWorkletProcessor = SuperpoweredAudioWorkletProcessor;
}

if (typeof exports === "object" && typeof module === "object")
  module.exports = { SuperpoweredGlue, SuperpoweredWebAudio };
else if (typeof exports === "object") {
  exports["SuperpoweredGlue"] = SuperpoweredGlue;
  exports["SuperpoweredWebAudio"] = SuperpoweredWebAudio;
}
if (typeof globalThis !== "undefined") {
  globalThis.SuperpoweredGlue = SuperpoweredGlue;
  globalThis.SuperpoweredWebAudio = SuperpoweredWebAudio;
}
