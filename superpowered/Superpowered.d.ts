
declare class SuperpoweredProcessor {
    /**
     * Constructor. Enabled is false by default.
     */
    constructor(samplerate: number);

    /**
     * Processes the audio. Always call it in the audio processing callback, regardless if the effect is enabled or not for smooth, audio-artifact free operation.
     * It's never blocking for real-time usage. You can change all properties on any thread, concurrently with process().
     * If process() returns with true, the contents of output are replaced with the audio output. If process() returns with false, the contents of output are not changed.
     */
    process: (
        inMemoryPointer: SuperpoweredMemoryPointer,
        outMemoryPointer: SuperpoweredMemoryPointer,
        bufferSize: number,
    ) => void;

    /**
     * Destructor (to free up memory).
     */
    destruct: () => void;
}

/**
 * Classic three-band equalizer with unique characteristics and total kills.
 * It doesn't allocate any internal buffers and needs just a few bytes of memory.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_1
 */
declare class ThreeBandEQ extends SuperpoweredProcessor {
    /** Set this when the sample rate changes. */
    samplerate: number;
    /** Turns the effect on/off. False by default. The actual switch will happen on the next process() call for smooth, audio-artifact free operation. */
    enabled: boolean;
    /** Low gain. Read-write. 1 is "flat", 2 is +6db. Kill is enabled under -40 db (0.01). Default: 1. Limits: 0 and 8. */
    low: number;
    /** Mid gain. See low for details. */
    mid: number;
    /** // High gain. See low for details. */
    high: number;
};

/**
 * Bit crusher with adjustable frequency and bit depth. Simulates an old-school digital sound card. It doesn't allocate any internal buffers and needs just a few bytes of memory.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_2
 */
declare class Bitcrusher extends SuperpoweredProcessor {
    /** Set this when the sample rate changes. */
    samplerate: number;
    /** Turns the effect on/off. False by default. The actual switch will happen on the next process() call for smooth, audio-artifact free operation. */
    enabled: boolean;
    /** Frequency in Hz, from 20 Hz to the half of the samplerate. */
    frequency: number;
    /** // Bit depth, from 1 to 16. */
    bits: number;
}

/**
 * Simple echo ("delay effect"). One instance allocates around 770 kb memory.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_3
 */
declare class Echo extends SuperpoweredProcessor {
    /** Set this when the sample rate changes. */
    samplerate: number;
    /** Turns the effect on/off. False by default. The actual switch will happen on the next process() call for smooth, audio-artifact free operation. */
    enabled: boolean;
    /** 0 <= and <= 1. Read-write. */
    dry: number;
    /** 0 <= and <= 1. Read-write. */
    wet: number;
    /** 40 <= and <= 250. Read-write. */
    bpm: number;
    /** Delay in beats, >= 0.03125 and <= 2.0. Read-write. */
    beats: number;
    /** 0 <= and <= 0.99. Read-write. */
    decay: number;
    /** Sets dry and wet simultaneously with a good balance between them. Wet always equals to mix, but dry changes with a curve. */
    setMix: (mix: number) => void;
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
    bufferToWASM(output: SuperpoweredFloat32Buffer, input: AudioBuffer): void;
    bufferToJS(input: SuperpoweredFloat32Buffer, output: AudioBuffer): void;

    // Flesh this out with proper types as we go
    ThreeBandEQ: ProcessorConstructable<ThreeBandEQ>;
    Bitcrusher: ProcessorConstructable<Bitcrusher>;
    Echo: ProcessorConstructable<Echo>;
}

export declare interface SuperpoweredMemoryPointer {}

export declare interface SuperpoweredFloat32Buffer {
    array: Float32Array;
    pointer: SuperpoweredMemoryPointer;
}
