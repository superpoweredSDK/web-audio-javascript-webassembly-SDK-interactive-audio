
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

    /**
     *  Sets dry and wet simultaneously with a good balance between them. Wet always equals to mix, but dry changes with a curve.
     */
    setMix: (mix: number) => void;
}

/**
 * Simple delay with minimum memory operations.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_4
 */
declare class Delay {
    /**
     * @param maximumDelayMs - Maximum delay in milliseconds. Higher values increase memory usage.
     * @param maximumSamplerate - Maximum sample rate to support. Higher values increase memory usage.
     * @param maximumFrames - Maximum number of frames for the process() call. Has minimum effect on memory usage.
     * @param samplerate - The initial sample rate in Hz.
     */
    constructor(
        maximumDelayMs: number,
        maximumSamplerate: number,
        maximumFrames: number,
        samplerate: number);

    /** Set this when the sample rate changes. */
    samplerate: number;
    /** Delay in milliseconds. */
    delayMs: number

    /**
     * Processes the audio.
     * It's never blocking for real-time usage. You can change any properties concurrently with process().
     * Returns with a pointer to floating point numbers, which is the output with numberOfFrames audio available in it. It is valid until the next call to process().
     */
    process: (
        inMemoryPointer: SuperpoweredMemoryPointer,
        bufferSize: number,
    ) => SuperpoweredMemoryPointer;

    /**
     * Destructor (to free up memory).
     */
    destruct: () => void;
}

/**
 * Flanger with aggressive sound ("jet"). One instance allocates around 80 kb memory.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_5
 */
declare class Flanger extends SuperpoweredProcessor {
    /** Set this when the sample rate changes. */
    samplerate: number;
    /** Turns the effect on/off. False by default. The actual switch will happen on the next process() call for smooth, audio-artifact free operation. */
    enabled: boolean;
    /** 0 to 1. */
    wet: number;
    /** 0 to 1 (0 is 0.3 ms, 1 is 8 ms). */
    depth: number;
    /** The length in beats between the "lowest" and the "highest" jet sound, >= 0.25 and <= 128. */
    lfoBeats: number;
    /** The bpm of the current audio. Limited to >= 40 and <= 250. */
    bpm: number;
    /** True: stereo, false: mono. */
    stereo: boolean;
    /** The flanger has a Clipper inside to prevent overdrive. This is the thresholdDb parameter. */
    clipperThresholdDb: number;
    /** The flanger has a Clipper inside to prevent overdrive. This is the maximumDb parameter. */
    clipperMaximumDb: number;

    /**
     * Returns with the current depth in milliseconds, 0.3f to 8.0f (0.3 ms to 8 ms).
     */
    getDepthMs: () => number;
}

/**
 * Simple gate effect. It doesn't allocate any internal buffers and needs just a few bytes of memory.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_6
 */
declare class Gate extends SuperpoweredProcessor {
    /** Set this when the sample rate changes. */
    samplerate: number;
    /** Turns the effect on/off. False by default. The actual switch will happen on the next process() call for smooth, audio-artifact free operation. */
    enabled: boolean;
    /** Limited to >= 0 and <= 1. */
    wet: number;
    /** Limited to >= 40 and <= 250. */
    bpm: number;
    /** The rhythm in beats to open and close the "gate". From 1/64 beats to 4 beats. (>= 0.015625 and <= 4) */
    beats: number;
}

/**
 * Bpm/beat based loop roll effect. One instance allocates around 1600 kb memory.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_7
 */
declare class Roll {
    /**
     * @param samplerate - The initial sample rate in Hz.
     * @param maximumSamplerate - The maximum sample rate in Hz to support. The higher the larger the memory usage.
     */
    constructor(
        samplerate: number,
        maximumSamplerate: number);

    /** Set this when the sample rate changes. */
    samplerate: number;
    /** Turns the effect on/off. False by default. The actual switch will happen on the next process() call for smooth, audio-artifact free operation. */
    enabled: boolean;
    /** Limited to >= 0 and <= 1. */
    wet: number;
    /** Limited to >= 40 and <= 250. */
    bpm: number;
    /** Limit: 1/64 beats to 4 beats. (>= 0.015625 and <= 4.0). */
    beats: number;

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
 * CPU-friendly reverb. One instance allocates around 120 kb memory.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_8
 */
declare class Reverb {
    /**
     * @param samplerate - The initial sample rate in Hz.
     * @param maximumSamplerate - Maximum sample rate (affects memory usage, the lower the smaller).
     */
    constructor(
        samplerate: number,
        maximumSamplerate: number);

    /** Set this when the sample rate changes. */
    samplerate: number;
    /** Turns the effect on/off. False by default. The actual switch will happen on the next process() call for smooth, audio-artifact free operation. */
    enabled: boolean;
    /** Set dry independently from wet. Don't use the mix property in this case. >= 0 and <= 1. */
    dry: number;
    /** Set wet independently from dry. Don't use the mix property in this case. >= 0 and <= 1. */
    wet: number;
    /** Sets dry and wet simultaneously with a nice constant power curve. Don't change dry and wet in this case. >= 0 and <= 1. */
    mix: number;
    /** Stereo width. >= 0 and <= 1. */
    width: number;
    /** High frequency damping. >= 0 and <= 1. */
    damp: number;
    /** Room size. >= 0 and <= 1. */
    roomSize: number;
    /** Pre-delay in milliseconds. 0 to 500. */
    predelayMs: number;
    /** Frequency of the low cut in Hz (-12 db point). Default: 0 (no low frequency cut). */
    lowCutHz: number;

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
 * White noise + filter. One whoosh instance allocates around 4 kb memory.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_9
 */
declare class Whoosh extends SuperpoweredProcessor {
    /** Set this when the sample rate changes. */
    samplerate: number;
    /** Turns the effect on/off. False by default. The actual switch will happen on the next process() call for smooth, audio-artifact free operation. */
    enabled: boolean;
    /** Limited to >= 0 and <= 1. */
    wet: number;
    /** Limited to >= 20 and <= 20000. */
    frequency: number;
}

/**
 * Compressor with 0 latency. It doesn't allocate any internal buffers and needs less than 1 kb of memory.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_10
 */
declare class Compressor extends SuperpoweredProcessor {
    /** Set this when the sample rate changes. */
    samplerate: number;
    /** Turns the effect on/off. False by default. The actual switch will happen on the next process() call for smooth, audio-artifact free operation. */
    enabled: boolean;

    // @TODO: Parameters

    /**
     * Returns the maximum gain reduction in decibels since the last getGainReductionDb() call.
     */
    getGainReductionDb: () => number;
}

/**
 * Limiter with 32 samples latency. It doesn't allocate any internal buffers and needs less than 1 kb of memory.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_11
 */
declare class Limiter extends SuperpoweredProcessor {
    /** Set this when the sample rate changes. */
    samplerate: number;
    /** Turns the effect on/off. False by default. The actual switch will happen on the next process() call for smooth, audio-artifact free operation. */
    enabled: boolean;

    // @TODO: Parameters

    /**
     * Returns the maximum gain reduction in decibels since the last getGainReductionDb() call.
     */
    getGainReductionDb: () => number;
}

/**
 * Hard knee clipping with 0 latency. It doesn't allocate any internal buffers and needs just a few bytes of memory.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_12
 */
declare class Clipper {
    /**
     *
     */
    constructor();

    // @TODO: Parameters

    /**
     * Processes the audio. Has no return value.
     * It's never blocking for real-time usage. You can change all properties on any thread, concurrently with process().
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

// @TODO: Filter (4.13)

/**
 * Guitar distortion effect including Marshall cabinet, ADA cabinet and V-Twin preamp simulation, 5-band equalizer, bass and treble tone controls and two distortion sounds. One instance allocates around 32 kb memory.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_14
 */
declare class GuitarDistortion extends SuperpoweredProcessor {
    /** Set this when the sample rate changes. */
    samplerate: number;
    /** Turns the effect on/off. False by default. The actual switch will happen on the next process() call for smooth, audio-artifact free operation. */
    enabled: boolean;

    // @TODO: Parameters
}

/**
 * CPU-friendly 3D audio spatializer. One instance allocates around 140 kb memory.
 *
 * The spatializer class also has one Global Spatializer Reverb instance to simulate "room sound". It collects audio from all Spatializer instances and puts a reverb on the signal.
 * https://superpowered.com/js-wasm-sdk/docs.html#section_4_15
 */
declare class Spatializer extends SuperpoweredProcessor {
    /** Set this when the sample rate changes. */
    samplerate: number;

    // @TODO: Parameters

    // @TODO: Custom process() calls
}


declare interface ProcessorConstructableWithSamplerate<T> {
    new(samplerate: number): T;
}

declare interface ProcessorConstructableWithMaxSamplerate<T> {
    new(samplerate: number, maximumSamplerate: number): T;
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
    ThreeBandEQ: ProcessorConstructableWithSamplerate<ThreeBandEQ>;
    Bitcrusher: ProcessorConstructableWithSamplerate<Bitcrusher>;
    Echo: ProcessorConstructableWithSamplerate<Echo>;
    Delay: Delay;   // has custom constructor and process()
    Flanger: ProcessorConstructableWithSamplerate<Flanger>;
    Gate: ProcessorConstructableWithSamplerate<Gate>;
    Roll: ProcessorConstructableWithMaxSamplerate<Roll>;
    Reverb: ProcessorConstructableWithMaxSamplerate<Reverb>;
    Whoosh: ProcessorConstructableWithSamplerate<Whoosh>;
    Compressor: ProcessorConstructableWithSamplerate<Compressor>;
    Limiter: ProcessorConstructableWithSamplerate<Limiter>;
    GuitarDistortion: ProcessorConstructableWithSamplerate<GuitarDistortion>;
}

export declare interface SuperpoweredMemoryPointer {}

export declare interface SuperpoweredFloat32Buffer {
    array: Float32Array;
    pointer: SuperpoweredMemoryPointer;
}
