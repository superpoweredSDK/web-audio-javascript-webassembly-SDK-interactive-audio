declare class SuperpoweredProcessor {
    constructor(samplerate: number);
    process: (inMemoryPointer: any, outMemoryPointer: any, bufferSize: number) => void;
}

declare class Bitcrusher extends SuperpoweredProcessor {
    enabled: boolean;
    frequency: number;
    bits: number;
}

declare interface ProcessorConstructable<T> {
    new(samplerate: number): T;
}

export declare class Superpowered {
    Initialize(options: {
        licenseKey: string;
    } & Partial<{
        enableAudioAnalysis: boolean;
        enableFFTAndFrequencyDomain: boolean;
        enableAudioTimeStretching: boolean;
        enableAudioEffects: boolean;
        enableAudioPlayerAndDecoder: boolean;
        enableCryptographics: boolean;
        enableNetworking: boolean;
    }>): void;

    wasmCode: any;
    __maxChannels__: number;

    createFloatArray(length: number): SuperpoweredFloat32Buffer;

    // Flesh this out with proper types as we go
    Bitcrusher: ProcessorConstructable<Bitcrusher>;
}

export declare interface SuperpoweredFloat32Buffer {
    array: Float32Array;
}
