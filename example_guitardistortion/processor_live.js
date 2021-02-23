import { SuperpoweredWebAudio } from './superpowered/SuperpoweredWebAudio.js';

class MyProcessor extends SuperpoweredWebAudio.AudioWorkletProcessor {
    // runs after the constructor
    onReady() {
        // the star of the show
        this.distortion = new this.Superpowered.GuitarDistortion(this.samplerate);
        this.distortion.enabled = true;
    }

    onMessageFromMainScope(message) {
        for (let property in message) {
            if (typeof this.distortion[property] !== 'undefined') this.distortion[property] = message[property];
        }
    }

    processAudio(inputBuffer, outputBuffer, buffersize, parameters) {
        this.distortion.process(inputBuffer.pointer, outputBuffer.pointer, buffersize);
    }
}

if (typeof AudioWorkletProcessor === 'function') registerProcessor('MyProcessor', MyProcessor);
export default MyProcessor;
