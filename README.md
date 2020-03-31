<p align="center"><img width="450" src="https://superpowered.com/images/superpowered-animated.svg"></p>

Superpowered Inc develops the Superpowered Web Audio JavaScript and WebAssembly SDK ("JS/WASM SDK") for modern web browsers, websites, progressive web apps and more.

Developers can use Superpowered interactive audio features in JavaScript without the need of building, initializing or even touching WebAssembly or C++.

For the most up-to-date information, see: https://superpowered.com/js-wasm-overview


# JavaScript + WebAssembly

The JS/WASM SDK is contained in this repository. For C++ SDKs for native apps, we offer Superpowered C++ Audio SDK, C++ Networking SDK, and C++ Crypto SDK featuring low-power and real-time latency. They can be found here: https://github.com/superpoweredSDK/Low-Latency-Android-iOS-Linux-Windows-tvOS-macOS-Interactive-Audio-Platform/

To create custom WebAssembly libraries using the Emscripten Bitcode version of the C++ SDK, please email hello@superpowered.com.


# Supported Functionality

- Effects: echo, delay, bitcrusher, flanger, gate, roll, reverb, whoosh, compressor, clipper, limiter, 3 band EQ
- Filters: resonant low-pass, resonant high-pass, low-shelf, high-shelf, bandpass, notch, parametric
- Music Analysis: bpm detection, key detection, beatgrid detection, audio waveform, filter bank analysis
- Object-based 3D Audio Spatializer
- Mixing: stereo mixer, mono mixer, crossfading, mixing, volume, peak
- Format conversion (32 bit, 24 bit, 16 bit)
- Audio Resampler
- Time domain to frequency domain, frequency domain to time domain
- Time Stretching, Pitch Shifting
- FFT: complex, real, real-polar
- Web Audio I/O, support for ScriptProcessorNode, Workers, Worklets and Audio Worklet


# Demos

Real-time (NOT RENDERED), low-latency time-stretching in the browser:\
https://superpowered.com/js-wasm-sdk/example_timestretching/

Real-time low-latency reverb and filter in the browser:\
https://superpowered.com/js-wasm-sdk/example_effects/

Real-time low-latency guitar distortion in the browser:\
https://superpowered.com/js-wasm-sdk/example_guitardistortion/


# Supported Web Browsers

The Superpowered Web Audio JavaScript and WebAssembly SDK supports the following web browsers: official public stable versions of all major web browsers, including desktop and mobile variants (iOS, Android), such as Chrome, Safari, Firefox and Opera. The only exception is Microsoft Edge, that requires developer build version 74 minimum.


# Support

Superpowered offers multiple support options.

Developer Documentation (C++): https://superpowered.com/docs/

Developer Documentation (Javascript): https://superpowered.com/js-wasm-sdk/docs.html

Email: support@superpowered.zendesk.com

Knowledge base: https://superpowered.zendesk.com/hc/en-us

StackOverflow: https://stackoverflow.com/search?tab=newest&q=superpowered

YouTube: https://www.youtube.com/playlist?list=PLtRKsB6a4xFMXJrZ9wjscOow3nASBoEbU

Paid support options: https://superpowered.com/support


# Licensing

JS/WASM SDK is licensed separately on a case-by-case basis. Parties interested in using JS/WASM SDK must contact licensing@superpowered.com. Free license may be available at our sole discretion. Parties are encouraged to experiment and create private applications with the JS/WASM SDK, but may not launch publicly and/or without a license, which we shall grant at our sole discretion. Please note that any unauthorized use of JS/WASM SDK may result in interruption of service without notice.

For details, please see: https://superpowered.com/licensing

For licensing inquiries, please email licensing@superpowered.com.


# Custom Application Development Services

Superpowered offers custom development services focusing on low-latency, interactive audio applications for mobile, web, desktop and embedded.

For development inquiries, please email hello@superpowered.com.


# Contact

If you want to be informed about new code releases, bug fixes, general news and information about Superpowered, please email hello@superpowered.com.

For licensing inquiries, please email licensing@superpowered.com.


# Notes

Superpowered FFT benefits from ideas in Construction of a High-Performance FFT by Eric Postpischil (http://edp.org/resume.htm).

The Superpowered MP3 and AAC decoder benefits from optimizations by Ken Cooke.
