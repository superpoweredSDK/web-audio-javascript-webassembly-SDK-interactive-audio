import { SuperpoweredGlue, SuperpoweredWebAudio } from './superpowered/SuperpoweredWebAudio.js';

var webaudioManager = null; // The SuperpoweredWebAudio helper class managing Web Audio for us.
var Superpowered = null; // Reference to the Superpowered module.
var audioNode = null;    // This example uses one audio node only.
var content = null;      // The <div> displaying everything.

const presets = {
    transparent: {
        distortion0: false,
        distortion1: false,
        marshall: false,
        ada: false,
        vtwin: false,
        drive: 0,
        gainDecibel: 0,
        bassFrequency: 1,
        trebleFrequency: 22050,
        eq80HzDecibel: 0,
        eq240HzDecibel: 0,
        eq750HzDecibel: 0,
        eq2200HzDecibel: 0,
        eq6600HzDecibel: 0
    },
    preset1: {
        distortion0: false,
        distortion1: true,
        marshall: false,
        ada: false,
        vtwin: false,
        drive: 80,
        gainDecibel: -10,
        bassFrequency: 1,
        trebleFrequency: 22050,
        eq80HzDecibel: 0,
        eq240HzDecibel: -6,
        eq750HzDecibel: -12,
        eq2200HzDecibel: -6,
        eq6600HzDecibel: 0
    },
    preset2: {
        distortion0: true,
        distortion1: false,
        marshall: true,
        ada: false,
        vtwin: false,
        drive: 10,
        gainDecibel: -12,
        bassFrequency: 25,
        trebleFrequency: 22050,
        eq80HzDecibel: 0,
        eq240HzDecibel: -6,
        eq750HzDecibel: -3,
        eq2200HzDecibel: -6,
        eq6600HzDecibel: 3
    }
}

// click on play/pause
function togglePlayback(e) {
    let button = document.getElementById('playPause');
    if (button.value == 1) {
        button.value = 0;
        button.innerText = 'START PLAYBACK';
        webaudioManager.audioContext.suspend();
    } else {
        button.value = 1;
        button.innerText = 'PAUSE';
        webaudioManager.audioContext.resume();
    }
}

// applies a preset on all controls
function applyPreset(preset) {
    let sliders = document.getElementsByClassName('slider');
    for (let slider of sliders) {
        slider.value = preset[slider.id];
        slider.oninput();
    }
    let checkboxes = document.getElementsByClassName('checkbox');
    for (let checkbox of checkboxes) {
        checkbox.checked = preset[checkbox.id];
        checkbox.oninput();
    }
}

function startUserInterface() {
    // UI: innerHTML may be ugly but keeps this example relatively small
    content.innerHTML = '\
        <h3>Choose from these presets for A/B comparison:</h3>\
        <p id="presets"></p>\
        <h3>Play/pause:</h3>\
        <button id="playPause" value="0">START PLAYBACK</button>\
        <h3>Fine tune all controls:</h3>\
        <p>Distortion Sound 1 <input type="checkbox" class="checkbox" id="distortion0"></p>\
        <p>Distortion Sound 2 <input type="checkbox" class="checkbox" id="distortion1"></p>\
        <p>Marshall Cabinet Simulation <input type="checkbox" class="checkbox" id="marshall"></p>\
        <p>ADA Cabinet Simulation <input type="checkbox" class="checkbox" id="ada"></p>\
        <p>V-Twin Preamp Simulation <input type="checkbox" class="checkbox" id="vtwin"></p>\
        <p>Drive (<span id="driveValue"></span>%): <input type="range" min="0" max="100" data-multiplier="0.01" class="slider" id="drive"></p>\
        <p>Gain (<span id="gainDecibelValue"></span>db): <input type="range" min="-96" max="24" class="slider" id="gainDecibel"></p>\
        <p>Bass (<span id="bassFrequencyValue"></span>Hz): <input type="range" min="1" max="250" class="slider" id="bassFrequency"></p>\
        <p>Treble (<span id="trebleFrequencyValue"></span>Hz): <input type="range" min="6000" max="22050" class="slider" id="trebleFrequency"></p>\
        <p>EQ 80 Hz (<span id="eq80HzDecibelValue"></span>db): <input type="range" min="-96" max="24" class="slider" id="eq80HzDecibel"></p>\
        <p>EQ 240 Hz (<span id="eq240HzDecibelValue"></span>db): <input type="range" min="-96" max="24" class="slider" id="eq240HzDecibel"></p>\
        <p>EQ 750 Hz (<span id="eq750HzDecibelValue"></span>db): <input type="range" min="-96" max="24" class="slider" id="eq750HzDecibel"></p>\
        <p>EQ 2200 Hz (<span id="eq2200HzDecibelValue"></span>db): <input type="range" min="-96" max="24" class="slider" id="eq2200HzDecibel"></p>\
        <p>EQ 6600 Hz (<span id="eq6600HzDecibelValue"></span>db): <input type="range" min="-96" max="24" class="slider" id="eq6600HzDecibel"></p>\
    ';

    // make the preset buttons
    let p = document.getElementById('presets');
    for (let preset in presets) {
        let button = document.createElement('button');
        button.id = preset;
        button.innerText = preset;
        button.addEventListener('click', function() {
            applyPreset(presets[this.id]);
            if (document.getElementById('playPause').value != 1) togglePlayback();
        });
        p.appendChild(button);
        p.appendChild(document.createTextNode(' '));
    }

    document.getElementById('playPause').addEventListener('click', togglePlayback);

    // slider actions
    let sliders = document.getElementsByClassName('slider');
    for (let slider of sliders) {
        slider.oninput = function() {
            if (audioNode == null) return;
            document.getElementById(this.id + 'Value').innerText = this.value;
            let message = {};
            let multiplier = slider.hasAttribute('data-multiplier') ? parseFloat(slider.getAttribute('data-multiplier')) : 1;
            message[this.id] = this.value * multiplier;
            audioNode.sendMessageToAudioScope(message);
        }
    }

    // checkbox actions
    let checkboxes = document.getElementsByClassName('checkbox');
    for (let checkbox of checkboxes) {
        checkbox.oninput = function() {
            if (audioNode == null) return;
            let message = {};
            message[this.id] = this.checked;
            audioNode.sendMessageToAudioScope(message);
        }
    }

    applyPreset(presets.transparent);
}

function onMessageFromAudioScope(message) {
    if (message.loaded) startUserInterface();
    else console.log('Message received from the audio node: ' + message);
}

// when the START WITH GUITAR SAMPLE button is clicked
async function startSample() {
    content.innerText = 'Creating the audio context and node...';
    webaudioManager = new SuperpoweredWebAudio(44100, Superpowered);
    let currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    audioNode = await webaudioManager.createAudioNodeAsync(currentPath + '/processor.js', 'MyProcessor', onMessageFromAudioScope);

    // audioNode -> audioContext.destination (audio output)
    webaudioManager.audioContext.suspend();
    audioNode.connect(webaudioManager.audioContext.destination);
    webaudioManager.audioContext.suspend();

    content.innerText = 'Downloading and decoding music...';
}

// when the START WITH AUDIO INPUT button is clicked
async function startInput() {
    content.innerText = 'Creating the audio context and node...';
    webaudioManager = new SuperpoweredWebAudio(44100, Superpowered);

    let micStream = await webaudioManager.getUserMediaForAudioAsync({ 'fastAndTransparentAudio': true })
    .catch((error) => {
        // called when the user refused microphone permission
        console.log(error);
    });
    if (!micStream) return;

    let currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    audioNode = await webaudioManager.createAudioNodeAsync(currentPath + '/processor_live.js', 'MyProcessor', onMessageFromAudioScope);
    let audioInput = webaudioManager.audioContext.createMediaStreamSource(micStream);
    audioInput.connect(audioNode);
    audioNode.connect(webaudioManager.audioContext.destination);
    webaudioManager.audioContext.suspend();
    startUserInterface();
}

async function loadJS() {
    // download and instantiate Superpowered
    Superpowered = await SuperpoweredGlue.fetch('./superpowered/superpowered.wasm');
    Superpowered.Initialize({
        licenseKey: 'ExampleLicenseKey-WillExpire-OnNextUpdate',
        enableAudioAnalysis: false,
        enableFFTAndFrequencyDomain: false,
        enableAudioTimeStretching: true,
        enableAudioEffects: true,
        enableAudioPlayerAndDecoder: true,
        enableCryptographics: false,
        enableNetworking: false
    });

    // display the initial UI
    content = document.getElementById('content');
    content.innerHTML = '<p>Use this if you just want to listen: <button id="startSample">START WITH GUITAR SAMPLE</button></p><p>Use this if you want to play the guitar live: <button id="startInput">START WITH AUDIO INPUT</button></p>';
    document.getElementById('startSample').addEventListener('click', startSample);
    document.getElementById('startInput').addEventListener('click', startInput);
}

loadJS();
