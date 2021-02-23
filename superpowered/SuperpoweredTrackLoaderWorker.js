importScripts('./SuperpoweredGlue.js');

async function load(url) {
    let Superpowered = await SuperpoweredGlue.fetch('./superpowered.wasm');
    SuperpoweredGlue.__uint_max__sp__ = 255;
    Superpowered.Initialize();

    await fetch(url).then(response =>
        response.arrayBuffer()
    ).then(audiofileArrayBuffer => {
        // Copy the ArrayBuffer to WebAssembly Linear Memory.
        let audiofileInWASMHeap = Superpowered.arrayBufferToWASM(audiofileArrayBuffer);

        // Decode the entire file.
        let decodedAudio = Superpowered.Decoder.decodeToAudioInMemory(audiofileInWASMHeap, audiofileArrayBuffer.byteLength);

        // Copy the pcm audio from the WebAssembly heap into a regular ArrayBuffer that can be transfered.
        let arrayBuffer = Superpowered.moveWASMToArrayBuffer(decodedAudio, Superpowered.AudioInMemory.getSize(decodedAudio) * 4);

        // Transfer the ArrayBuffer.
        if (typeof self.transfer !== 'undefined') self.transfer(url, arrayBuffer);
        else postMessage({ '__transfer__': arrayBuffer, }, [ arrayBuffer ]);
    });
}

onmessage = function(message) {
    if (typeof message.data.load === 'string') load(message.data.load);
}
