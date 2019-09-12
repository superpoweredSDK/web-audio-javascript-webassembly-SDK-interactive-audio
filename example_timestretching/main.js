import SuperpoweredModule from '../superpowered.js'

var audioContext = null; // Reference to the audio context.
var audioNode = null;    // This example uses one audio node only.
var Superpowered = null; // Reference to the Superpowered module.
var content = null;      // The <div> displaying everything.
var pitchShift = 0;      // The current pitch shift value.

// onclick by the pitch shift minus and plus buttons
function changePitchShift(e) {
    // limiting the new pitch shift value
    let value = parseInt(e.target.value);
    pitchShift += value;
    if (pitchShift < -12) pitchShift = -12; else if (pitchShift > 12) pitchShift = 12;
    // displaying the value
    document.getElementById('pitchShiftDisplay').innerText = ' pitch shift: ' + ((pitchShift < 1) ? pitchShift : '+' + pitchShift) + ' ';
    // sending the new value to the audio node
    audioNode.sendMessageToAudioScope({ 'pitchShift': pitchShift });
}

// on change by the rate slider
function changeRate() {
    // displaying the new rate
    let value = document.getElementById('rateSlider').value, text;
    if (value == 10000) text = 'original tempo';
    else if (value < 10000) text = '-' + (100 - value / 100).toPrecision(2) + '%';
    else text = '+' + (value / 100 - 100).toPrecision(2) + '%';
    document.getElementById('rateDisplay').innerText = text;
    // sending the new rate to the audio node
    audioNode.sendMessageToAudioScope({ rate: value });
}

// double click on the rate slider
function changeRateDbl() {
    document.getElementById('rateSlider').value = 10000;
    changeRate();
}

// click on play/pause
function togglePlayback(e) {
    let button = document.getElementById('playPause');
    if (button.value == 1) {
        button.value = 0;
        button.innerText = 'PLAY';
        audioContext.suspend();
    } else {
        button.value = 1;
        button.innerText = 'PAUSE';
        audioContext.resume();
    }
}

// we have the audio system created, let's display the UI and start playback
function onAudioDecoded(buffer) {
    // send the PCM audio to the audio node
    audioNode.sendMessageToAudioScope({
         left: buffer.getChannelData(0),
         right: buffer.getChannelData(1) }
    );

    // audioNode -> audioContext.destination (audio output)
    audioContext.suspend();
    audioNode.connect(audioContext.destination);

    // UI: innerHTML may be ugly but keeps this example small
    content.innerHTML = '\
        <button id="playPause" value="0">PLAY</button>\
        <p id="rateDisplay">original tempo</p>\
        <input id="rateSlider" type="range" min="5000" max="20000" value="10000" style="width: 100%">\
        <button id="pitchMinus" value="-1">-</button>\
        <span id="pitchShiftDisplay"> pitch shift: 0 </span>\
        <button id="pitchPlus" value="1">+</button>\
    ';
    document.getElementById('rateSlider').addEventListener('input', changeRate);
    document.getElementById('rateSlider').addEventListener('dblclick', changeRateDbl);
    document.getElementById('pitchMinus').addEventListener('click', changePitchShift);
    document.getElementById('pitchPlus').addEventListener('click', changePitchShift);
    document.getElementById('playPause').addEventListener('click', togglePlayback);
}

// when the START button is clicked
function start() {
    content.innerText = 'Creating the audio context and node...';
    audioContext = Superpowered.getAudioContext(44100);
    let currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));

    Superpowered.createAudioNode(audioContext, currentPath + '/processor.js', 'MyProcessor',
        // runs after the audio node is created
        function(newNode) {
            audioNode = newNode;
            content.innerText = 'Downloading music...';

            // downloading the music
            let request = new XMLHttpRequest();
            request.open('GET', 'track.wav', true);
            request.responseType = 'arraybuffer';
            request.onload = function() {
                content.innerText = 'Decoding audio...';
                audioContext.decodeAudioData(request.response, onAudioDecoded);
            }
            request.send();
        },

        // runs when the audio node sends a message
        function(message) {
            console.log('Message received from the audio node: ' + message);
        }
    );
}

Superpowered = SuperpoweredModule({
    licenseKey: 'ExampleLicenseKey-WillExpire-OnNextUpdate',
    enableAudioTimeStretching: true,

    onReady: function() {
        content = document.getElementById('content');
        content.innerHTML = '<button id="startButton">START</button>';
        document.getElementById('startButton').addEventListener('click', start);
    }
});
