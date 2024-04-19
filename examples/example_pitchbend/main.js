import "./Superpowered.js";

var webaudioManager = null; // The SuperpoweredWebAudio helper class managing Web Audio for us.
var Superpowered = null; // A Superpowered instance.
var audioNode = null;    // This example uses one audio node only.
var content = null;      // The <div> displaying everything.
var pitchShift = 0;      // The current pitch shift value.
var currentPath = null;
var pbPerc = null;

function changePitchShift(e) {
    // limiting the new pitch shift value
    let value = parseInt(e.target.value);
    pitchShift += value;
    if (pitchShift < -12) pitchShift = -12; else if (pitchShift > 12) pitchShift = 12;
    // displaying the value
    document.getElementById('pitch-shift-display').innerText = ' pitch shift: ' + ((pitchShift < 1) ? pitchShift : '+' + pitchShift) + ' ';
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

function changePitchBend(e) {
    let faster = 1;
    const value = e.target.value;
    if (value < 0) {
        faster = 0;
    }
    audioNode.sendMessageToAudioScope({
        'pitchBend': true,
        maxPercent: Math.abs(value/100),
        bendStretch: 0,
        faster,
        holdMs: 100
    });
}

// double click on the rate slider
function changeRateDbl() {
    document.getElementById('rateSlider').value = 10000;
    changeRate();
}

// double click on the rate slider
function changeBendDbl() {
    document.getElementById('pitchBend').value = 0;
    audioNode.sendMessageToAudioScope({
        'pitchBend': true,
        maxPercent: 0,
        bendStretch: 0,
        faster: 0,
        holdMs: 100
    });
}

// click on play/pause
function togglePlayback(e) {
    let button = document.getElementById('playPause');
    if (button.value == 1) {
        button.value = 0;
        button.innerText = 'Play audio';
        webaudioManager.audioContext.suspend();
    } else {
        button.value = 1;
        button.innerText = 'Pause audio';
        webaudioManager.audioContext.resume();
    }
}

function onMessageFromAudioScope(message) {
    if (message.loaded) {
        // UI: innerHTML may be ugly but keeps this example small
        content.innerHTML = '\
            <h1>Superpowered AAP pitch bending</h1>\
            <button id="playPause" value="0">Play audio</button>\
            <h2>Pitch bend percentage</h2>\
            <div style="display: flex; justify-content: space-between;"><span>-30%</span><span>0%</span><span>+30%</span></div>\
            <input id="pitchBend" type="range" min="-30" max="30" value="0" style="width: 100%">\
            <div style="background: #909090; width: 100%; postion: relative;" id="bend-container"><div style="width: 50%; height: 10px; background: black;" id="bend-value"></div></div>\
            <div style="text-align: center;"><span>Current pitch bend percentage <span id="pitch-bend-percentage">100</span>%</span></div><br />\
            <button id="reset-bend">Reset pitch bend</button>\
            <h2>Playback Rate:</h2>\
            <p id="rateDisplay">original tempo</p>\
            <div style="display: flex; justify-content: space-between;"><span>-50%</span><span>+100%</span></div>\
            <input id="rateSlider" type="range" min="5000" max="20000" value="10000" style="width: 100%">\
            <button id="reset-rate">Reset playback rate</button> <br /><br />\
            <button id="pitchMinus" value="-1">-</button>\
            <span id="pitch-shift-display"> pitch shift: 0 </span>\
            <button id="pitchPlus" value="1">+</button>\
        ';
        document.getElementById('rateSlider').addEventListener('input', changeRate);
        document.getElementById('pitchBend').addEventListener('input', changePitchBend);
        document.getElementById('pitchBend').addEventListener('dblclick', changeBendDbl);
        document.getElementById('rateSlider').addEventListener('dblclick', changeRateDbl);
        document.getElementById('reset-bend').addEventListener('click', changeBendDbl);
        document.getElementById('reset-rate').addEventListener('click', changeRateDbl);
        document.getElementById('pitchMinus').addEventListener('click', changePitchShift);
        document.getElementById('pitchPlus').addEventListener('click', changePitchShift);
        document.getElementById('playPause').addEventListener('click', togglePlayback);
        pbPerc = document.getElementById('pitch-bend-percentage');
    }
    if (message.pitchBendDetails && document.getElementById('bend-value')) {
        if (pbPerc && (typeof message.pitchBendDetails.currentPitchBend !== 'undefined')) {
            pbPerc.innerText = message.pitchBendDetails.currentPitchBend * 100;
            document.getElementById('bend-value').style.width = convertRange(message.pitchBendDetails.currentPitchBend * 100, [70, 130], [0, 100]) + '%';
            document.getElementById('bend-value').style.background = message.pitchBendDetails.currentPitchBend === 1 ? 'black' : message.pitchBendDetails.currentPitchBend < 1 ? 'red' : 'green';
        }
    }
}

function convertRange( value, r1, r2 ) { 
    return ( value - r1[ 0 ] ) * ( r2[ 1 ] - r2[ 0 ] ) / ( r1[ 1 ] - r1[ 0 ] ) + r2[ 0 ];
}

function requestPitchBendDetails() {
    audioNode.sendMessageToAudioScope({ requestPitchBend: true });
    requestAnimationFrame(requestPitchBendDetails)
}

// when the START button is clicked
async function start() {
    // content.innerText = 'Creating the audio context and node...';
    webaudioManager = new SuperpoweredWebAudio(44100, Superpowered);
    currentPath = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    audioNode = await webaudioManager.createAudioNodeAsync(currentPath + '/processor.js?date=' + Date.now(), 'MyProcessor', onMessageFromAudioScope);
    // audioNode -> audioContext.destination (audio output)
    webaudioManager.audioContext.suspend();
    audioNode.connect(webaudioManager.audioContext.destination);

    // start polling of pitch bend details from audioworklet
    requestAnimationFrame(requestPitchBendDetails)
}

async function loadFromMainThread() {
    Superpowered.downloadAndDecode(currentPath + '/track.mp3', audioNode);
}

async function loadJS() {
    Superpowered = await SuperpoweredGlue.Instantiate('ExampleLicenseKey-WillExpire-OnNextUpdate', 'http://localhost:8080/superpowered-npm.wasm');
    
    // display the START button
    content = document.getElementById('content');
    content.innerHTML = `<div>
            <button id="loadFromMainThread">Start</button>
    </div>`;
    document.getElementById('loadFromMainThread').addEventListener('click', loadFromMainThread);
    start();
}

loadJS();
