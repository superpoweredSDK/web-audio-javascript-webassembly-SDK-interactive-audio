import "./assets/Superpowered.js";

var webaudioManager = null; // The SuperpoweredWebAudio helper class managing Web Audio for us.
var Superpowered = null; // A Superpowered instance.
var audioNode = null;    // This example uses one audio node only.
var content = null;      // The <div> displaying everything.
var pitchShift = 0;      // The current pitch shift value.
var currentPath = null;
var pbPerc = null;

function changePitchShift(e) {
    // limiting the new pitch shift value
    // let value = parseInt(e.target.value);
    // pitchShift += value;

    pitchShift = Math.min(12, Math.max(-12, pitchShift + parseInt(e.target.value)));

    // if (pitchShift < -12) pitchShift = -12; else if (pitchShift > 12) pitchShift = 12;
    // displaying the value
    document.getElementById('pitch-shift-display').textContent = ' pitch shift: ' + ((pitchShift < 1) ? pitchShift : '+' + pitchShift) + ' ';
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
    document.getElementById('rateDisplay').textContent = text;
    // sending the new rate to the audio node
    audioNode.sendMessageToAudioScope({ rate: value });
}

function changePitchBend(e) {
    console.log(Number(document.getElementById('holdMsSelect').value));
    const value = e.target.value;
    audioNode.sendMessageToAudioScope({
        'pitchBend': true,
        maxPercent: Math.abs(value/100),
        bendStretch: 0,
        faster: value < 0 ? 0 : 1,
        holdMs: Number(document.getElementById('holdMsSelect').value)
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
        holdMs: Number(document.getElementById('holdMsSelect').value)
    });
}

// click on play/pause
function togglePlayback(e) {
    let button = document.getElementById('playPause');
    if (button.value == 1) {
        button.value = 0;
        button.textContent = 'Play audio';
        webaudioManager.audioContext.suspend();
    } else {
        button.value = 1;
        button.textContent = 'Pause audio';
        webaudioManager.audioContext.resume();
    }
}

function onMessageFromAudioScope(message) {
    if (message.loaded) {
        // UI: innerHTML may be ugly but keeps this example small
        content.innerHTML = '\
            <button id="playPause" value="0">Play audio</button>\
            <h3>Pitch bend holdMs</h3>\
            <select id="holdMsSelect"><option>40</option><option>200</option><option>300</option><option>600</option><option>1000</option></select><span>ms</span>\
            <h3>Pitch bend percentage</h3>\
            <div style="width: 100%; display: flex; justify-content: space-between;"><span>-30%</span><span>0%</span><span>+30%</span></div>\
            <input id="pitchBend" type="range" min="-30" max="30" value="0" style="width: 100%">\
            <div style="overflow: hidden; border-radius: 5px; background: #909090; width: 100%; postion: relative;" id="bend-container"><div style="width: 50%; height: 10px; background: black;" id="bend-value"></div></div>\
            <div style="text-align: center;"><span><span id="pitch-bend-percentage">100</span>%</span></div><br />\
            <button id="reset-bend">Reset pitch bend</button>\
            <h3>Playback rate</h3>\
            <span id="rateDisplay">original tempo</span>\
            <div style="width: 100%; display: flex; justify-content: space-between;"><span>-50%</span><span>+100%</span></div>\
            <input id="rateSlider" type="range" min="5000" max="20000" value="10000" style="width: 100%">\
            <button id="reset-rate">Reset playback rate</button> <br /><br />\
            <div>\
            <button id="pitchMinus" value="-1">-</button>\
            <span id="pitch-shift-display"> pitch shift: 0 </span>\
            <button id="pitchPlus" value="1">+</button>\
            </div>\
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
            pbPerc.textContent = message.pitchBendDetails.currentPitchBend * 100;
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
    webaudioManager = new SuperpoweredWebAudio(44100, Superpowered);
    currentPath = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    audioNode = await webaudioManager.createAudioNodeAsync(window.location.href + '/assets/processor.js?date=' + Date.now(), 'MyProcessor', onMessageFromAudioScope);
    // audioNode -> audioContext.destination (audio output)
    webaudioManager.audioContext.suspend();
    audioNode.connect(webaudioManager.audioContext.destination);

    // start polling of pitch bend details from audioworklet
    requestAnimationFrame(requestPitchBendDetails)
}

async function loadFromMainThread() {
    Superpowered.downloadAndDecode(window.location.href + '/assets/track.mp3', audioNode);
}

async function loadJS() {
    Superpowered = await SuperpoweredGlue.Instantiate('ExampleLicenseKey-WillExpire-OnNextUpdate', `${window.location.href}/assets/superpowered-npm.wasm`);
    
    // display the START button
    content = document.getElementById('content');
    content.innerHTML = `<div>
            <button id="startApplication">Start</button>
    </div>`;
    document.getElementById('startApplication').addEventListener('click', loadFromMainThread);
    start();
}

loadJS();
