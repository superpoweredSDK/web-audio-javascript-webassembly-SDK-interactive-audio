import { SuperpoweredWebAudio } from './superpowered/SuperpoweredWebAudio.js';

function calculateFrequency(value, minFreq, maxFreq) {
    if (value > 0.97) return maxFreq;
    if (value < 0.03) return minFreq;
    return Math.min(maxFreq, Math.pow(10.0, (value + ((0.4 - Math.abs(value - 0.4)) * 0.3)) * Math.log10(maxFreq - minFreq)) + minFreq);
}

class MyProcessor extends SuperpoweredWebAudio.AudioWorkletProcessor {
    // runs after the constructor
    onReady() {
        this.reverb = new this.Superpowered.Reverb(this.samplerate, this.samplerate);
        this.reverb.enabled = true;

        this.filter = new this.Superpowered.Filter(this.Superpowered.Filter.Resonant_Lowpass, this.samplerate);
        this.filter.resonance = 0.2;
        this.filter.enabled = true;
    }

    onMessageFromMainScope(message) {
        if (typeof message.wet !== 'undefined') {
            this.reverb.wet = message.wet / 100;
            console.log(message.wet + '%');
        } else if (typeof message.freq !== 'undefined') {
            let hz = calculateFrequency(parseFloat(message.freq) / 100, 100, 10000);
            this.filter.frequency = hz;
            console.log(parseInt(hz, 10) + ' hz');
        }
    }

    processAudio(inputBuffer, outputBuffer, buffersize, parameters) {
        this.reverb.process(inputBuffer.pointer, inputBuffer.pointer, buffersize);
        this.filter.process(inputBuffer.pointer, outputBuffer.pointer, buffersize);
    }
}

if (typeof AudioWorkletProcessor === 'function') registerProcessor('MyProcessor', MyProcessor);
export default MyProcessor;
