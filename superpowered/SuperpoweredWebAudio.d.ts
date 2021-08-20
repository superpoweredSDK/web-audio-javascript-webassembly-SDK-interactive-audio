import {Superpowered, SuperpoweredFloat32Buffer} from "./Superpowered";

export declare namespace SuperpoweredWebAudio {
    export class AudioWorkletProcessor {
        constructor(
            superpowered: Superpowered,
            onMessageFromAudioScope: (message: any) => void,
            samplerate: number,
        );

        // Superpowered-specific
        Superpowered: Superpowered;
        onMessageFromMainScope(message: any): void;
        processAudio(
            inputBuffer: SuperpoweredFloat32Buffer,
            outputBuffer: SuperpoweredFloat32Buffer,
            sampleCount: number,
            parameters?: any
        ): void;

        // built-in
        readonly port: MessagePort;
        process(
            inputs: Float32Array[][],
            outputs: Float32Array[][],
            parameters: Record<string, Float32Array>,
        ): boolean;
    }
}
