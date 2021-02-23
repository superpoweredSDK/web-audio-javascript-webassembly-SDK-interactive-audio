import { SuperpoweredGlue, SuperpoweredWebAudio } from './superpowered/SuperpoweredWebAudio.js';

const states = { NOTRUNNING: 'START', INITIALIZING: 'INITIALIZING', RUNNING: 'STOP' }

var state = states.NOTRUNNING;
var webaudioManager = null; // The SuperpoweredWebAudio helper class managing Web Audio for us.
var Superpowered = null; // Reference to the Superpowered module.
var audioNode = null;    // This example uses one audio node only.

function setState(newState) {
    state = newState;
    document.getElementById('btn').innerText = state;
}

function onMessageFromAudioScope(message) {
    console.log('Message received from the audio node: ' + message);
}

// when the button is clicked
async function toggleAudio() {
    if (state == states.NOTRUNNING) {
        setState(states.INITIALIZING);
        webaudioManager = new SuperpoweredWebAudio(44100, Superpowered);

        let micStream = await webaudioManager.getUserMediaForAudioAsync({ 'fastAndTransparentAudio': true })
        .catch((error) => {
            // called when the user refused microphone permission
            console.log(error);
            setState(states.NOTRUNNING);
        });
        if (!micStream) return;

        let currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        audioNode = await webaudioManager.createAudioNodeAsync(currentPath + '/processor.js', 'MyProcessor', onMessageFromAudioScope);
        let audioInput = webaudioManager.audioContext.createMediaStreamSource(micStream);
        audioInput.connect(audioNode);
        audioNode.connect(webaudioManager.audioContext.destination);
        setState(states.RUNNING);
    } else if (state == states.RUNNING) {
        // stop everything
        webaudioManager.audioContext.close();
        webaudioManager = audioNode = null;
        setState(states.NOTRUNNING);
    }
}

async function loadJS() {
    // download and instantiate Superpowered
    Superpowered = await SuperpoweredGlue.fetch('./superpowered/superpowered.wasm');
    Superpowered.Initialize({
        licenseKey: 'ExampleLicenseKey-WillExpire-OnNextUpdate',
        enableAudioAnalysis: true,
        enableFFTAndFrequencyDomain: false,
        enableAudioTimeStretching: false,
        enableAudioEffects: true,
        enableAudioPlayerAndDecoder: false,
        enableCryptographics: false,
        enableNetworking: false
    });

    // UI: innerHTML may be ugly but keeps this example small
    document.getElementById('content').innerHTML = '\
        <p>Put on your headphones first, you\'ll be deaf due audio feedback otherwise.</p>\
        <p id="audioStack" style="font-style: italic"></p>\
        <p><button id="btn">-</button></p>\
        <p>Reverb wet: <input type="range" min="0" max="100" value="50" class="reverbslider" id="wet"></p>\
        <p>Filter frequency: <input type="range" min="0" max="100" value="50" class="filterslider" id="freq"></p>\
    ';

    document.getElementById('audioStack').innerText = window.AudioWorkletNode ? 'worklet' : 'legacy';
    document.getElementById('btn').onclick = toggleAudio;
    document.getElementById('wet').oninput = function() {
        if (audioNode != null) audioNode.sendMessageToAudioScope({ 'wet': this.value });
    }
    document.getElementById('freq').oninput = function() {
        if (audioNode != null) audioNode.sendMessageToAudioScope({ 'freq': this.value });
    }

    setState(states.NOTRUNNING);
}

loadJS();
