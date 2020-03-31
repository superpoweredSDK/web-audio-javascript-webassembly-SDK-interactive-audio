import SuperpoweredModule from '../superpowered.js'

var Superpowered = null;

class MyProcessor extends SuperpoweredModule.AudioWorkletProcessor {
    // runs after the constructor
    onReady() {
        Superpowered = this.Superpowered;
        // the star of the show
        this.distortion = Superpowered.new('GuitarDistortion', Superpowered.samplerate);
        this.distortion.enabled = true;
    }

    onMessageFromMainScope(message) {
        for (let property in message) {
            if (typeof this.distortion[property] !== 'undefined') this.distortion[property] = message[property];
        }
    }

    processAudio(inputBuffer, outputBuffer, buffersize, parameters) {
        this.distortion.process(inputBuffer.pointer, outputBuffer.pointer, buffersize);
        return true;
    }
}

if (typeof AudioWorkletProcessor === 'function') registerProcessor('MyProcessor', MyProcessor);
export default MyProcessor;
