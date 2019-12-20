import SuperpoweredModule from '../superpowered.js'

const states = { NOTRUNNING: 'START', INITIALIZING: 'INITIALIZING', RUNNING: 'STOP' }

var state = states.NOTRUNNING;
var audioContext = null; // Reference to the audio context.
var audioNode = null;    // This example uses one audio node only.
var Superpowered = null; // Reference to the Superpowered module.

function setState(newState) {
    state = newState;
    document.getElementById('btn').innerText = state;
}

// called when the user provided permission for the microphone
function onStreamCreated(micStream) {
    let currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));

    Superpowered.createAudioNode(audioContext, currentPath + '/processor.js', 'MyProcessor',
        // runs after the audio node is created
        function(newNode) {
            // audioInput (microphone, etc.) -> audioNode -> audioContext.destination (audio output)
            audioNode = newNode;
            let audioInput = audioContext.createMediaStreamSource(micStream);
            audioInput.connect(newNode);
            newNode.connect(audioContext.destination);
            setState(states.RUNNING);
        },

        // runs when the audio node sends a message
        function(message) {
            console.log('Message received from the audio node: ' + message);
        }
    );
}

// called when the user refused microphone permission
function onStreamError(error) {
    console.log(error);
    setState(states.NOTRUNNING);
}

// when the button is clicked
function toggleAudio() {
    if (state == states.NOTRUNNING) {
        setState(states.INITIALIZING);
        audioContext = Superpowered.getAudioContext(44100);

        // request microphone permission
        Superpowered.getUserMediaForAudio(
            {  // navigator.mediaDevices.getUserMedia constraints
                'echoCancellation': false
            },
            onStreamCreated,
            onStreamError
        );
    } else if (state == states.RUNNING) {
        // stop everything
        audioContext.close();
        audioContext = audioNode = null;
        setState(states.NOTRUNNING);
    }
}

Superpowered = SuperpoweredModule({
    licenseKey: 'ExampleLicenseKey-WillExpire-OnNextUpdate',
    enableAudioEffects: true,
    enableAudioAnalysis: true,

    onReady: function() {
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
});
