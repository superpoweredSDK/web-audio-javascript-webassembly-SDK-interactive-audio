import { SuperpoweredGlue, SuperpoweredWebAudio } from './Superpowered.js' // which is coming from our installed package in node_modules

const minimumSampleRate = 48000;
let superpoweredInstance, webaudioManager, audioDataBufferPointers, playersProcessorNode;

async function boot() {
    superpoweredInstance = await SuperpoweredGlue.Instantiate('ExampleLicenseKey-WillExpire-OnNextUpdate', {
        sharedArrayBuffer: true,
    });

    webaudioManager = new SuperpoweredWebAudio(minimumSampleRate, superpoweredInstance);
    playersProcessorNode = await webaudioManager.createAudioNodeAsync('http://localhost:8000/static/processors/playersProcessor.js', 'PlayersProcessor', onMessageProcessorAudioScope);
    playersProcessorNode.connect(webaudioManager.audioContext.destination);
}


function onMessageProcessorAudioScope(message) {
    if (message.event === 'ready') {
        console.log(message);
        audioDataBufferPointers = message.audioDataBufferPointers;
    }
}


async function loadFromAudioThread(playerIndex, url) {
    if (!superpoweredInstance) {
        console.error('Superpowered instance not initialized yet');
        return;
    }
    try {
        playersProcessorNode.sendMessageToAudioScope({
            type: 'command',
            command: 'loadUrl',
            playerIndex,
            url
        });
        document.getElementById(`loaded-asset-${playerIndex}`).textContent = url;
    } catch (e) {
        console.error(`Error loading asset for player ${playerIndex}:`, e);
    }
}

async function loadFromMainThread(playerIndex, url) {
    if (!superpoweredInstance) {
        console.error('Superpowered instance not initialized yet');
        return;
    }

    // First pause the player so we don't write to the SAB while it's being read for playback
    playersProcessorNode.sendMessageToAudioScope({
        type: 'transport',
        command: 'pausePlayer',
        playerIndex
    });
    // Then load and decode the audio into the SAB from the main thread, which will block the main thread while it happens
    const result = await superpoweredInstance.downloadAndDecodeIntoSharedMemoryPointer(
        url,
        audioDataBufferPointers[playerIndex],
        false,
        false,
        playersProcessorNode); 
        playersProcessorNode.sendMessageToAudioScope({
            type: 'command',
            command: 'loadDecodedAudioIntoPlayer',
            playerIndex,
            sharedMemoryPointer: audioDataBufferPointers[playerIndex],
            sampleRate: result.sampleRate,
            numBytes: result.numBytes
        });
    document.getElementById(`loaded-asset-${playerIndex}`).textContent = url;
}

async function loadFromWorker(playerIndex, url) {
    if (!superpoweredInstance) {
        console.error('Superpowered instance not initialized yet');
        return;
    }
    const assetWorker = new Worker('http://localhost:8000/static/workers/assetWorker.js', { type: 'module' });

    // First pause the player so we don't write to the SAB while it's being read for playback
    playersProcessorNode.sendMessageToAudioScope({
        type: 'transport',
        command: 'pausePlayer',
        playerIndex
    });

    // Then load and decode the audio into the SAB from the worker thread, which will keep the main thread responsive while it happens
    assetWorker.postMessage({
        url,
        sharedArrayBufferPointer: audioDataBufferPointers[playerIndex],
        sharedArrayBuffer: playersProcessorNode.sharedArrayBuffer,
        superpoweredWasm: superpoweredInstance.wasmCode,
        requestDecoderMetadata: true,
        requestOfflineAnalyserMetadata: true
    });

    //Once received, send a message to the audio thread to load the decoded audio from the SAB into the player for playback
    assetWorker.onmessage = (event) => {
        if (event.data.type === 'success') {
            playersProcessorNode.sendMessageToAudioScope({
                type: 'command',
                command: 'loadDecodedAudioIntoPlayer',
                playerIndex,
                sharedMemoryPointer: audioDataBufferPointers[playerIndex],
                sampleRate: event.data.sampleRate,
                numBytes: event.data.numBytes
            });
            document.getElementById(`loaded-asset-${playerIndex}`).textContent = url;
        } else if (event.data.type === 'error') {
            console.error(`Worker failed to load asset for player ${playerIndex}:`, event.data.reason);
        }
    };
}

function playAll() {
    webaudioManager.audioContext.resume();
    playersProcessorNode.sendMessageToAudioScope({ type: 'transport', command: 'play' });
}

function pauseAll() {
    webaudioManager.audioContext.suspend();
    playersProcessorNode.sendMessageToAudioScope({ type: 'transport', command: 'pause' });
}

function playPlayer(playerIndex) {
    webaudioManager.audioContext.resume();
    playersProcessorNode.sendMessageToAudioScope({ type: 'transport', command: 'playPlayer', playerIndex });
}

function pausePlayer(playerIndex) {
    playersProcessorNode.sendMessageToAudioScope({ type: 'transport', command: 'pausePlayer', playerIndex });
}

window.playAll = playAll;
window.pauseAll = pauseAll;
window.loadFromAudioThread = loadFromAudioThread;
window.loadFromMainThread = loadFromMainThread;
window.loadFromWorker = loadFromWorker;
window.playPlayer = playPlayer;
window.pausePlayer = pausePlayer;


boot();