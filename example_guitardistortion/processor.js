import SuperpoweredModule from '../superpowered.js'

var Superpowered = null;

class MyProcessor extends SuperpoweredModule.AudioWorkletProcessor {
    // runs after the constructor
    onReady() {
        Superpowered = this.Superpowered;
        this.posFrames = -1;
        // allocating some WASM memory for passing audio to the time stretcher
        this.pcm = Superpowered.createFloatArray(2048 * 2);
        // the star of the show
        this.distortion = Superpowered.new('GuitarDistortion', Superpowered.samplerate);
        this.distortion.enabled = true;
    }

    onMessageFromMainScope(message) {
        // did we receive the audio from the main thread?
        if (message.left && message.right) {
            // left and right channels are NOT stored in WASM memory
            this.left = message.left;
            this.right = message.right;

            this.lengthFrames = Math.min(message.left.length, message.right.length);
            this.posFrames = 0;
        }
        if (message.left) delete message.left;
        if (message.right) delete message.right;
        for (let property in message) {
            if (typeof this.distortion[property] !== 'undefined') this.distortion[property] = message[property];
        }
    }

    processAudio(inputBuffer, outputBuffer, buffersize, parameters) {
        // did we receive the left and right channels already?
        if (this.posFrames == -1) { // if not, output silence
            for (let n = 0; n < buffersize * 2; n++) outputBuffer.array[n] = 0;
            return;
        }

        // if we're near the end just play from the beginning
        if (this.posFrames + buffersize >= this.lengthFrames) this.posFrames = 0;

        // copy the audio samples to the WASM memory and step posFrames
        for (let n = 0, to = buffersize * 2; n < to; n++) {
            this.pcm.array[n++] = this.left[this.posFrames];
            this.pcm.array[n] = this.right[this.posFrames++];
        }

        // actual audio processing
        this.distortion.process(this.pcm.pointer, outputBuffer.pointer, buffersize);
        return true;
    }
}

if (typeof AudioWorkletProcessor === 'function') registerProcessor('MyProcessor', MyProcessor);
export default MyProcessor;
