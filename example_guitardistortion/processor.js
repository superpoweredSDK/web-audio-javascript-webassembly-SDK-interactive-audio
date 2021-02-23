import { SuperpoweredWebAudio, SuperpoweredTrackLoader } from './superpowered/SuperpoweredWebAudio.js';

class MyProcessor extends SuperpoweredWebAudio.AudioWorkletProcessor {
    // runs after the constructor
    onReady() {
        // the star of the show
        this.distortion = new this.Superpowered.GuitarDistortion(this.samplerate);
        this.distortion.enabled = true;
        // the player
        this.player = new this.Superpowered.AdvancedAudioPlayer(this.samplerate, 2, 2, 0, 0.501, 2, false);
        SuperpoweredTrackLoader.downloadAndDecode('../track.mp3', this);
    }

    onMessageFromMainScope(message) {
        if (message.SuperpoweredLoaded) {
            this.player.openMemory(this.Superpowered.arrayBufferToWASM(message.SuperpoweredLoaded.buffer), false, false);
            this.player.play();
            this.sendMessageToMainScope({ loaded: true });
        }
        for (let property in message) {
            if (typeof this.distortion[property] !== 'undefined') this.distortion[property] = message[property];
        }
    }

    processAudio(inputBuffer, outputBuffer, buffersize, parameters) {
        if (!this.player.processStereo(outputBuffer.pointer, false, buffersize, 1)) {
            for (let n = 0; n < buffersize * 2; n++) outputBuffer.array[n] = 0;
        }
        this.distortion.process(outputBuffer.pointer, outputBuffer.pointer, buffersize);
    }
}

if (typeof AudioWorkletProcessor === 'function') registerProcessor('MyProcessor', MyProcessor);
export default MyProcessor;
