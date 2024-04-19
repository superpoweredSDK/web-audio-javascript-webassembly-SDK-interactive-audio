import "./Superpowered.js";

class MyProcessor extends SuperpoweredWebAudio.AudioWorkletProcessor {
    // runs after the constructor
    cancelledPitchBend = true;

    onReady() {
        this.player = new this.Superpowered.AdvancedAudioPlayer(this.samplerate, 2, 2, 0, 0.501, 2, false);
    }

    onDestruct() {
        this.player.destruct();
    }

    onMessageFromMainScope(message) {
        // console.log('onMessageFromMainScope', message)
        if (message.SuperpoweredLoaded) {
            this.player.openMemory(this.Superpowered.arrayBufferToWASM(message.SuperpoweredLoaded.buffer), false, false);
            this.player.play();
            this.sendMessageToMainScope({ loaded: true });
        }
        if (typeof message.rate !== 'undefined') this.player.playbackRate = message.rate / 10000.0;
        if (typeof message.pitchShift !== 'undefined') this.player.pitchShiftCents = parseInt(message.pitchShift) * 100;
        if (typeof message.requestPitchBend !== 'undefined') this.sendMessageToMainScope({ pitchBendDetails: {currentPitchBend: this.currentPitchBend, currentPitchBendMsOffset: this.currentPitchBendMsOffset} })
        if (message.pitchBend) this.pitchBend = message.maxPercent !== 0 ? {
            maxPercent: message.maxPercent,
            bendStretch: message.bendStretch,
            faster: message.faster,
            holdMs: message.holdMs
        } : undefined;
    }

    processAudio(inputBuffer, outputBuffer, buffersize, parameters) {
        if (this.pitchBend) {
            this.player.pitchBend(this.pitchBend.maxPercent, this.pitchBend.bendStretch, this.pitchBend.faster, this.pitchBend.holdMs);
            if (this.cancelledPitchBend) this.cancelledPitchBend = false;
        } else if (!this.cancelledPitchBend) {
            this.player.endContinuousPitchBend();
            this.cancelledPitchBend = true;
        }
        this.currentPitchBend = this.player.getCurrentPitchBendPercent();
        this.currentPitchBendMsOffset = this.player.getBendOffsetMs();
        if (!this.player.processStereo(outputBuffer.pointer, false, buffersize, 1)) this.Superpowered.memorySet(outputBuffer.pointer, 0, buffersize * 8);
    }
}

if (typeof AudioWorkletProcessor === 'function') registerProcessor('MyProcessor', MyProcessor);
export default MyProcessor;
