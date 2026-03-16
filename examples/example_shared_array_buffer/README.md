# Shared Array Buffer example

This example demonstrates how you can load audio from various threads while playback is in progress. Memory is allocated upfront using a Shared Array Buffer (SAB) to enable efficient audio data sharing between threads. This allows for seamless audio playback without interruptions, even when loading new audio assets from the main thread, audio thread, or a Worker.

This feature is available from Superpowered v2.8.0 and requires modern browsers that support Shared Array Buffers.

# To run

Because of the required HTTP headers to enable SharedArrayBuffers in browsers, there is also a small node.js server included to quickly provide the correct hosting setup.

`npm install`
`npm run start`

Then go to `http://localhost:8000`

