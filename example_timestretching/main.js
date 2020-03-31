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

function onMessageFromAudioScope(message) {
    console.log('Message received from the audio node: ' + message);
}

// when the START button is clicked
async function start() {
    content.innerText = 'Creating the audio context and node...';
    audioContext = Superpowered.getAudioContext(44100);
    let currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    audioNode = await Superpowered.createAudioNodeAsync(audioContext, currentPath + '/processor.js', 'MyProcessor', onMessageFromAudioScope);

    content.innerText = 'Downloading music...';
    let response = await fetch('track.wav');

    content.innerText = 'Decoding audio...'; console.log('new');
    let rawData = await response.arrayBuffer();
    audioContext.decodeAudioData(rawData, function(pcmData) { // Safari doesn't support await for decodeAudioData yet
        // send the PCM audio to the audio node
        audioNode.sendMessageToAudioScope({
             left: pcmData.getChannelData(0),
             right: pcmData.getChannelData(1) }
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
    });
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
