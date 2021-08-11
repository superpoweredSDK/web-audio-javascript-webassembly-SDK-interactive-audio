import { SuperpoweredGlue } from "./SuperpoweredGlueModule";
import {SuperpoweredFloat32Buffer} from "./Superpowered";

export declare class AudioWorkletProcessor {
    Superpowered: SuperpoweredGlue;
    onMessageFromMainScope: (message: any) => void;
    processAudio: (inputBuffer: SuperpoweredFloat32Buffer, outputBuffer: SuperpoweredFloat32Buffer, sampleCount: number) => void;
}

export declare class SuperpoweredWebAudio {
    static AudioWorkletProcessor: AudioWorkletProcessor;
}
