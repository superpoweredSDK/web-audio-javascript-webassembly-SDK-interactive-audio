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
        this.timeStretching = Superpowered.new('TimeStretching', Superpowered.samplerate, 0.5, 1);
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
        // changing the rate?
        if (typeof message.rate !== 'undefined') this.timeStretching.rate = message.rate / 10000.0;
        // changing the pitch shift?
        if (typeof message.pitchShift !== 'undefined') this.timeStretching.pitchShiftCents = message.pitchShift * 100;
    }

    processAudio(inputBuffer, outputBuffer, buffersize, parameters) {
        // did we receive the left and right channels already?
        if (this.posFrames == -1) { // if not, output silence
            for (let n = 0; n < buffersize * 2; n++) outputBuffer.array[n] = 0;
            return;
        }

        // iterate until the time stretcher has at least "buffersize" amount of output available
        while (this.timeStretching.getOutputLengthFrames() < buffersize) {
            // how many frames of input should we provide to the time stretcher to produce some output?
            let frames = this.timeStretching.getNumberOfInputFramesNeeded();
            if (frames == 0) frames = buffersize; // happens when time stretch rate = 1.0x and pitch shift = 0

            // do we have that many frames available?
            let framesAvailable = this.lengthFrames - (this.posFrames + frames);
            if (framesAvailable < 1) this.posFrames = 0; // start from 0 when we reach the end (loop)
            else if (framesAvailable < frames) frames = framesAvailable; // use less frames if we still have some until the end

            // copy the audio samples to the WASM memory and step posFrames
            for (let n = 0, to = frames * 2; n < to; n++) {
                this.pcm.array[n++] = this.left[this.posFrames];
                this.pcm.array[n] = this.right[this.posFrames++];
            }

            // start from 0 when we reach the end (loop)
            if (this.posFrames >= this.lengthFrames) this.posFrames = 0;

            // pass the input to the time stretcher
            // it will produce some output in this step if it has enough frames collected
            this.timeStretching.addInput(this.pcm.pointer, frames);
        }

        // get the requested amount of output
        this.timeStretching.getOutput(outputBuffer.pointer, buffersize);
    }
}

if (typeof AudioWorkletProcessor === 'function') registerProcessor('MyProcessor', MyProcessor);
export default MyProcessor;
