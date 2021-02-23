import { SuperpoweredGlue } from './SuperpoweredGlueModule.js';
import { SuperpoweredTrackLoader } from './SuperpoweredTrackLoaderModule.js';

class SuperpoweredWebAudio {
    constructor(minimumSamplerate, superpowered) {
        this.Superpowered = superpowered;
        this.audioContext = null;
        let AudioContext = window.AudioContext || window.webkitAudioContext || false;
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
            let supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
            for (let constraint in supportedConstraints) {
                if (supportedConstraints.hasOwnProperty(constraint) && (constraints[constraint] !== undefined)) {
                    finalConstraints[constraint] = constraints[constraint];
                }
            }
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

        navigator.getUserMediaMethod = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        if (navigator.getUserMediaMethod) navigator.getUserMediaMethod(finalConstraints, onPermissionGranted, onPermissionDenied);
        else {
            let userMedia = null;
            let userMediaError = false;

            try {
                userMedia = navigator.mediaDevices.getUserMedia;
            } catch(error) {
                if ((location.protocol.toLowerCase() != 'https') && (location.hostname.toLowerCase() != 'localhost')) onPermissionDenied("Web Audio requires a secure context (HTTPS or localhost).");
                else onPermissionDenied(error);
                userMediaError = true;
            }

            if (!userMediaError) {
                if (userMedia) navigator.mediaDevices.getUserMedia(finalConstraints).then(onPermissionGranted).catch(onPermissionDenied);
                else onPermissionDenied("Can't access getUserMedia.");
            }
        }
    }

    async getUserMediaForAudioAsync(constraints) {
        return new Promise((resolve, reject) => {
            this.getUserMediaForAudio(constraints, function(stream) {
                if (navigator.fastAndTransparentAudio) {
                    let audioTracks = stream.getAudioTracks();
                    for (let audioTrack of audioTracks) audioTrack.applyConstraints({ autoGainControl: false, echoCancellation: false, noiseSuppression: false });
                }
                resolve(stream);
            }, reject);
        });
    }

    async createAudioNodeAsync(url, className, onMessageFromAudioScope) {
        return new Promise((resolve, reject) => {
            this.createAudioNode(url, className, resolve, onMessageFromAudioScope);
        });
    }

    createAudioNode(url, className, callback, onMessageFromAudioScope) {
        if (typeof AudioWorkletNode === 'function') {
            this.audioContext.audioWorklet.addModule(url).then(() => {
                class SuperpoweredNode extends AudioWorkletNode {
                    constructor(glue, name) {
                        super(glue.audioContext, name, {
                            'processorOptions': {
                                'wasmCode': glue.Superpowered.wasmCode,
                                'samplerate': glue.audioContext.sampleRate,
                                'maxChannels': glue.Superpowered.__maxChannels__
                            },
                            'outputChannelCount': [2]
                        });
                    }
                    sendMessageToAudioScope(message, transfer = []) { this.port.postMessage(message, transfer); }
                }

                let node = new SuperpoweredNode(this, className);
                node.loader = new SuperpoweredTrackLoader(node);
                node.onReadyCallback = callback;
                node.onMessageFromAudioScope = onMessageFromAudioScope;
                node.port.onmessage = function(event) {
                    if (node.loader.onmessage(event)) return;
                    if (event.data == '___superpowered___onready___') node.onReadyCallback(node);
                    else node.onMessageFromAudioScope(event.data);
                }.bind(node);
            });
        } else {
            import(url).then((processorModule) => {
                let node = this.audioContext.createScriptProcessor(1024, 2, 2);
                node.samplerate = this.audioContext.sampleRate;
                node.inputBuffer = this.Superpowered.createFloatArray(1024 * 2);
                node.outputBuffer = this.Superpowered.createFloatArray(1024 * 2);
                node.processor = new processorModule.default(this.Superpowered, onMessageFromAudioScope, node.samplerate);
                node.sendMessageToAudioScope = function(message, transfer = 0) { node.processor.onMessageFromMainScope(message); }
                node.onaudioprocess = function(e) {
                    node.processor.Superpowered.bufferToWASM(node.inputBuffer, e.inputBuffer);
                    node.processor.processAudio(node.inputBuffer, node.outputBuffer, node.inputBuffer.array.length / 2);
                    node.processor.Superpowered.bufferToJS(node.outputBuffer, e.outputBuffer);
                };
                callback(node);
            });
        }
    }
}

if (typeof AudioWorkletProcessor === 'function') {
    class SuperpoweredAudioWorkletProcessor extends AudioWorkletProcessor {
        constructor(options) {
            super();
            SuperpoweredGlue.__uint_max__sp__ = options.processorOptions.maxChannels;
            this.port.onmessage = (event) => { this.onMessageFromMainScope(event.data); };
            this.ok = false;
            this.samplerate = options.processorOptions.samplerate;
            this.Superpowered = new SuperpoweredGlue();
            this.Superpowered.loadFromArrayBuffer(options.processorOptions.wasmCode, this);
        }
        afterWASMLoaded() {
            this.Superpowered.Initialize();
            this.inputBuffer = this.Superpowered.createFloatArray(128 * 2);
            this.outputBuffer = this.Superpowered.createFloatArray(128 * 2);
            this.onReady();
            this.port.postMessage('___superpowered___onready___');
            this.ok = true;
        }
        onReady() {}
        onMessageFromMainScope(message) {}
        sendMessageToMainScope(message) { this.port.postMessage(message); }
        processAudio(buffer, parameters) {}
        process(inputs, outputs, parameters) {
            if (this.ok) {
                if (inputs[0].length > 1) this.Superpowered.bufferToWASM(this.inputBuffer, inputs);
                this.processAudio(this.inputBuffer, this.outputBuffer, this.inputBuffer.array.length / 2, parameters);
                if (outputs[0].length > 1) this.Superpowered.bufferToJS(this.outputBuffer, outputs);
            }
            return true;
        }
    }
    SuperpoweredWebAudio.AudioWorkletProcessor = SuperpoweredAudioWorkletProcessor;
} else {
    class SuperpoweredAudioWorkletProcessor {
        constructor(sp, oma, sr) {
            this.loader = new SuperpoweredTrackLoader(this);
            this.Superpowered = sp;
            this.samplerate = sr;
            this.onMessageFromAudioScope = oma;
            this.onReady();
        }
        onMessageFromAudioScope = null;
        onReady() {}
        onMessageFromMainScope(message) {}
        sendMessageToMainScope(message) { if (!this.loader.onmessage({ data: message })) this.onMessageFromAudioScope(message); }
        postMessage(message, transfer = []) { this.onMessageFromMainScope(message); }
        processAudio(buffer, parameters) {}
    }
    SuperpoweredWebAudio.AudioWorkletProcessor = SuperpoweredAudioWorkletProcessor;
}

if (typeof exports === 'object' && typeof module === 'object') module.exports = { SuperpoweredGlue, SuperpoweredWebAudio, SuperpoweredTrackLoader };
else if (typeof define === 'function' && define['amd']) define([], function() { return { SuperpoweredGlue, SuperpoweredWebAudio, SuperpoweredTrackLoader }; });
else if (typeof exports === 'object') exports["SuperpoweredModule"] = { SuperpoweredGlue, SuperpoweredWebAudio, SuperpoweredTrackLoader };

export { SuperpoweredGlue, SuperpoweredWebAudio, SuperpoweredTrackLoader };
