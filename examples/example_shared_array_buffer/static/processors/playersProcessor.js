import { SuperpoweredWebAudio } from "../js/Superpowered.js";

const MAX_ALLOCATED_TRACK_LENGTH_SECONDS = 600; // 10 minutes max track length

class PlayersProcessor extends SuperpoweredWebAudio.AudioWorkletProcessor {
  // Runs after the constructor.
  async onReady() {
    await this.setupPlayers();
    // Notify the main scope that we're prepared.
    this.sendMessageToMainScope({
      event: "ready",
      audioDataBufferPointers: this.audioDataBufferPointers,
    });
  }

  async setupPlayers() {
    // Allocate memory for the two player up front on the SharedArrayBuffer
    const firsrReservedMemoryPointer =
      await this.Superpowered.createReservedMemoryPointerFromDuration(
        MAX_ALLOCATED_TRACK_LENGTH_SECONDS,
        this.samplerate
      );
    const secondReservedMemoryPointer =
      await this.Superpowered.createReservedMemoryPointerFromDuration(
        MAX_ALLOCATED_TRACK_LENGTH_SECONDS,
        this.samplerate
      );
    const thirdReservedMemoryPointer =
      await this.Superpowered.createReservedMemoryPointerFromDuration(
        MAX_ALLOCATED_TRACK_LENGTH_SECONDS,
        this.samplerate
      );
    this.audioDataBufferPointers = [
      firsrReservedMemoryPointer,
      secondReservedMemoryPointer,
      thirdReservedMemoryPointer
    ];

    // Create the two players
    this.players = [
      new this.Superpowered.AdvancedAudioPlayer(
        this.samplerate,
        2,
        2,
        0,
        0,
        2,
        false
      ),
      new this.Superpowered.AdvancedAudioPlayer(
        this.samplerate,
        2,
        2,
        0,
        0,
        2,
        false
      ),
      new this.Superpowered.AdvancedAudioPlayer(
        this.samplerate,
        2,
        2,
        0,
        0,
        2,
        false
      ),
    ];

    for (let index = 0; index < this.players.length; index++) {
      const player = this.players[index];
      player.timeStretchingSound = 2;
    }
    this.playerGain = 0.5;
  }

  // onDestruct is called when the parent AudioWorkletNode.destruct() method is called.
  // You should clear up all Superpowered objects and allocated buffers here.
  onDestruct() {
    for (const player of this.players) {
      player.destruct();
    }
  }

  // Messages are received from the main scope through this method.
  async onMessageFromMainScope(message) {
    if (message.type === "transport") {
      if (message.command === "play") {
        for (const player of this.players) {
          player.play();
        }
      }
      if (message.command === "pause") {
        for (const player of this.players) {
          player.pause();
        }
      }
      if (message.command === "pausePlayer") {
        this.players[message.playerIndex].pause();
      }
      if (message.command === "playPlayer") {
        this.players[message.playerIndex].play();
      }
    }
    if (message.type == "command") {
      
      if (message.command === "loadUrl") {
        this.players[message.playerIndex].pause();
        const loadResponse =
          await this.Superpowered.downloadAndDecodeIntoSharedMemoryPointer(
            message.url,
            this.audioDataBufferPointers[message.playerIndex],
            false,
            false
          );
        this.players[message.playerIndex].openPCM16AudioInMemory(
          this.audioDataBufferPointers[message.playerIndex],
          loadResponse.sampleRate,
          loadResponse.numBytes / 4,
          false,
          false
        );
        this.players[message.playerIndex].seek(0);
        this.sendMessageToMainScope({
          event: "assetLoaded",
          playerIndex: message.playerIndex,
          commandSourceThread: "audio"
        });
      }
      if (message.command === "loadDecodedAudioIntoPlayer") {
        this.players[message.playerIndex].pause();
        this.players[message.playerIndex].openPCM16AudioInMemory(
          message.sharedMemoryPointer,
          message.sampleRate,
          message.numBytes / 4,
          false,
          false
        );
        this.players[message.playerIndex].seek(0);
        this.sendMessageToMainScope({
          event: "assetLoaded",
          playerIndex: message.playerIndex,
          commandSourceThread: "main"
        });
      }
    }
  }

  processAudio(inputBuffer, outputBuffer, buffersize, parameters) {

    // Reset buffer to prevent garbage data
    this.Superpowered.memorySet(outputBuffer.pointer, 0, buffersize * 8);


    for (const player of this.players) {
      // Ensure the samplerate is in sync on every audio processing callback.
      player.outputSamplerate = this.samplerate;
      // Process the players sequentially and mix them together in the output buffer.
      player.processStereo(
        outputBuffer.pointer,
        true,
        buffersize,
        this.playerGain
      );
    }

    // Keep processor alive in the Web Audio API by returning true
    return true;
  }
}

// The following code registers the processor script in the browser, please note the label and reference.
if (typeof AudioWorkletProcessor !== "undefined")
  registerProcessor("PlayersProcessor", PlayersProcessor);
export default PlayersProcessor;
