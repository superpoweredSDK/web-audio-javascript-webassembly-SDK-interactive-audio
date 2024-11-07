/* eslint-disable */
// @ts-check
/// <reference lib="webworker" />

class LinearMemoryBuffer {
    /**@type {number} */pointer;
    /**@type {number} */length;
    /**@type {number} */#type;
    /**@type {SuperpoweredGlue} */#glue;
    /**@type {Int8Array|Int16Array|Int32Array|BigInt64Array|Uint8Array|Uint16Array|Uint32Array|BigUint64Array|Float32Array|Float64Array} */array;
    /**@type {any[]}*/ static #types = [ null, Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, BigUint64Array, BigInt64Array, Float32Array, Float64Array ];

    constructor(/**@type {number} */pointer, /**@type {number} */length, /**@type {number} */type, /**@type {SuperpoweredGlue}*/glue) {
        this.length = length;
        this.#type = type;
        this.#glue = glue;
        this.pointer = (pointer == 0) ? glue.malloc(length * LinearMemoryBuffer.#types[this.#type].BYTES_PER_ELEMENT) : pointer;
        this.update();
        this.#glue.addBuffer(this);
    }

    update() {
        const ab = this.#glue.linearMemory, t = LinearMemoryBuffer.#types[this.#type];
        this.array = new t(ab, this.pointer, (this.length < 0) ? Math.floor((ab.byteLength - this.pointer) / t.BYTES_PER_ELEMENT) : this.length);
    }

    free() {
        this.#glue.free(this.pointer);
        this.#glue.removeBuffer(this);
    }
}

class SuperpoweredGlue {
    static wasmCDNUrl = 'https://cdn.jsdelivr.net/npm/@superpoweredsdk/web@2.7.2/dist/superpowered-npm.wasm';

    /**@type {number}*/id = Math.floor(Math.random() * Date.now());
    /**@type {ArrayBuffer}*/linearMemory;
    /**@type {ArrayBuffer} */wasmCode;
    /**@type {boolean} */logMemory = true;

    /**@type {Map<number,object>}*/#trackLoaderReceivers = new Map();
    /**@type {number}*/#nextTrackLoaderReceiverID = 0;
    /**@type {Map<number,Set<LinearMemoryBuffer>>}*/#buffers = new Map();
    /**@type {object}*/#classUnderConstruction = null;
    /**@type {Map<string,Map<string,Function>>}*/#functionsWithNamespace = new Map();
    /**@type {object}*/#exportsToWASM;
    /**@type {Uint8Array}*/#memoryGrowArray;
    /**@type {number}*/#memoryGrowPointer;
    /**@type {WebAssembly.Instance}*/#wasmInstance;
    /**@type {string|undefined} */#trackLoaderSource = undefined;
    /**@type {Function} */#malloc;
    /**@type {Function} */#free;
    /**@type {Function} */#heapBase;
    /**@type {Function} */#stackSize;
    /**@type {Function} */#lastArrayLength;
    /**@type {Function} */#setInt64;
    /**@type {DataView} */#view;
    /**@type {boolean} */#littleEndian = (new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44);
    
    /**@returns {Promise<SuperpoweredGlue>} */
    static async Instantiate(/**@type {string}*/licenseKey, /**@type {string}*/wasmUrl = SuperpoweredGlue.wasmCDNUrl, /**@type {boolean}*/sharedArrayBuffer = false) {
        SuperpoweredGlue.wasmCDNUrl = wasmUrl;
        const obj = new SuperpoweredGlue();
        const ab = await fetch(wasmUrl).then(response => response.arrayBuffer());
        await obj.loadFromArrayBuffer(sharedArrayBuffer ? SuperpoweredGlue.getWASMWithSharedArrayBufferEnabled(ab) : ab);
        obj['Initialize'](licenseKey);
        return obj;
    }

    async loadFromArrayBuffer(/**@type {ArrayBuffer}*/wasmCode, /**@type {object}*/afterWASMLoaded = null) {
        this.wasmCode = wasmCode;
        await WebAssembly.instantiate(wasmCode, { wasi_snapshot_preview1: this.wasi, env: this.#exportsToWASM }).then((result) => {
            this.setInstance(result.instance);
            if (afterWASMLoaded != null) afterWASMLoaded.afterWASMLoaded();
        });
    }

    async loadFromModule(/**@type {BufferSource}*/module) {
        await WebAssembly.instantiate(module, { wasi_snapshot_preview1: this.wasi, env: this.#exportsToWASM }).then((result) => this.setInstance(result.instance));
    }

    async loadFromURL(/**@type {string}*/url, /**@type {boolean}*/storeCode = true) {
        const wasmCode = await fetch(url).then(response => response.arrayBuffer());
        if (storeCode) this.wasmCode = wasmCode;
        await WebAssembly.instantiate(wasmCode, { wasi_snapshot_preview1: this.wasi, env: this.#exportsToWASM }).then((result) => this.setInstance(result.instance));
    }

    /**@returns {ArrayBuffer} */
    static getWASMWithSharedArrayBufferEnabled(/**@type {ArrayBuffer} */wasm) {
        const v = new DataView(wasm), to = wasm.byteLength, result = new Uint8Array(wasm.byteLength);
        result.set(new Uint8Array(wasm));
        let pos = 8, sectionSize, shift;
        while (pos < to) {
            const sectionType = v.getUint8(pos++);

            sectionSize = shift = 0;
            while (pos < to) {
                const byte = v.getUint8(pos++);
                sectionSize |= (byte & 127) << shift;
                if ((byte & 128) == 0) break; else shift += 7;
            }

            if (sectionType == 5) {
                result[pos + 1] = 3;
                break;
            } else pos += sectionSize;
        }
        return result.buffer;
    }
    
    constructor() {    
        const glue = this;
        this.Uint8Buffer = class { constructor(/**@type {number}*/length) { return new LinearMemoryBuffer(0, length, 1, glue); } }
        this.Int8Buffer = class { constructor(/**@type {number}*/length) { return new LinearMemoryBuffer(0, length, 2, glue); } }
        this.Uint16Buffer = class { constructor(/**@type {number}*/length) { return new LinearMemoryBuffer(0, length, 3, glue); } }
        this.Int16Buffer = class { constructor(/**@type {number}*/length) { return new LinearMemoryBuffer(0, length, 4, glue); } }
        this.Uint32Buffer = class { constructor(/**@type {number}*/length) { return new LinearMemoryBuffer(0, length, 5, glue); } }
        this.Int32Buffer = class { constructor(/**@type {number}*/length) { return new LinearMemoryBuffer(0, length, 6, glue); } }
        this.BigUint64Buffer = class { constructor(/**@type {number}*/length) { return new LinearMemoryBuffer(0, length, 7, glue); } }
        this.BigInt64Buffer = class { constructor(/**@type {number}*/length) { return new LinearMemoryBuffer(0, length, 8, glue); } }
        this.Float32Buffer = class { constructor(/**@type {number}*/length) { return new LinearMemoryBuffer(0, length, 9, glue); } }
        this.Float64Buffer = class { constructor(/**@type {number}*/length) { return new LinearMemoryBuffer(0, length, 10, glue); } }
        this.#exportsToWASM = {
            consolelog: (/**@type {number}*/pointer, /**@type {number}*/strlen) => console.log(this.toString(pointer, strlen)),
            emscripten_notify_memory_growth: this.#onMemoryGrowth.bind(this),
            __createClass__: this.#createClass.bind(this),
            __createStaticProperty__: this.#createStaticProperty.bind(this),
            __createStaticMethod__: this.#createStaticMethod.bind(this),
            __createConstructor__: () => {},
            __createDestructor__: () => {},
            __createProperty__: this.#createProperty.bind(this),
            __createMethod__: this.#createMethod.bind(this),
            __createFunction__: this.#createFunction.bind(this),
            __createClassConstant__: (/**@type {number}*/nameptr, /**@type {number}*/namelen, /**@type {number}*/value) => this.#classUnderConstruction[this.toString(nameptr, namelen)] = value,
            __createConstant__: (/**@type {number}*/nameptr, /**@type {number}*/namelen, /**@type {number}*/value) => this[this.toString(nameptr, namelen)] = value,
            __runjs__: (/**@type {number}*/pointer) => { return eval(this.toString(pointer)); },
            abs: Math.abs,
            round: Math.round,
            roundf: Math.fround,
            abort: () => console.log('abort')
        };
        this.wasi = { proc_exit: () => console.log('abort') };
    }

    setInstance(/**@type {WebAssembly.Instance}*/wasmInstance) {
        this.#wasmInstance = wasmInstance;
        /**@type {Function}*/(this.#wasmInstance.exports._initialize)();

        this.#lastArrayLength = /**@type {Function}*/(this.#wasmInstance.exports.__lastarraylength__);
        this.#malloc = /**@type {Function}*/(this.#wasmInstance.exports.__malloc__);
        this.#stackSize = /**@type {Function}*/(this.#wasmInstance.exports.__stacksize__);
        this.#heapBase = /**@type {Function}*/(this.#wasmInstance.exports.__heapbase__);
        this.#free = /**@type {Function}*/(this.#wasmInstance.exports.__free__);
        this.#setInt64 = /**@type {Function}*/(this.#wasmInstance.exports.__setint64__);

        this.linearMemory = this.#wasmInstance.exports.memory['buffer'];
        this.#view = new DataView(this.linearMemory);
        this.#memoryGrowPointer = this.#malloc(16);
        this.#memoryGrowArray = new Uint8Array(this.linearMemory, this.#memoryGrowPointer, 16);
    
        const outputBuffer = this.#malloc(1024), stringview = new Uint8Array(this.linearMemory, this.#malloc(1024), 1024), demangle = /**@type {Function}*/(this.#wasmInstance.exports.__demangle__);
        for (const name in this.#wasmInstance.exports) if (name != '__demangle__') {
            const length = demangle(this.toWASMString(name, stringview), outputBuffer), func = /**@type {Function}*/(this.#wasmInstance.exports[name]);
            if (length > 0) {
                let demangledName = this.toString(outputBuffer, length);
                const par = demangledName.indexOf('(');
                if (par > 0) demangledName = demangledName.substring(0, par);

                let namespace = demangledName.lastIndexOf('::');
                if (namespace > 0) {
                    namespace = demangledName.lastIndexOf('::', namespace - 1);
                    if (namespace > 0) demangledName = demangledName.substr(namespace + 2);
                }

                // class members have namespaces removed from this point, but functions not
                const split = demangledName.split('::', 2);
                if (split.length == 2) {
                    let map = this.#functionsWithNamespace.get(split[0]);
                    if (!map) {
                        map = new Map();
                        this.#functionsWithNamespace.set(split[0], map);
                    }
                    map.set(split[1], func);
                }
                this[demangledName] = func;
            } else this[name] = func;
        }
        this.#free(outputBuffer);
        this.#free(stringview.byteOffset);

        /**@type {Function}*/(this.#wasmInstance.exports.__initialize__)();
        for (const [name, map] of this.#functionsWithNamespace) map.clear();
        this.#functionsWithNamespace.clear();
        this.#logMemory();
        this.#classUnderConstruction = null;
    }

    /**@returns {LinearMemoryBuffer|number|undefined} */
    returnPointerToView(/**@type {number|undefined}*/pointer, /**@type {number}*/type) {
        if ((type < 1) || (pointer == undefined)) return pointer;
        const length = this.#lastArrayLength();
        return new LinearMemoryBuffer(pointer, length > 0 ? length : -1, type, this);
    }

    /**@returns {LinearMemoryBuffer|number|undefined} */
    #invokeFunction(/**@type {number}*/pointerToInstance, /**@type {Function} */func, /**@type {number} */returnPointerType) { 
        if ((arguments.length == 4) && (typeof arguments[3] == 'object')) {
            const obj = arguments[3]; let n = 0;
            for (const m in obj) arguments[n++] = obj[m];
            arguments.length = n;
        }
        
        const strings = [], args = [], to = arguments.length;
        if (pointerToInstance != 0) args.push(pointerToInstance);
        for (let index = 3; index < to; index++) {
            if (arguments[index].array != undefined) args.push(arguments[index].array.byteOffset);
            else if (arguments[index].pointerToInstance != undefined) args.push(arguments[index].pointerToInstance);
            else if (typeof arguments[index] == 'string') {
                const str = this.toWASMString(arguments[index]);
                args.push(str);
                strings.push(str);
            } else args.push(arguments[index]);
        }

        const r = func.apply(func, args);
        for (const string of strings) this.free(string);
        return this.returnPointerToView(r, returnPointerType);
    }

    #createClass(/**@type {number}*/classnamePointer, /**@type {number}*/classnameLen, /**@type {number}*/sizeofClass) {
        const classname = this.toString(classnamePointer, classnameLen), glue = this, O = class {
            /**@type {string} */className = classname;
            /**@type {number} */pointerToInstance;

            constructor() {
                const constructorFunction = glue[classname + '::' + classname], args = [].slice.call(arguments);
                if (constructorFunction == undefined) throw classname + ' has no constructor'; else args.unshift(glue.malloc(sizeofClass)); 
                this.pointerToInstance = constructorFunction.apply(null, args);
                const meta = Object.getPrototypeOf(this).constructor.classInfo;
                for (const property of meta.properties) glue.createPropertyFromDescriptor(this, property);
                for (const method of meta.methods) this[method.name] = glue.#invokeFunction.bind(glue, this.pointerToInstance, method.function, method.returnPointerType);
            }

            destruct() {
                glue[classname + '::~' + classname]?.(this.pointerToInstance);
                glue.free(this.pointerToInstance);
                Object.getOwnPropertyNames(this).forEach((property) => delete this[property] );
                Object.setPrototypeOf(this, null);
            }
        }
        O.classInfo = { name: classname, properties: [], methods: [] }
        this.#classUnderConstruction = this[classname] = O;
        this.#functionsWithNamespace.delete(classname);
    }
    
    /**@returns {number|bigint|undefined} */
    #read(/**@type {number} */pointer, /**@type {number} */type) {
        switch (type) {
            case 1: return this.#view.getUint8(pointer);
            case 2: return this.#view.getInt8(pointer);
            case 3: return this.#view.getUint16(pointer, this.#littleEndian);
            case 4: return this.#view.getInt16(pointer, this.#littleEndian);
            case 5: return this.#view.getUint32(pointer, this.#littleEndian);
            case 6: return this.#view.getInt32(pointer, this.#littleEndian);
            case 7: return this.#view.getBigUint64(pointer, this.#littleEndian);
            case 8: return this.#view.getBigInt64(pointer, this.#littleEndian);
            case 9: return this.#view.getFloat32(pointer, this.#littleEndian);
            case 10: return this.#view.getFloat64(pointer, this.#littleEndian);
        }
        return undefined;
    }

    #write(/**@type {number} */pointer, /**@type {number} */type, /**@type {number|bigint} */value) {
        switch (type) {
            case 1: this.#view.setUint8(pointer, /**@type {number}*/(value)); break;
            case 2: this.#view.setInt8(pointer, /**@type {number}*/(value)); break;
            case 3: this.#view.setUint16(pointer, /**@type {number}*/(value), this.#littleEndian); break;
            case 4: this.#view.setInt16(pointer, /**@type {number}*/(value), this.#littleEndian); break;
            case 5: this.#view.setUint32(pointer, /**@type {number}*/(value), this.#littleEndian); break;
            case 6: this.#view.setInt32(pointer, /**@type {number}*/(value), this.#littleEndian); break;
            case 7: this.#view.setBigUint64(pointer, /**@type {bigint}*/(value), this.#littleEndian); break;
            case 8: this.#view.setBigInt64(pointer, /**@type {bigint}*/(value), this.#littleEndian); break;
            case 9: this.#view.setFloat32(pointer, /**@type {number}*/(value), this.#littleEndian); break;
            case 10: this.#view.setFloat64(pointer, /**@type {number}*/(value), this.#littleEndian); break;
        }
    }
        
    #createProperty(/**@type {number}*/propertynamePointer, /**@type {number}*/propertynameLen, /**@type {number}*/offset, /**@type {number}*/viewType, /**@type {number}*/viewLength) {
        this.#classUnderConstruction.classInfo.properties.push({ name: this.toString(propertynamePointer, propertynameLen), offset: offset, viewType: viewType,  viewLength: viewLength });
    }

    createPropertyFromDescriptor(/**@type {object}*/object, /**@type {object}*/descriptor) {
        const basePointer = object?.pointerToInstance ?? 0;
        if (descriptor.viewLength > 1) {
            const buffer = new LinearMemoryBuffer(basePointer + descriptor.offset, descriptor.viewLength, descriptor.viewType, this);
            Object.defineProperty(object, descriptor.name, {
                get: function() { return buffer.array; },
                configurable: true,
                enumerable: true
            }); 
        } else Object.defineProperty(object, descriptor.name, {
            get: () => { return this.#read(basePointer + descriptor.offset, descriptor.viewType); },
            set: (value) => { this.#write(basePointer + descriptor.offset, descriptor.viewType, value); },
            configurable: true,
            enumerable: true
        });
    }

    #createStaticProperty(/**@type {number}*/propertynamePointer, /**@type {number}*/propertynameLen, /**@type {number}*/pointer, /**@type {number}*/viewType, /**@type {number}*/viewLength) {
        this.createPropertyFromDescriptor(this.#classUnderConstruction, { name: this.toString(propertynamePointer, propertynameLen), offset: pointer, viewType: viewType, viewLength: viewLength });
    }

    #createMethod(/**@type {number}*/methodnamePointer, /**@type {number}*/methodnameLen, /**@type {number}*/returnPointerType) {
        const methodname = this.toString(methodnamePointer, methodnameLen);
        this.#classUnderConstruction.classInfo.methods.push({ name: methodname, function: this[this.#classUnderConstruction.classInfo.name + '::' + methodname], returnPointerType: returnPointerType });
    }

    #createStaticMethod(/**@type {number}*/methodnamePointer, /**@type {number}*/methodnameLen, /**@type {number}*/returnPointerType) {
        const methodname = this.toString(methodnamePointer, methodnameLen), wasmMethodname = this.#classUnderConstruction.classInfo.name + '::' + methodname;
        this.#classUnderConstruction[methodname] = this.#invokeFunction.bind(this, 0, this[wasmMethodname], returnPointerType);
    }

    #createFunction(/**@type {number}*/methodnamePointer, /**@type {number}*/methodnameLen, /**@type {number}*/returnPointerType) {
        const methodname = this.toString(methodnamePointer, methodnameLen);
        if (!this[methodname]) { // maybe this function is in a namespace
            for (const [namespace, map] of this.#functionsWithNamespace) {
                const method = map.get(methodname);
                if (method != undefined) {
                    this[methodname] = method;
                    map.delete(methodname);
                    break;
                }
            }
            if (!this[methodname]) return;
        }
        this[methodname] = this.#invokeFunction.bind(this, 0, this[methodname], returnPointerType);
    }

    exportToWasm(/**@type {string}*/functionName, /**@type {Function}*/f) { 
        this.#exportsToWASM[functionName] = () => {
            const r = f.apply(f, arguments);
            return (r.array != undefined) ? r.array.byteOffset : r;
        }
    }
    
    #onMemoryGrowth(/**@type {number}*/n) {
        this.linearMemory = this.#wasmInstance.exports.memory['buffer'];
        this.#view = new DataView(this.linearMemory);
        if (this.#memoryGrowArray.buffer.byteLength < 1) this.#updateMemoryViews();
        this.#logMemory();
    }
    
    toString(/**@type {number}*/pointer, /**@type {number}*/strlen = 0) {
        let view = null;
        if (strlen < 1) {
            const viewLength = Math.min(16384, this.linearMemory.byteLength - pointer);
            view = new Uint8Array(this.linearMemory, pointer, viewLength);
            for (strlen = 0; strlen < viewLength; strlen++) if (view[strlen] == 0) break;
        } else view = new Uint8Array(this.linearMemory, pointer, strlen);
    
        let str = '', i = 0, bytesNeeded, codePoint, octet;
        while (i < strlen) {
            octet = view[i];
            
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
            } else bytesNeeded = codePoint = 0;
    
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
    
    toWASMString(/**@type {string} */str, /**@type {Uint8Array|undefined}*/view) {
        const length = str.length, maxBytes = length * 4 + 1;
        let i = 0, c, bits, destination = 0, codePoint;
        if (view == undefined) view = new Uint8Array(this.linearMemory, this.malloc(maxBytes), maxBytes);
        while (i < length) {
            codePoint = str.codePointAt(i) ?? 0;
    
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
            } else c = bits = 0;
    
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

    /**@returns {string} */
    #niceSize(/**@type {number}*/bytes) {
        if (bytes == 0) return '0 byte'; else if (bytes == 1) return '1 byte';
        const postfix = [ ' bytes', ' kb', ' mb', ' gb', ' tb' ], n = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, n)) + postfix[n];
    }
    
    #logMemory() {
        if (this.logMemory) console.log('WASM memory ' + this.id + ': ' + this.#niceSize(this.#stackSize()) + ' stack, ' + this.#niceSize(this.linearMemory.byteLength - this.#heapBase()) + ' heap, ' + this.#niceSize(this.linearMemory.byteLength) + ' total.');
    }
    
    malloc(/**@type {number}*/bytes) {
        const pointer = this.#malloc(bytes);
        if (this.#memoryGrowArray.buffer.byteLength < 1) this.#updateMemoryViews();
        return pointer;
    }
    
    #updateMemoryViews() {
        for (const [pointer, set] of this.#buffers) for (const buffer of set) buffer.update();
        this.#memoryGrowArray = new Uint8Array(this.linearMemory, this.#memoryGrowPointer, 16);
    }

    addBuffer(/**@type {LinearMemoryBuffer} */buffer) {
        const existing = this.#buffers.get(buffer.pointer);
        if (existing) existing.add(buffer); else this.#buffers.set(buffer.pointer, new Set([ buffer ]));
    }

    removeBuffer(/**@type {LinearMemoryBuffer} */buffer) {
        const set = this.#buffers.get(buffer.pointer);
        if (!set) return; else set.delete(buffer);
        if (set.size < 1) this.#buffers.delete(buffer.pointer);
    }
    
    free(/**@type {number}*/pointer) {
        const set = this.#buffers.get(pointer);
        if (set) {
            set.clear();
            this.#buffers.delete(pointer);
        }
        this.#free(pointer);
    }
    
    setInt64(/**@type {number}*/pointer, /**@type {number}*/index, /**@type {number}*/value) {
        this.#setInt64(pointer, index, value);
    }
    
    bufferToWASM(/**@type {any}*/buffer, /**@type {any}*/input, /**@type {number}*/index) {
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
    
    bufferToJS(/**@type {any}*/buffer, /**@type {any}*/output, /**@type {number}*/index) {
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
    
    arrayBufferToWASM(/**@type {ArrayBuffer}*/arrayBuffer, /**@type {number}*/offset = 0) {
        const pointer = this.malloc(arrayBuffer.byteLength + offset);
        new Uint8Array(this.linearMemory).set(new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength), pointer + offset);
        return pointer;
    }
    
    copyWASMToArrayBuffer(/**@type {number}*/pointer, /**@type {number}*/lengthBytes) {
        const arrayBuffer = new ArrayBuffer(lengthBytes);
        new Uint8Array(arrayBuffer, 0, lengthBytes).set(new Uint8Array(this.linearMemory, pointer, lengthBytes));
        return arrayBuffer;
    }
    
    moveWASMToArrayBuffer(/**@type {number}*/pointer, /**@type {number}*/lengthBytes) {
        const arrayBuffer = this.copyWASMToArrayBuffer(pointer, lengthBytes);
        this.free(pointer);
        return arrayBuffer;
    }
    
    static async loaderWorkerMain(/**@type {string}*/url) {
        SuperpoweredGlue['__uint_max__sp__'] = 255;
        const Superpowered = await SuperpoweredGlue.Instantiate('');
        await fetch(url).then(response => response.arrayBuffer()).then(audiofileArrayBuffer => {
            const audiofileInWASMHeap = Superpowered.arrayBufferToWASM(audiofileArrayBuffer);
            const audioInMemoryFormat = Superpowered['Decoder'].decodeToAudioInMemory(audiofileInWASMHeap, audiofileArrayBuffer.byteLength);
            // Size calculation:  48 bytes (main table is six 64-bit numbers), plus number of audio frames (.getSize) multiplied by four (16-bit stereo is 4 bytes).
            const arrayBuffer = Superpowered.moveWASMToArrayBuffer(audioInMemoryFormat, 48 + Superpowered['AudioInMemory'].getSize(audioInMemoryFormat) * 4);
            postMessage({ '__transfer__': arrayBuffer, }, [ arrayBuffer ]);
        });
    }
    
    static loaderWorkerOnmessage(/**@type {MessageEvent}*/message) {
        if (typeof message.data.load === 'string') SuperpoweredGlue.loaderWorkerMain(message.data.load);
    }
    
    /**@returns {number} */
    registerTrackLoader(/**@type {object}*/receiver) {
        if (typeof receiver.terminate !== 'undefined') receiver.addEventListener('message', this.handleTrackLoaderMessage); // Worker
        this.#trackLoaderReceivers.set(this.#nextTrackLoaderReceiverID++, (typeof receiver.port !== 'undefined') ? receiver.port : receiver);
        return this.#nextTrackLoaderReceiverID - 1;
    }

    removeTrackLoader(/**@type {number} */trackLoaderID) { this.#trackLoaderReceivers.delete(trackLoaderID); }
    /**@returns {number} */nextTrackLoaderID() { return this.#nextTrackLoaderReceiverID; }
    
    handleTrackLoaderMessage(/**@type {MessageEvent}*/message) {
        if (typeof message.data.SuperpoweredLoad !== 'string') return false;
        this.loadTrackInWorker(message.data.SuperpoweredLoad, message.data.trackLoaderID);
        return true;
    }
    
    async loadTrackInWorker(/**@type {string}*/url, /**@type {number}*/trackLoaderID) {   
        if (this.#trackLoaderSource == undefined) this.#trackLoaderSource = URL.createObjectURL(new Blob([ SuperpoweredGlue.toString() + "\r\n\r\nonmessage = SuperpoweredGlue.loaderWorkerOnmessage;" + `\r\n\r\nSuperpoweredGlue.wasmCDNUrl = "${SuperpoweredGlue.wasmCDNUrl}";` ], { type: 'application/javascript' }));
        const trackLoaderWorker = new Worker(this.#trackLoaderSource);
        trackLoaderWorker['__url__'] = url;
        trackLoaderWorker['trackLoaderID'] = trackLoaderID;    
        trackLoaderWorker.onmessage = (/**@type {MessageEvent}*/message) => this.transferLoadedTrack(message.data.__transfer__, trackLoaderWorker);
        if ((typeof window !== 'undefined') && (typeof window.location !== 'undefined') && (typeof window.location.origin !== 'undefined')) url = new URL(url, window.location.origin).toString();
        trackLoaderWorker.postMessage({ load: url });
    }
    
    transferLoadedTrack(/**@type {ArrayBuffer}*/arrayBuffer,/**@type {Worker} */trackLoaderWorker) {
        const receiver = this.#trackLoaderReceivers.get(trackLoaderWorker['trackLoaderID']); 
        if (receiver == undefined) return;
        if (typeof receiver.postMessage === 'function') receiver.postMessage({ SuperpoweredLoaded: { buffer: arrayBuffer, url: trackLoaderWorker['__url__'] }}, [ arrayBuffer ]);
        else receiver({ SuperpoweredLoaded: { buffer: arrayBuffer, url: trackLoaderWorker['__url__'] }});
        trackLoaderWorker.terminate();
    }
    
    downloadAndDecode(/**@type {string}*/url, /**@type {object}*/obj) {
        if (obj.trackLoaderID === undefined) return;
        if ((typeof obj.onMessageFromMainScope === 'function') && (typeof obj.sendMessageToMainScope === 'function')) obj.sendMessageToMainScope({ SuperpoweredLoad: url, trackLoaderID: obj.trackLoaderID });
        else this.loadTrackInWorker(url, obj.trackLoaderID);
    }
}

//@ts-check

class SuperpoweredWebAudio {
    /**@type {object} */Superpowered;
    /**@type {AudioContext} */audioContext;

    constructor(/**@type {number}*/minimumSamplerate, /**@type {object}*/superpowered) {
        this.Superpowered = superpowered;
        this.audioContext = new AudioContext();
        if (this.audioContext.sampleRate < minimumSamplerate) {
            this.audioContext.close();
            this.audioContext = new AudioContext({ sampleRate: minimumSamplerate });
        }
    }

    getUserMediaForAudio(/**@type {object}*/constraints, /**@type {(stream:MediaStream)=>void}*/onPermissionGranted, /**@type {(reason:any)=>void}*/onPermissionDenied) {
        const finalConstraints = {};
        if (navigator.mediaDevices) {
            const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
            for (const constraint in supportedConstraints) if (constraints[constraint] !== undefined) finalConstraints[constraint] = constraints[constraint];
        }
        finalConstraints.audio = true;
        finalConstraints.video = false;
        if (constraints.fastAndTransparentAudio === true) {
            finalConstraints.echoCancellation = false;
            finalConstraints.disableLocalEcho = false;
            finalConstraints.autoGainControl = false;
            finalConstraints.audio = { mandatory: { googAutoGainControl: false, googAutoGainControl2: false, googEchoCancellation: false, googNoiseSuppression: false, googHighpassFilter: false, googEchoCancellation2: false, googNoiseSuppression2: false, googDAEchoCancellation: false, googNoiseReduction: false } };
        };
        try {
            navigator.mediaDevices.getUserMedia(/**@type {MediaStreamConstraints}*/(finalConstraints)).then(onPermissionGranted).catch(onPermissionDenied);
        } catch(error) {
            onPermissionDenied((location.protocol.toLowerCase() != 'https') && (location.hostname.toLowerCase() != 'localhost') ? 'Web Audio requires a secure context (HTTPS or localhost).' : error);
        }
    }

    /**@returns {Promise<MediaStream>} */
    async getUserMediaForAudioAsync(/**@type {object}*/constraints) {
        return new Promise((resolve, reject) => this.getUserMediaForAudio(constraints, (/**@type {MediaStream}*/stream) => {
            if (constraints.fastAndTransparentAudio === true) {
                const audioTracks = stream.getAudioTracks();
                for (const audioTrack of audioTracks) audioTrack.applyConstraints({ autoGainControl: false, echoCancellation: false, noiseSuppression: false });
            }
            resolve(stream);
        }, reject));
    }

    /**@returns {Promise<>} */
    async createAudioNodeAsync(/**@type {string}*/url, /**@type {string}*/className, /**@type {Function}*/onMessageFromAudioScope, /**@type {number}*/numInputs = 1, /**@type {number}*/numOutputs = 1) {
        return new Promise((resolve, reject) => this.createAudioNode(url, className, resolve, onMessageFromAudioScope, numInputs, numOutputs));
    }

    createAudioNode(/**@type {string}*/url, /**@type {string}*/className, /**@type {(node:AudioWorkletNode)=>void}*/callback, /**@type {Function}*/onMessageFromAudioScope, /**@type {number}*/numInputs = 1, /**@type {number}*/numOutputs = 1) {
        if (typeof AudioWorkletNode !== 'function') return;

        this.audioContext.audioWorklet.addModule(url).then(() => {
            const trackLoaderID = this.Superpowered.nextTrackLoaderID();
            const node = new AudioWorkletNode(this.audioContext, className, {
                processorOptions: {
                    wasmCode: this.Superpowered.wasmCode,
                    samplerate: this.audioContext.sampleRate,
                    maxChannels: this.Superpowered.__maxChannels__,
                    numberOfInputs: numInputs,
                    numberOfOutputs: numOutputs,
                    trackLoaderID: trackLoaderID
                },
                numberOfInputs: numInputs,
                numberOfOutputs: numOutputs,
                outputChannelCount: Array(numOutputs).fill(2)
            });
            this.Superpowered.registerTrackLoader(node);
            node['superpoweredWASMUrl'] = SuperpoweredGlue.wasmCDNUrl;
            node['destruct'] = () => {
                this.Superpowered.removeTrackLoader(trackLoaderID);
                node.port.postMessage('___superpowered___destruct___');
            }
            node['sendMessageToAudioScope'] = (/**@type {any}*/message, /**@type {Transferable[]}*/transfer = []) => node.port.postMessage(message, transfer);
            node.port.onmessage = (/**@type {MessageEvent} */event) => {
                if (this.Superpowered.handleTrackLoaderMessage(event)) return;
                if (event.data == '___superpowered___onready___') {
                    node['state'] = 1;
                    node['trackLoaderID'] = trackLoaderID;
                    callback(node);
                } else onMessageFromAudioScope(event.data);
            }
        });
    }
}

//@ts-ignore
if (typeof AudioWorkletProcessor === 'function') {
    //@ts-ignore
    class SuperpoweredAudioWorkletProcessor extends AudioWorkletProcessor {
        /**@type {object[]} */inputBuffers = [];
        /**@type {object[]} */outputBuffers = [];

        constructor(/**@type {object}*/options) {
            super();
            SuperpoweredGlue['__uint_max__sp__'] = options.processorOptions.maxChannels;
            this.trackLoaderID = options.processorOptions.trackLoaderID; 
            this.state = 0;
            //@ts-ignore
            this.port.onmessage = (/**@type {MessageEvent}*/event) => {
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
            SuperpoweredGlue.wasmCDNUrl = this['superpoweredWASMUrl'] ?? undefined;
            this.Superpowered['Initialize']();
            for (let n = this.numberOfInputs; n > 0; n--) this.inputBuffers.push(new this.Superpowered.Float32Buffer(128 * 2));
            for (let n = this.numberOfOutputs; n > 0; n--) this.outputBuffers.push(new this.Superpowered.Float32Buffer(128 * 2));
            this.onReady();
            //@ts-ignore
            this.port.postMessage('___superpowered___onready___');
            this.state = 1;
        }
        onReady() {}
        onDestruct() {}
        onMessageFromMainScope(/**@type {any}*/message) {}
        //@ts-ignore
        sendMessageToMainScope(/**@type {any}*/message) { this.port.postMessage(message); }
        processAudio(/** @type {object|object[]} */input, /** @type {object|object[]} */output, /**@type {number} */numFrames, /**@type {Object<string,Float32Array>} */parameters) {}
        process(/**@type {Float32Array[][]} */inputs, /**@type {Float32Array[][]} */outputs, /**@type {Object<string,Float32Array>} */parameters) {
            if (this.state < 0) return false;
            if (this.state == 1) {
                for (let n = this.numberOfInputs - 1; n >= 0; n--) {
                    if (inputs[n].length > 1) this.Superpowered.bufferToWASM(this.inputBuffers, inputs, n);
                    else this.Superpowered['memorySet'](this.inputBuffers[n].pointer, 0, 128 * 8);
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
}


export { SuperpoweredGlue, SuperpoweredWebAudio };
