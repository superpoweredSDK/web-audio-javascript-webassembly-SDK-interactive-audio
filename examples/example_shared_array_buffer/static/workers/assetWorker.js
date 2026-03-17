import { SuperpoweredGlue } from "./../js/Superpowered.js";

async function loadAssetIntoSABInWorker(event) {
  const {
    url,
    sharedArrayBufferPointer,
    sharedArrayBuffer,
    superpoweredWasm,
    requestDecoderMetadata,
    requestOfflineAnalyserMetadata,
  } = event.data;
  // Start Superpowered instance from WASM ArrayBuffer supplied
  const superpowered = new SuperpoweredGlue();
  superpowered.logMemory = true;
  await superpowered.loadFromArrayBuffer(superpoweredWasm);
  SuperpoweredGlue["__uint_max__sp__"] = 255;
  superpowered.Initialize("");
  try {
    const response =
      await superpowered.downloadAndDecodeIntoSharedMemoryPointer(
        url,
        sharedArrayBufferPointer,
        requestDecoderMetadata,
        requestOfflineAnalyserMetadata,
        sharedArrayBuffer
      );

    // Report success back to the main thread with the payloads
    self.postMessage({
      type: "success",
      ...response,
    });
  } catch (e) {
    self.postMessage({
      type: "error",
      url,
      reason: e.message,
    });
  }
}

// Trigger the process when worker receives a message
self.onmessage = loadAssetIntoSABInWorker;
