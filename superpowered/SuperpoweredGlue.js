class SuperpoweredGlue {
    niceSize(bytes) {
        if (bytes == 0) return '0 byte';
        else if (bytes == 1) return '1 byte';
        const postfix = [' bytes', ' kb', ' mb', ' gb', ' tb'];
        let n = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, n), 2) + postfix[n];
    }

    createFloatArray(length) {
        return this.createViewFromType(9, this.malloc(length * 4), length);
    }

    static async fetch(url) {
        let obj = new SuperpoweredGlue();
        await fetch(url).then(response =>
            response.arrayBuffer()
        ).then(bytes =>
            obj.loadFromArrayBuffer(bytes)
        );
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

        let glue = this;
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
        let buffer = {
            pointer: pointer,
            length: length,
            __arraybuffer__: this.linearMemory,
            __type__: type,
            __glue__: this,
            free() {
                this.__glue__.free(this.pointer);
                let obj = this;
                Object.getOwnPropertyNames(obj).forEach(function(property) {
                    delete obj[property];
                });
                Object.setPrototypeOf(obj, null);
            }
        };
        this.updateBuffer(buffer, this.linearMemory);
        this.__views__.add(buffer);
        return buffer;
    }

    returnPointerToView(r, type) {
        if ((type > 0) && (typeof r !== undefined)) {
            let length = this.__functions__.__lastarraylength__();
            r = this.createViewFromType(type, r, length > 0 ? length : -1);
        }
        return r;
    }

    invokeMethod() {
        if ((arguments.length == 2) && (typeof arguments[1] == 'object')) {
            let obj = arguments[1], n = 1;
            for (let m in obj) arguments[n++] = obj[m];
            arguments.length = n;
        }
        let strings = [];
        for (let index = arguments.length - 1; index > 0; index--) {
            if (arguments[index].array != undefined) arguments[index] = arguments[index].array.byteOffset;
            else if (typeof arguments[index] == 'string') {
                arguments[index] = this.__glue__.toWASMString(arguments[index]);
                strings.push(arguments[index]);
            }
        }
        let info = arguments[0];
        arguments[0] = this.__pointer__;
        let r = info.function.apply(this, arguments);
        for (let string of strings) this.__glue__.free(string);
        r = this.__glue__.returnPointerToView(r, info.returnPointerType);
        return r;
    }

    invokeFunction() {
        if ((arguments.length == 1) && (typeof arguments[0] == 'object')) {
            let obj = arguments[0], n = 0;
            for (let m in obj) arguments[n++] = obj[m];
            arguments.length = n;
        }
        let strings = [];
        for (let index = arguments.length - 1; index >= 0; index--) {
            if (arguments[index].array != undefined) arguments[index] = arguments[index].array.byteOffset;
            else if (typeof arguments[index] == 'string') {
                arguments[index] = this.glue.toWASMString(arguments[index]);
                strings.push(arguments[index]);
            }
        }
        let r = this.apply(this, arguments);
        for (let string of strings) this.glue.free(string);
        r = this.glue.returnPointerToView(r, this.returnPointerType);
        return r;
    }

    invokeExportedFunction() {
        let r = this.apply(this, arguments);
        if (typeof r.array !== undefined) r = r.array.byteOffset;
        return r;
    }

    createClass(classnamePointer, classnameLen, sizeofClass) {
        let glue = this;
        let classname = glue.toString(classnamePointer, classnameLen);
        let WASM = class {
            constructor() {
                let meta = Object.getPrototypeOf(this).constructor.__meta__;
                if (!meta.hasConstructor) throw meta.name + ' has no constructor';

                this.__class__ = meta.name;
                this.__prev__ = glue.__lastObject__;
                if (glue.__lastObject__ != null) glue.__lastObject__.__next__ = this;
                this.__next__ = null;
                this.__glue__ = glue;
                glue.__lastObject__ = this;

                let args = [].slice.call(arguments);
                args.unshift(glue.malloc(meta.size));
                this.__pointer__ = glue[meta.name + '::' + meta.name].apply(null, args);

                for (let property of meta.properties) glue.createPropertyFromDescriptor(this, property);
                for (let method of meta.methods) this[method.name] = glue.invokeMethod.bind(this, { function: glue[method.wasmFunction], returnPointerType: method.returnPointerType });
            }
            destruct() {
                let meta = Object.getPrototypeOf(this).constructor.__meta__;
                if (meta.hasDestructor) glue[meta.name + '::~' + meta.name](this.__pointer__);
                glue.free(this.__pointer__);
                if (this.__prev__ != null) this.__prev__.__next__ = this.__next__;
                if (this.__next__ != null) this.__next__.__prev__ = this.__prev__;
                let obj = this;
                Object.getOwnPropertyNames(obj).forEach(function(property) {
                    delete obj[property];
                });
                Object.setPrototypeOf(obj, null);
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
        let name = this.toString(nameptr, namelen);
        this.__classUnderConstruction__[name] = value;
    }

    createConstant(nameptr, namelen, value) {
        let name = this.toString(nameptr, namelen);
        this[name] = value;
    }

    createPropertyFromDescriptor(object, descriptor) {
        let buffer = this.createViewFromType(descriptor.viewType, object.__pointer__ + descriptor.offset, descriptor.viewLength);
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
        let propertyname = this.toString(propertynamePointer, propertynameLen);
        let descriptor = { name: propertyname, offset: offset, viewType: viewType, viewLength: viewLength };
        this.__classUnderConstruction__.__meta__.properties.push(descriptor);
    }

    createStaticPropertyFromDescriptor(wasmClass, descriptor) {
        let buffer = this.createViewFromType(descriptor.viewType, descriptor.pointer, descriptor.viewLength);
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
        let propertyname = this.toString(propertynamePointer, propertynameLen);
        let descriptor = { name: propertyname, pointer: pointer, viewType: viewType, viewLength: viewLength };
        this.__classUnderConstruction__.__meta__.staticProperties.push(descriptor);
        this.createStaticPropertyFromDescriptor(this.__classUnderConstruction__, descriptor);
    }

    createMethod(methodnamePointer, methodnameLen, returnPointerType) {
        let methodname = this.toString(methodnamePointer, methodnameLen);
        let wasmMethodname = this.__classUnderConstruction__.__meta__.name + '::' + methodname;
        this.__classUnderConstruction__.__meta__.methods.push({ name: methodname, wasmFunction: wasmMethodname, returnPointerType: returnPointerType });
    }

    createStaticMethod(methodnamePointer, methodnameLen, returnPointerType) {
        let methodname = this.toString(methodnamePointer, methodnameLen);
        let wasmMethodname = this.__classUnderConstruction__.__meta__.name + '::' + methodname;
        this[wasmMethodname].returnPointerType = returnPointerType;
        this[wasmMethodname].glue = this;
        this.__classUnderConstruction__[methodname] = this.invokeFunction.bind(this[wasmMethodname]);
    }

    createFunction(methodnamePointer, methodnameLen, returnPointerType) {
        let methodname = this.toString(methodnamePointer, methodnameLen);
        if (!this[methodname]) { // maybe this function is in a namespace
            for (let namespace in this.__functionsWithNamespace__) {
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

    async loadFromArrayBuffer(wasmCode, afterWASMLoaded = null) {
        this.wasmCode = wasmCode;
        await WebAssembly.instantiate(wasmCode, {
            wasi_snapshot_preview1: this.wasi,
            env: this.__exportsToWasm__
        }).then(_module => {
            this.wasmInstance = _module.instance;
            this.wasmInstance.exports._initialize();

            this.__functions__ = this.wasmInstance.exports;
            this.linearMemory = this.wasmInstance.exports.memory.buffer;
            this.__memorygrowpointer__ = this.__functions__.__malloc__(16);
            this.__memorygrowview__ = new Uint8Array(this.linearMemory, this.__memorygrowpointer__, 16);
            this.__functionsWithNamespace__ = {};

            let outputBuffer = this.__functions__.__malloc__(1024);
            let stringview = new Uint8Array(this.linearMemory, this.__functions__.__malloc__(1024), 1024);
            for (let f in this.__functions__) {
                if (f != '__demangle__') {
                    let length = this.__functions__.__demangle__(this.toWASMString(f, stringview), outputBuffer);
                    if (length > 0) {
                        let name = this.toString(outputBuffer, length);
                        let par = name.indexOf('(');
                        if (par > 0) name = name.substring(0, par);

                        let namespace = name.lastIndexOf('::');
                        if (namespace > 0) {
                            namespace = name.lastIndexOf('::', namespace - 1);
                            if (namespace > 0) name = name.substr(namespace + 2);
                        }

                        // class members have namespaces removed from this point, but functions not
                        let split = name.split('::', 2);
                        if (split.length == 2) {
                            if (!this.__functionsWithNamespace__[split[0]]) this.__functionsWithNamespace__[split[0]] = {}
                            this.__functionsWithNamespace__[split[0]][split[1]] = this.__functions__[f];
                        }

                        this[name] = this.__functions__[f];
                    } else this[f] = this.__functions__[f];
                }
            }
            this.free(outputBuffer);
            this.free(stringview.byteOffset);

            this.__functions__.__initialize__();
            delete this.__functionsWithNamespace__;
            this.logMemory();
            this.__classUnderConstruction__ = null;

            if (afterWASMLoaded != null) afterWASMLoaded.afterWASMLoaded();
        });
    }

    toString(pointer, strlen = 0) {
        let view = null;
        if (strlen < 1) {
            let viewLength = this.linearMemory.byteLength - pointer;
            if (viewLength > 16384) viewLength = 16384;
            view = new Uint8Array(this.linearMemory, pointer, viewLength);
            for (strlen = 0; strlen < viewLength; strlen++) if (view[strlen] == 0) break;
        } else view = new Uint8Array(this.linearMemory, pointer, strlen);

        let str = '', i = 0, octet, bytesNeeded, codePoint, k;
        while (i < strlen) {
            octet = view[i];
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
                k = 0;
                while (k < bytesNeeded) {
                    octet = view[i + k + 1];
                    codePoint = (codePoint << 6) | (octet & 0x3f);
                    k += 1;
                }
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
        let length = str.length, i = 0, codePoint, c, bits, destination = 0, maxBytes = length * 4 + 1;
        if (view == null) view = new Uint8Array(this.linearMemory, this.malloc(maxBytes), maxBytes);
        while (i < length) {
            codePoint = str.codePointAt(i);
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
        let pointer = this.__functions__.__malloc__(bytes);
        if (this.__memorygrowview__.buffer.byteLength < 1) this.updateMemoryViews();
        return pointer;
    }

    updateMemoryViews() {
        for (let buffer of this.__views__) this.updateBuffer(buffer, this.linearMemory);
        this.__memorygrowview__ = new Uint8Array(this.linearMemory, this.__memorygrowpointer__, 16);
    }

    free(pointer) {
        this.__functions__.__free__(pointer);
    }

    setInt64(pointer, index, value) {
        this.__functions__.__setint64__(pointer, index, value);
    }

    bufferToWASM(buffer, input) {
        let inBufferL = null;
        let inBufferR = null;
        if (typeof input.getChannelData === 'function') {
            inBufferL = input.getChannelData(0);
            inBufferR = input.getChannelData(1);
        } else {
            inBufferL = input[0][0];
            inBufferR = input[0][1];
        }
        for (let n = 0, i = 0; n < buffer.array.length; n++, i++) {
            buffer.array[n++] = inBufferL[i];
            buffer.array[n] = inBufferR[i];
        }
    }

    bufferToJS(buffer, output) {
        let outBufferL = null;
        let outBufferR = null;
        if (typeof output.getChannelData === 'function') {
            outBufferL = output.getChannelData(0);
            outBufferR = output.getChannelData(1);
        } else {
            outBufferL = output[0][0];
            outBufferR = output[0][1];
        }
        for (let n = 0, i = 0; n < buffer.array.length; n++, i++) {
            outBufferL[i] = buffer.array[n++];
            outBufferR[i] = buffer.array[n];
        }
    }

    arrayBufferToWASM(arrayBuffer, offset = 0) {
        let pointer = this.malloc(arrayBuffer.byteLength + offset);
        new Uint8Array(this.linearMemory).set(new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength), pointer + offset);
        return pointer;
    }

    copyWASMToArrayBuffer(pointer, lengthBytes) {
        let arrayBuffer = new ArrayBuffer(lengthBytes);
        new Uint8Array(arrayBuffer, 0, lengthBytes).set(new Uint8Array(this.linearMemory, pointer, lengthBytes));
        return arrayBuffer;
    }

    moveWASMToArrayBuffer(pointer, lengthBytes) {
        let arrayBuffer = this.copyWASMToArrayBuffer(pointer, lengthBytes);
        this.free(pointer);
        return arrayBuffer;
    }
}

if (typeof exports === 'object' && typeof module === 'object') module.exports = SuperpoweredGlue;
else if (typeof define === 'function' && define['amd']) define([], function() { return SuperpoweredGlue; });
else if (typeof exports === 'object') exports["SuperpoweredGlue"] = SuperpoweredGlue;

//export { SuperpoweredGlue };
