/* eslint-disable */
// @ts-check
/// <reference lib="webworker" />

class LinearMemoryBuffer {
    /**@type {number} */pointer;
    /**@type {number} */length;
    /**@type {number} */_type;
    /**@type {SuperpoweredGlue} */_glue;
    /**@type {Int8Array|Int16Array|Int32Array|BigInt64Array|Uint8Array|Uint16Array|Uint32Array|BigUint64Array|Float32Array|Float64Array} */array;
    /**@type {any[]}*/ static _types = [null, Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, BigUint64Array, BigInt64Array, Float32Array, Float64Array];

    constructor(/**@type {number} */pointer, /**@type {number} */length, /**@type {number} */type, /**@type {SuperpoweredGlue}*/glue) {
        this.length = length;
        this._type = type;
        this._glue = glue;
        this.pointer = (pointer == 0) ? glue.malloc(length * LinearMemoryBuffer._types[this._type].BYTES_PER_ELEMENT) : pointer;
        this.update();
        this._glue.addBuffer(this);
    }

    update() {
        const ab = this._glue.linearMemory, t = LinearMemoryBuffer._types[this._type];
        this.array = new t(ab, this.pointer, (this.length < 0) ? Math.floor((ab.byteLength - this.pointer) / t.BYTES_PER_ELEMENT) : this.length);
    }

    free() {
        this._glue.free(this.pointer);
        this._glue.removeBuffer(this);
    }
}

class SuperpoweredGlue {
    static wasmCDNUrl = 'https://cdn.jsdelivr.net/npm/@superpoweredsdk/web@2.8.1/dist/superpowered-npm.wasm';

    /**@type {number}*/id = Math.floor(Math.random() * Date.now());
    /**@type {ArrayBuffer}*/linearMemory;
    /**@type {ArrayBuffer} */wasmCode;
    /**@type {boolean} */logMemory = true;

    /**@type {Map<number,object>}*/_trackLoaderReceivers = new Map();
    /**@type {number}*/_nextTrackLoaderReceiverID = 0;
    /**@type {Map<number,Set<LinearMemoryBuffer>>}*/_buffers = new Map();
    /**@type {object}*/_classUnderConstruction = null;
    /**@type {Map<string,Map<string,Function>>}*/_functionsWithNamespace = new Map();
    /**@type {object}*/_exportsToWASM;
    /**@type {Uint8Array}*/_memoryGrowArray;
    /**@type {number}*/_memoryGrowPointer;
    /**@type {WebAssembly.Instance}*/_wasmInstance;
    /**@type {string|undefined} */_trackLoaderSource = undefined;
    /**@type {Function} */_malloc;
    /**@type {Function} */_free;
    /**@type {Function} */_heapBase;
    /**@type {Function} */_stackSize;
    /**@type {Function} */_lastArrayLength;
    /**@type {Function} */_setInt64;
    /**@type {DataView} */_view;
    /**@type {boolean} */_littleEndian = (new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44);

    /**@type {object}*/ _activeSABPointerLoadPromises = {};
    /**@type {object}*/ _activeSABMemoryAllocationPromises = {};

    /**@typedef {{wasmCDNUrl?: string, sharedArrayBuffer?: boolean}} SuperpoweredGlueConfiguration */

    /**@returns {Promise<SuperpoweredGlue>} */
    static async Instantiate(
        /**@type {string}*/licenseKey, /**@type {string | SuperpoweredGlueConfiguration}*/wasmUrlOrConfigurationObject = SuperpoweredGlue.wasmCDNUrl) {
        let usingSharedArrayBuffer = false;
        if (wasmUrlOrConfigurationObject && Object.prototype.toString.call(wasmUrlOrConfigurationObject) === "[object Object]") {
            const config = /**@type {SuperpoweredGlueConfiguration}*/(wasmUrlOrConfigurationObject);
            if (config.wasmCDNUrl) SuperpoweredGlue.wasmCDNUrl = config.wasmCDNUrl;
            if (config.sharedArrayBuffer) usingSharedArrayBuffer = true;
        } else {
            SuperpoweredGlue.wasmCDNUrl = /**@type {string}*/(wasmUrlOrConfigurationObject);
        }
        const obj = new SuperpoweredGlue();
        const ab = await fetch(SuperpoweredGlue.wasmCDNUrl).then(response => response.arrayBuffer());
        await obj.loadFromArrayBuffer(usingSharedArrayBuffer ? SuperpoweredGlue.getWASMWithSharedArrayBufferEnabled(ab) : ab);
        obj['Initialize'](licenseKey);
        return obj;
    }

    async loadFromArrayBuffer(/**@type {ArrayBuffer}*/wasmCode, /**@type {object}*/afterWASMLoaded = null) {
        this.wasmCode = wasmCode;
        await WebAssembly.instantiate(wasmCode, { wasi_snapshot_preview1: this.wasi, env: this._exportsToWASM }).then((result) => {
            this.setInstance(result.instance);
            if (afterWASMLoaded != null) afterWASMLoaded.afterWASMLoaded();
        });
    }

    async loadFromModule(/**@type {BufferSource}*/module) {
        await WebAssembly.instantiate(module, { wasi_snapshot_preview1: this.wasi, env: this._exportsToWASM }).then((result) => this.setInstance(result.instance));
    }

    async loadFromURL(/**@type {string}*/url, /**@type {boolean}*/storeCode = true) {
        const wasmCode = await fetch(url).then(response => response.arrayBuffer());
        if (storeCode) this.wasmCode = wasmCode;
        await WebAssembly.instantiate(wasmCode, { wasi_snapshot_preview1: this.wasi, env: this._exportsToWASM }).then((result) => this.setInstance(result.instance));
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
        this._exportsToWASM = {
            consolelog: (/**@type {number}*/pointer, /**@type {number}*/strlen) => console.log(this.toString(pointer, strlen)),
            emscripten_notify_memory_growth: this._onMemoryGrowth.bind(this),
            __createClass__: this._createClass.bind(this),
            __createStaticProperty__: this._createStaticProperty.bind(this),
            __createStaticMethod__: this._createStaticMethod.bind(this),
            __createConstructor__: () => { },
            __createDestructor__: () => { },
            __createProperty__: this._createProperty.bind(this),
            __createMethod__: this._createMethod.bind(this),
            __createFunction__: this._createFunction.bind(this),
            __createClassConstant__: (/**@type {number}*/nameptr, /**@type {number}*/namelen, /**@type {number}*/value) => this._classUnderConstruction[this.toString(nameptr, namelen)] = value,
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
        this._wasmInstance = wasmInstance;
        /**@type {Function}*/(this._wasmInstance.exports._initialize)();

        this._lastArrayLength = /**@type {Function}*/(this._wasmInstance.exports.__lastarraylength__);
        this._malloc = /**@type {Function}*/(this._wasmInstance.exports.__malloc__);
        this._stackSize = /**@type {Function}*/(this._wasmInstance.exports.__stacksize__);
        this._heapBase = /**@type {Function}*/(this._wasmInstance.exports.__heapbase__);
        this._free = /**@type {Function}*/(this._wasmInstance.exports.__free__);
        this._setInt64 = /**@type {Function}*/(this._wasmInstance.exports.__setint64__);

        this.linearMemory = this._wasmInstance.exports.memory['buffer'];
        this._view = new DataView(this.linearMemory);
        this._memoryGrowPointer = this._malloc(16);
        this._memoryGrowArray = new Uint8Array(this.linearMemory, this._memoryGrowPointer, 16);

        const outputBuffer = this._malloc(1024), stringview = new Uint8Array(this.linearMemory, this._malloc(1024), 1024), demangle = /**@type {Function}*/(this._wasmInstance.exports.__demangle__);
        for (const name in this._wasmInstance.exports) if (name != '__demangle__') {
            const length = demangle(this.toWASMString(name, stringview), outputBuffer), func = /**@type {Function}*/(this._wasmInstance.exports[name]);
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
                    let map = this._functionsWithNamespace.get(split[0]);
                    if (!map) {
                        map = new Map();
                        this._functionsWithNamespace.set(split[0], map);
                    }
                    map.set(split[1], func);
                }
                this[demangledName] = func;
            } else this[name] = func;
        }
        this._free(outputBuffer);
        this._free(stringview.byteOffset);

        /**@type {Function}*/(this._wasmInstance.exports.__initialize__)();
        for (const [name, map] of this._functionsWithNamespace) map.clear();
        this._functionsWithNamespace.clear();
        this._logMemory();
        this._classUnderConstruction = null;
    }

    /**@returns {LinearMemoryBuffer|number|undefined} */
    returnPointerToView(/**@type {number|undefined}*/pointer, /**@type {number}*/type) {
        if ((type < 1) || (pointer == undefined)) return pointer;
        const length = this._lastArrayLength();
        return new LinearMemoryBuffer(pointer, length > 0 ? length : -1, type, this);
    }

    /**@returns {LinearMemoryBuffer|number|undefined} */
    _invokeFunction(/**@type {number}*/pointerToInstance, /**@type {Function} */func, /**@type {number} */returnPointerType) {
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

    _createClass(/**@type {number}*/classnamePointer, /**@type {number}*/classnameLen, /**@type {number}*/sizeofClass) {
        const classname = this.toString(classnamePointer, classnameLen), glue = this, O = class {
            /**@type {string} */className = classname;
            /**@type {number} */pointerToInstance;

            constructor() {
                const constructorFunction = glue[classname + '::' + classname], args = [].slice.call(arguments);
                if (constructorFunction == undefined) throw classname + ' has no constructor'; else args.unshift(glue.malloc(sizeofClass));
                this.pointerToInstance = constructorFunction.apply(null, args);
                const meta = Object.getPrototypeOf(this).constructor.classInfo;
                for (const property of meta.properties) glue.createPropertyFromDescriptor(this, property);
                for (const method of meta.methods) this[method.name] = glue._invokeFunction.bind(glue, this.pointerToInstance, method.function, method.returnPointerType);
            }

            destruct() {
                glue[classname + '::~' + classname]?.(this.pointerToInstance);
                glue.free(this.pointerToInstance);
                Object.getOwnPropertyNames(this).forEach((property) => delete this[property]);
                Object.setPrototypeOf(this, null);
            }
        }
        O.classInfo = { name: classname, properties: [], methods: [] }
        this._classUnderConstruction = this[classname] = O;
        this._functionsWithNamespace.delete(classname);
    }

    /**@returns {number|bigint|undefined} */
    _read(/**@type {number} */pointer, /**@type {number} */type) {
        switch (type) {
            case 1: return this._view.getUint8(pointer);
            case 2: return this._view.getInt8(pointer);
            case 3: return this._view.getUint16(pointer, this._littleEndian);
            case 4: return this._view.getInt16(pointer, this._littleEndian);
            case 5: return this._view.getUint32(pointer, this._littleEndian);
            case 6: return this._view.getInt32(pointer, this._littleEndian);
            case 7: return this._view.getBigUint64(pointer, this._littleEndian);
            case 8: return this._view.getBigInt64(pointer, this._littleEndian);
            case 9: return this._view.getFloat32(pointer, this._littleEndian);
            case 10: return this._view.getFloat64(pointer, this._littleEndian);
        }
        return undefined;
    }

    _write(/**@type {number} */pointer, /**@type {number} */type, /**@type {number|bigint} */value) {
        switch (type) {
            case 1: this._view.setUint8(pointer, /**@type {number}*/(value)); break;
            case 2: this._view.setInt8(pointer, /**@type {number}*/(value)); break;
            case 3: this._view.setUint16(pointer, /**@type {number}*/(value), this._littleEndian); break;
            case 4: this._view.setInt16(pointer, /**@type {number}*/(value), this._littleEndian); break;
            case 5: this._view.setUint32(pointer, /**@type {number}*/(value), this._littleEndian); break;
            case 6: this._view.setInt32(pointer, /**@type {number}*/(value), this._littleEndian); break;
            case 7: this._view.setBigUint64(pointer, /**@type {bigint}*/(value), this._littleEndian); break;
            case 8: this._view.setBigInt64(pointer, /**@type {bigint}*/(value), this._littleEndian); break;
            case 9: this._view.setFloat32(pointer, /**@type {number}*/(value), this._littleEndian); break;
            case 10: this._view.setFloat64(pointer, /**@type {number}*/(value), this._littleEndian); break;
        }
    }

    _createProperty(/**@type {number}*/propertynamePointer, /**@type {number}*/propertynameLen, /**@type {number}*/offset, /**@type {number}*/viewType, /**@type {number}*/viewLength) {
        this._classUnderConstruction.classInfo.properties.push({ name: this.toString(propertynamePointer, propertynameLen), offset: offset, viewType: viewType, viewLength: viewLength });
    }

    createPropertyFromDescriptor(/**@type {object}*/object, /**@type {object}*/descriptor) {
        const basePointer = object?.pointerToInstance ?? 0;
        if (descriptor.viewLength > 1) {
            const buffer = new LinearMemoryBuffer(basePointer + descriptor.offset, descriptor.viewLength, descriptor.viewType, this);
            Object.defineProperty(object, descriptor.name, {
                get: function () { return buffer.array; },
                configurable: true,
                enumerable: true
            });
        } else Object.defineProperty(object, descriptor.name, {
            get: () => { return this._read(basePointer + descriptor.offset, descriptor.viewType); },
            set: (value) => { this._write(basePointer + descriptor.offset, descriptor.viewType, value); },
            configurable: true,
            enumerable: true
        });
    }

    _createStaticProperty(/**@type {number}*/propertynamePointer, /**@type {number}*/propertynameLen, /**@type {number}*/pointer, /**@type {number}*/viewType, /**@type {number}*/viewLength) {
        this.createPropertyFromDescriptor(this._classUnderConstruction, { name: this.toString(propertynamePointer, propertynameLen), offset: pointer, viewType: viewType, viewLength: viewLength });
    }

    _createMethod(/**@type {number}*/methodnamePointer, /**@type {number}*/methodnameLen, /**@type {number}*/returnPointerType) {
        const methodname = this.toString(methodnamePointer, methodnameLen);
        this._classUnderConstruction.classInfo.methods.push({ name: methodname, function: this[this._classUnderConstruction.classInfo.name + '::' + methodname], returnPointerType: returnPointerType });
    }

    _createStaticMethod(/**@type {number}*/methodnamePointer, /**@type {number}*/methodnameLen, /**@type {number}*/returnPointerType) {
        const methodname = this.toString(methodnamePointer, methodnameLen), wasmMethodname = this._classUnderConstruction.classInfo.name + '::' + methodname;
        this._classUnderConstruction[methodname] = this._invokeFunction.bind(this, 0, this[wasmMethodname], returnPointerType);
    }

    _createFunction(/**@type {number}*/methodnamePointer, /**@type {number}*/methodnameLen, /**@type {number}*/returnPointerType) {
        const methodname = this.toString(methodnamePointer, methodnameLen);
        if (!this[methodname]) { // maybe this function is in a namespace
            for (const [namespace, map] of this._functionsWithNamespace) {
                const method = map.get(methodname);
                if (method != undefined) {
                    this[methodname] = method;
                    map.delete(methodname);
                    break;
                }
            }
            if (!this[methodname]) return;
        }
        this[methodname] = this._invokeFunction.bind(this, 0, this[methodname], returnPointerType);
    }

    exportToWasm(/**@type {string}*/functionName, /**@type {Function}*/f) {
        this._exportsToWASM[functionName] = () => {
            const r = f.apply(f, arguments);
            return (r.array != undefined) ? r.array.byteOffset : r;
        }
    }

    _onMemoryGrowth(/**@type {number}*/n) {
        this.linearMemory = this._wasmInstance.exports.memory['buffer'];
        this._view = new DataView(this.linearMemory);
        if (this._memoryGrowArray.buffer.byteLength < 1) this._updateMemoryViews();
        this._logMemory();
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
    _niceSize(/**@type {number}*/bytes) {
        if (bytes == 0) return '0 byte'; else if (bytes == 1) return '1 byte';
        const postfix = [' bytes', ' kb', ' mb', ' gb', ' tb'], n = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, n)) + postfix[n];
    }

    _logMemory() {
        if (this.logMemory) console.log('WASM ' + (Object.prototype.toString.call(this.linearMemory) === '[object ArrayBuffer]' ? 'memory' : 'shared memory') + ': ' + this._niceSize(this._stackSize()) + ' stack, ' + this._niceSize(this.linearMemory.byteLength - this._heapBase()) + ' heap, ' + this._niceSize(this.linearMemory.byteLength) + ' total.');
    }

    malloc(/**@type {number}*/bytes) {
        const pointer = this._malloc(bytes);
        if (this._memoryGrowArray.buffer.byteLength < 1) this._updateMemoryViews();
        return pointer;
    }

    _updateMemoryViews() {
        for (const [pointer, set] of this._buffers) for (const buffer of set) buffer.update();
        this._memoryGrowArray = new Uint8Array(this.linearMemory, this._memoryGrowPointer, 16);
    }

    addBuffer(/**@type {LinearMemoryBuffer} */buffer) {
        const existing = this._buffers.get(buffer.pointer);
        if (existing) existing.add(buffer); else this._buffers.set(buffer.pointer, new Set([buffer]));
    }

    removeBuffer(/**@type {LinearMemoryBuffer} */buffer) {
        const set = this._buffers.get(buffer.pointer);
        if (!set) return; else set.delete(buffer);
        if (set.size < 1) this._buffers.delete(buffer.pointer);
    }

    free(/**@type {number}*/pointer) {
        const set = this._buffers.get(pointer);
        if (set) {
            set.clear();
            this._buffers.delete(pointer);
        }
        this._free(pointer);
    }

    setInt64(/**@type {number}*/pointer, /**@type {number}*/index, /**@type {number}*/value) {
        this._setInt64(pointer, index, value);
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
            postMessage({ '__transfer__': arrayBuffer, }, [arrayBuffer]);
        });
    }

    static loaderWorkerOnmessage(/**@type {MessageEvent}*/message) {
        if (typeof message.data.load === 'string') SuperpoweredGlue.loaderWorkerMain(message.data.load);
    }

    /**@returns {number} */
    registerTrackLoader(/**@type {object}*/receiver) {
        if (typeof receiver.terminate !== 'undefined') receiver.addEventListener('message', this.handleTrackLoaderMessage); // Worker
        this._trackLoaderReceivers.set(this._nextTrackLoaderReceiverID++, (typeof receiver.port !== 'undefined') ? receiver.port : receiver);
        return this._nextTrackLoaderReceiverID - 1;
    }

    removeTrackLoader(/**@type {number} */trackLoaderID) { this._trackLoaderReceivers.delete(trackLoaderID); }
    /**@returns {number} */nextTrackLoaderID() { return this._nextTrackLoaderReceiverID; }

    handleTrackLoaderMessage(/**@type {MessageEvent}*/message) {
        if (typeof message.data.SuperpoweredLoad !== 'string') return false;
        this.loadTrackInWorker(message.data.SuperpoweredLoad, message.data.trackLoaderID);
        return true;
    }

    async loadTrackInWorker(/**@type {string}*/url, /**@type {number}*/trackLoaderID) {
        if (this._trackLoaderSource == undefined) this._trackLoaderSource = URL.createObjectURL(new Blob([SuperpoweredGlue.toString() + "\r\n\r\nonmessage = SuperpoweredGlue.loaderWorkerOnmessage;" + `\r\n\r\nSuperpoweredGlue.wasmCDNUrl = "${SuperpoweredGlue.wasmCDNUrl}";`], { type: 'application/javascript' }));
        const trackLoaderWorker = new Worker(this._trackLoaderSource);
        trackLoaderWorker['__url__'] = url;
        trackLoaderWorker['trackLoaderID'] = trackLoaderID;
        trackLoaderWorker.onmessage = (/**@type {MessageEvent}*/message) => this.transferLoadedTrack(message.data.__transfer__, trackLoaderWorker);
        if ((typeof window !== 'undefined') && (typeof window.location !== 'undefined') && (typeof window.location.origin !== 'undefined')) url = new URL(url, window.location.origin).toString();
        trackLoaderWorker.postMessage({ load: url });
    }

    transferLoadedTrack(/**@type {ArrayBuffer}*/arrayBuffer,/**@type {Worker} */trackLoaderWorker) {
        const receiver = this._trackLoaderReceivers.get(trackLoaderWorker['trackLoaderID']);
        if (receiver == undefined) return;
        if (typeof receiver.postMessage === 'function') receiver.postMessage({ SuperpoweredLoaded: { buffer: arrayBuffer, url: trackLoaderWorker['__url__'] } }, [arrayBuffer]);
        else receiver({ SuperpoweredLoaded: { buffer: arrayBuffer, url: trackLoaderWorker['__url__'] } });
        trackLoaderWorker.terminate();
    }

    downloadAndDecode(/**@type {string}*/url, /**@type {object}*/obj) {
        if (obj.trackLoaderID === undefined) return;
        if ((typeof obj.onMessageFromMainScope === 'function') && (typeof obj.sendMessageToMainScope === 'function')) obj.sendMessageToMainScope({ SuperpoweredLoad: url, trackLoaderID: obj.trackLoaderID });
        else this.loadTrackInWorker(url, obj.trackLoaderID);
    }

    async downloadAndDecodeIntoSharedMemoryPointer(
        /**@type {string}*/ url,
        /**@type {number}*/ sharedMemoryPointer,
        /**@type {boolean}*/ requestDecoderMetadata,
        /**@type {boolean}*/ requestOfflineAnalyserMetadata,
        /**@type {SuperpoweredAudioWorkletNode | SharedArrayBuffer}*/ target = undefined
    ) {

        if (!(target?.sendMessageToAudioScope) && !(target instanceof SharedArrayBuffer) && (target !== undefined)) {
            throw new Error("When calling this function form the main thread or a Worker, the 'target' parameter must be either a SuperpoweredAudioWorkletNode or a SharedArrayBuffer instance.");
        }
        if (target instanceof SharedArrayBuffer) {
            return this._downloadAndDecodeDirectlyIntoSharedMemoryPointer(
                url,
                sharedMemoryPointer,
                requestDecoderMetadata,
                requestOfflineAnalyserMetadata,
                this,
                target
            );
        } else {
            let scope = target;
            if (typeof Worker === "undefined") {
                if (scope) {
                    throw new Error(
                        "the targetSuperpoweredAudioWorkletNode parameter must not be provided when calling downloadAndDecodeIntoSharedMemoryPointer from in AudioWorklet. To load audio into Shared Memory from an AudioWorklet other than the one its called from, you should call this method from the main thread, passing the reference to the SuperpoweredAudioWorkletNode as the targetSuperpoweredAudioWorkletNode parameter."
                    );
                } else {
                    scope = this;
                }
            }

            if (!scope.sabLoaderResolutionPromises) scope.sabLoaderResolutionPromises = {};

            if (typeof Worker !== "undefined") {
                // We are on the main thread or a worker, so spin up a worker directly
                // Check if there is already a load operation in progress for this Shared Memory pointer
                if (scope.sabLoaderResolutionPromises[sharedMemoryPointer]) {
                    throw new Error("A load operation is already in progress for this Shared Memory pointer.")
                } else {
                    return new Promise(async (resolve, reject) => {
                        // Save the resolve and reject functions for this load operation to prevent duplicate requests for the same pointer (only from the same scope!)
                        scope.sabLoaderResolutionPromises[sharedMemoryPointer] = {
                            resolve,
                            reject,
                        };
                        try {
                            const response = await this._spinUpWorkerForSabFetch(
                                url,
                                sharedMemoryPointer,
                                scope.sharedArrayBuffer,
                                requestDecoderMetadata,
                                requestOfflineAnalyserMetadata
                            );
                            scope.sabLoaderResolutionPromises[sharedMemoryPointer].resolve(response);
                            delete scope.sabLoaderResolutionPromises[sharedMemoryPointer];
                        } catch (e) {
                            if (scope.sabLoaderResolutionPromises[sharedMemoryPointer]) {
                                scope.sabLoaderResolutionPromises[sharedMemoryPointer].reject(e);
                            } else {
                                throw new Error("No load operation found to reject for this Shared Memory pointer.");
                            }
                        }
                    });
                }
            } else {
                // We are in an AudioWorklet
                return new Promise((resolve, reject) => {
                    if (scope.sabLoaderResolutionPromises[sharedMemoryPointer]) {
                        return reject(
                            new Error(
                                "A load operation is already in progress for this Shared Memory pointer."
                            )
                        );
                    }
                    scope.sabLoaderResolutionPromises[sharedMemoryPointer] = {
                        resolve,
                        reject,
                    };
                    scope.sendMessageToMainScope({
                        type: "__superpowered_spawn_sab_loader__",
                        assetUrl: url,
                        sharedMemoryPointer: sharedMemoryPointer,
                        trackLoaderID: scope.trackLoaderID,
                        sharedArrayBuffer: scope.Superpowered.linearMemory,
                        requestDecoderMetadata,
                        requestOfflineAnalyserMetadata,
                    });
                });
            }
        }
    }

    async _downloadAndDecodeDirectlyIntoSharedMemoryPointer(
    /**@type {string}*/ url,
    /**@type {number}*/ sharedMemoryPointer,
    /**@type {boolean}*/ requestDecoderMetadata,
    /**@type {boolean}*/ requestOfflineAnalyserMetadata,
    /**@type {SuperpoweredGlue}*/ superpoweredGlueInstance,
    /**@type {SharedArrayBuffer} */ sharedArrayBuffer
    ) {
        return new Promise(async (resolve, reject) => {

            if (typeof Worker === "undefined") {
                if (superpoweredGlueInstance) {
                    throw new Error(
                        "superpoweredGlueInstance must not be provided when calling downloadAndDecodeIntoSharedMemory from a Worklet."
                    );
                } else {
                    superpoweredGlueInstance = this;
                }
            }

            if (!superpoweredGlueInstance.sabLoaderResolutionPromises) { superpoweredGlueInstance.sabLoaderResolutionPromises = {}; }
            superpoweredGlueInstance.sabLoaderResolutionPromises[sharedMemoryPointer] = { resolve, reject };

            const response = await this._spinUpWorkerForSabFetch(
                url,
                sharedMemoryPointer,
                sharedArrayBuffer,
                requestDecoderMetadata,
                requestOfflineAnalyserMetadata
            );
            superpoweredGlueInstance.sabLoaderResolutionPromises[sharedMemoryPointer].resolve(response);
        });
    }

    createReservedMemoryPointer(
        /**@type {number} */ bytesToReserve,
        /**@type {SuperpoweredAudioWorkletNode | undefined}  */ scope = undefined
    ) {
        // Check is paramters supplied have decimal places
        if (scope) {
            // If scope is provided, then the function is being called from the main thread
            // So we need to send a message to the audio thread to allocate the memory and send back the pointer to the main thread

            if (typeof scope.sendMessageToAudioScope !== "function") {
                throw new Error(
                    "In incorrect AudioWorkletNode was provided as the scope parameter. Maybe it was not created in the main thread via SuperpoweredGlue.createAudioNodeAsync()?"
                );
            }

            return new Promise((resolve, reject) => {
                if (this._activeSABMemoryAllocationPromises[scope.trackLoaderID]) {
                    throw new Error(
                        "There is already an active memory allocation request for this AudioWorkletNode. Wait for it to complete before making another request."
                    );
                }
                this._activeSABMemoryAllocationPromises[scope.trackLoaderID] = {
                    resolve: resolve,
                    reject: reject,
                };

                scope.sendMessageToAudioScope({
                    type: "___superpowered_request_sab_memory_pointer___",
                    bytesToReserve
                });
            });
        } else {
            // If scope is not provided, then the function has been called from the audio thread
            // so we can allocate memory directly to the SAB

            // Allocate memory on the shared array buffer for the decoded audio
            // seconds * samplerate * 2 channel (always 2 channels!) * Float32 value byte size


            const memoryPointer = this.malloc(bytesToReserve);
            return memoryPointer;
        }
    }

    createReservedMemoryPointerFromDuration(
        /**@type {number} */ maxLengthSeconds,
        /**@type {number} */ sourceSampleRate,
        /**@type {SuperpoweredAudioWorkletNode | undefined}  */ scope = undefined
    ) {
        // Check is paramters supplied have decimal places
        if (!Number.isInteger(maxLengthSeconds) || !Number.isInteger(sourceSampleRate)) {
            throw new Error("maxLengthSeconds and sampleRate must be integers.");
        }

        // seconds * samplerate * 2 channel (always 2 channels!) * Float32 value byte size
        const calculatedtotalBytesToReserve = maxLengthSeconds * sourceSampleRate * 2 * 4;

        if (scope) {
            // If scope is provided, then the function is being called from the main thread
            // So we need to send a message to the audio thread to allocate the memory and send back the pointer to the main thread

            if (typeof scope.sendMessageToAudioScope !== "function") {
                throw new Error(
                    "In incorrect AudioWorkletNode was provided as the scope parameter. Maybe it was not created in the main thread via SuperpoweredGlue.createAudioNodeAsync()?"
                );
            }

            return new Promise((resolve, reject) => {
                if (this._activeSABMemoryAllocationPromises[scope.trackLoaderID]) {
                    throw new Error(
                        "There is already an active memory allocation request for this AudioWorkletNode. Wait for it to complete before making another request."
                    );
                }
                this._activeSABMemoryAllocationPromises[scope.trackLoaderID] = {
                    resolve: resolve,
                    reject: reject,
                };


                scope.sendMessageToAudioScope({
                    type: "___superpowered_request_sab_memory_pointer___",
                    bytesToReserve: calculatedtotalBytesToReserve
                });
            });
        } else {
            // If scope is not provided, then the function has been called from the audio thread
            // so we can allocate memory directly to the SAB

            const memoryPointer = this.malloc(calculatedtotalBytesToReserve);
            return memoryPointer;
        }
    }

    static async _downloadAndDecodeIntoSharedMemory(event) {
        const {
            url,
            sharedArrayBufferPointer,
            sharedArrayBuffer,
            superpoweredWasm,
            requestDecoderMetadata,
            requestOfflineAnalyserMetadata,
        } = event.data;
        let superpowered = new SuperpoweredGlue();
        superpowered.logMemory = false;
        await superpowered.loadFromArrayBuffer(superpoweredWasm);
        SuperpoweredGlue["__uint_max__sp__"] = 255;
        superpowered.Initialize("");

        let loadStatus = "Not started";
        try {
            // Fetch the asset
            let response = await fetch(url);
            if (!response.ok) {
                throw new Error("HTTP fetch error " + response.status);
            }
            let audiofileArrayBuffer = await response.arrayBuffer();
            let audiofileInWASMHeap =
                superpowered.arrayBufferToWASM(audiofileArrayBuffer);

            // Decode the asset
            let audioInMemoryFormat = superpowered["Decoder"].decodeToAudioInMemory(
                audiofileInWASMHeap,
                audiofileArrayBuffer.byteLength
            );

            if (audioInMemoryFormat === 0) {
                loadStatus = "Decode failed";
                throw new Error("Superpowered Decoder failed to decode the audio data.");
            }

            // Write the decoded audio in Shared Memory
            const view = new DataView(
                superpowered.linearMemory,
                audioInMemoryFormat + 16,
                16
            );
            const numBytes = Number(view.getBigUint64(8, true)) * 4;
            const sampleRate = Number(view.getBigUint64(0, true));

            const newArray = new Uint8Array(
                superpowered.linearMemory,
                audioInMemoryFormat + 48, // 48 bytes for the main table
                numBytes
            );
            new Uint8Array(sharedArrayBuffer, sharedArrayBufferPointer, numBytes).set(
                newArray
            );

            const metadata = {
                decoder: null,
                analyser: null,
            };

            const durationSeconds = numBytes / (sampleRate * 2 * 2);

            if (requestDecoderMetadata) {
                try {
                    metadata.decoder = {};
                    let decoder = new superpowered.Decoder();
                    // Opens a memory location in Superpowered AudioInMemory format for decoding.
                    let openErrorCode = decoder.openMemory(audioInMemoryFormat, true);
                    loadStatus = superpowered.Decoder.statusCodeToString(
                        openErrorCode // The error code.
                    );
                    if (openErrorCode !== superpowered.Decoder.OpenSuccess) {
                        throw new Error(
                            "Superpowered Decoder failed to open the audio data: " +
                            superpowered.Decoder.statusCodeToString(openErrorCode)
                        );
                    }
                    decoder.parseAllID3Frames(true, 16384);
                    const FORMATS = {
                        [superpowered.Decoder.Format_MP3]: "MP3",
                        [superpowered.Decoder.Format_AAC]: "AAC",
                        [superpowered.Decoder.Format_AIFF]: "AIFF",
                        [superpowered.Decoder.Format_WAV]: "WAV",
                    };
                    const format = decoder.getFormat();
                    metadata.decoder.format = FORMATS[format] || "Unknown";

                    metadata.decoder.id3 = {};
                    metadata.decoder.id3.artist = superpowered.toString(
                        decoder.getArtist().pointer
                    );
                    metadata.decoder.id3.title = superpowered.toString(
                        decoder.getTitle().pointer
                    );
                    metadata.decoder.id3.album = superpowered.toString(
                        decoder.getAlbum().pointer
                    );
                    metadata.decoder.id3.bpm = decoder.getBPM();
                    metadata.decoder.id3.trackIndex = decoder.getTrackIndex();
                } catch (e) {
                    console.error(e);
                    throw new Error("Superpowered Decoder metadata extraction failed");
                }
            }

            if (requestOfflineAnalyserMetadata) {
                try {
                    // Create empty float buffer which is exactly the right length
                    const floatBuffer = new superpowered.Float32Buffer(numBytes * 2);
                    // Create analyser instance
                    const analyzer = new superpowered.Analyzer(
                        sampleRate, // The sample rate of the audio input.
                        durationSeconds // The length in seconds of the audio input. The analyzer will not be able to process more audio than this. You can change this value in the process() method.
                    );
                    // Make conversion to float for analysis
                    superpowered.ShortIntToFloat(
                        audiofileInWASMHeap,
                        floatBuffer.pointer,
                        numBytes,
                        2
                    );
                    // Process the analyser
                    analyzer.process(
                        floatBuffer.pointer,
                        numBytes, // buffer size / size of float / divided by two because its interleaved
                        -1
                    );
                    // Generate the analyser results
                    analyzer.makeResults(
                        60,
                        200,
                        0,
                        0,
                        true,
                        0,
                        false,
                        false,
                        true
                    );
                    // Save to payload to return
                    metadata.analyser = {
                        peakDb: analyzer.peakDb,
                        averageDb: analyzer.averageDb,
                        loudpartsAverageDb: analyzer.loudpartsAverageDb,
                        bpm: analyzer.bpm,
                        beatgridStartMs: analyzer.beatgridStartMs,
                        keyIndex: analyzer.keyIndex,
                        waveformSize: analyzer.waveformSize,
                        overviewSize: analyzer.overviewSize,
                    };
                } catch (e) {
                    console.error(e);
                    throw new Error("Superpowered Analyser metadata extraction failed");
                }
            }

            // Report success back to the main thread with the payloads
            self.postMessage({
                type: "success",
                url,
                numBytes,
                sampleRate,
                loadStatus,
                durationSeconds,
                metadata,
            });

            self.postMessage({
                type: "terminate",
            });
        } catch (e) {
            self.postMessage({
                type: "error",
                url,
                reason: e.message,
            });
        }
    }

    _spinUpWorkerForSabFetch(
        assetUrl,
        sharedMemoryPointer,
        sharedArrayBuffer,
        requestDecoderMetadata,
        requestOfflineAnalyserMetadata
    ) {
        return new Promise((resolve, reject) => {
            // Load the worker script into a blob
            const sabTrackLoaderWorkerScriptSource = URL.createObjectURL(
                new Blob(
                    [
                        SuperpoweredGlue.toString() +
                        "\r\n\r\n" +
                        LinearMemoryBuffer.toString() +
                        "\r\n\r\nself.onmessage = SuperpoweredGlue._downloadAndDecodeIntoSharedMemory;",
                    ],
                    { type: "application/javascript" }
                )
            );

            let downloadAndDecodeIntoSharedMemoryWorker = new Worker(
                sabTrackLoaderWorkerScriptSource
            );

            downloadAndDecodeIntoSharedMemoryWorker.onmessage = function (
                inboundWorkerMessage
            ) {
                if (inboundWorkerMessage.data.type === "success") {
                    resolve({
                        numBytes: inboundWorkerMessage.data.numBytes,
                        sampleRate: inboundWorkerMessage.data.sampleRate,
                        durationSeconds: inboundWorkerMessage.data.durationSeconds,
                        loadStatus: inboundWorkerMessage.data.loadStatus,
                        metadata: inboundWorkerMessage.data.metadata,
                        url: inboundWorkerMessage.data.url,
                    });
                } else if (inboundWorkerMessage.data.type === "terminate") {
                    downloadAndDecodeIntoSharedMemoryWorker.terminate();
                } else if (inboundWorkerMessage.data.type === "error") {
                    downloadAndDecodeIntoSharedMemoryWorker.terminate();
                    reject(new Error(inboundWorkerMessage.data.reason));
                }
            };

            // Fire off the worker to do its thing
            downloadAndDecodeIntoSharedMemoryWorker.postMessage({
                url: assetUrl,
                sharedArrayBufferPointer: sharedMemoryPointer,
                sharedArrayBuffer: sharedArrayBuffer,
                superpoweredWasm: this.wasmCode,
                requestDecoderMetadata,
                requestOfflineAnalyserMetadata,
            });
        });
    }

    async _handleRequestToSpawnSABWorker(requestDetail) {
        try {
            let loadedData = await this._spinUpWorkerForSabFetch(
                requestDetail.assetUrl,
                requestDetail.sharedMemoryPointer,
                requestDetail.sharedArrayBuffer,

                requestDetail.requestDecoderMetadata,
                requestDetail.requestOfflineAnalyserMetadata
            );

            if (requestDetail.trackLoaderID !== undefined) {
                const receiver = this._trackLoaderReceivers.get(
                    requestDetail.trackLoaderID
                );
                if (receiver == undefined) return;
                if (typeof receiver.postMessage === "function") {
                    receiver.postMessage({
                        type: "___superpowered_sab_asset_loaded___",
                        metadata: loadedData,
                        sharedMemoryPointer: requestDetail.sharedMemoryPointer,
                    });
                }
            }
            loadedData = null;
        } catch (e) {
            console.error("Error in handleRequestToSpawnSABWorker", e);
            throw new Error(
                `Unable to spawn worker to load SAB asset: ${requestDetail.assetUrl}`
            );
        }
    }
}

//@ts-check

class SuperpoweredWebAudio {
    /**@type {object} */Superpowered;
    /**@type {AudioContext} */audioContext;

    constructor(/**@type {number}*/minimumSamplerate, /**@type {object}*/superpowered, /**@type {AudioContext}*/audioContext) {
        this.Superpowered = superpowered;
        if (audioContext && !(audioContext instanceof AudioContext)) {
            throw new Error('Invalid AudioContext provided to SuperpoweredWebAudio constructor.');
        }
        this.audioContext = audioContext ?? new AudioContext();
        if (this.audioContext.sampleRate < minimumSamplerate) {
            if (audioContext) {
                throw new Error(`The provided AudioContext has a sample rate of ${this.audioContext.sampleRate}, but the minimum required sample rate is ${minimumSamplerate}.`);
            }
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
                    trackLoaderID: trackLoaderID,
                    useSharedArrayBuffer: this.Superpowered._useSharedArrayBuffer
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
            node.port.onmessage = (/**@type {MessageEvent} */ event) => {
                if (this.Superpowered.handleTrackLoaderMessage(event)) return;
                if (event.data.type == "__superpowered_spawn_sab_loader__") {
                    this.Superpowered._handleRequestToSpawnSABWorker(event.data);
                    event.data.sharedArrayBuffer = null;
                } else if (event.data.type == "___superpowered_request_sab_memory_pointer_complete___") {
                    this.Superpowered._activeSABMemoryAllocationPromises[
                        event.data.trackLoaderID
                    ].resolve(event.data.pointer);
                    delete this.Superpowered._activeSABMemoryAllocationPromises[
                        event.data.trackLoaderID
                    ];
                } else if (event.data.type == "___superpowered___onready___") {
                    node["state"] = 1;
                    node["trackLoaderID"] = trackLoaderID;
                    if (event.data.sharedArrayBuffer) {
                        node["sharedArrayBuffer"] = event.data.sharedArrayBuffer;
                    }
                    callback(node);
                } else onMessageFromAudioScope(event.data);
            };
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
            this.port.onmessage = async (/**@type {MessageEvent}*/event) => {
                if (event.data == '___superpowered___destruct___') {
                    this.state = -1;
                    this.onDestruct();
                } else if (event.data.type == "___superpowered_sab_asset_loaded___") {
                    this.sabLoaderResolutionPromises[
                        event.data.sharedMemoryPointer
                    ].resolve(event.data.metadata);
                    event.data.metadata = null;
                    delete this.sabLoaderResolutionPromises[event.data.sharedMemoryPointer];
                    return;
                } else if (
                event.data.type == "___superpowered_request_sab_memory_pointer___"
                ) {
                    const memoryPointer =
                        await this.Superpowered.createReservedMemoryPointer(
                        event.data.bytesToReserve,
                        null
                        );

                    this.sendMessageToMainScope({
                        type: "___superpowered_request_sab_memory_pointer_complete___",
                        pointer: memoryPointer,
                        trackLoaderID: this.trackLoaderID,
                    });
                } else this.onMessageFromMainScope(event.data);
            };
            this.samplerate = options.processorOptions.samplerate;
            this.Superpowered = new SuperpoweredGlue();
            this.Superpowered.loadFromArrayBuffer(
                options.processorOptions.useSharedArrayBuffer
                    ? SuperpoweredGlue.getWASMWithSharedArrayBufferEnabled(
                        options.processorOptions.wasmCode
                    )
                    : options.processorOptions.wasmCode,
                this
            );
            this.Superpowered.downloadAndDecodeIntoSharedMemoryPointer = this.Superpowered.downloadAndDecodeIntoSharedMemoryPointer.bind(this);
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
            this.port.postMessage({
                type: '___superpowered___onready___',
                sharedArrayBuffer: this.Superpowered.linearMemory,
            });
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
