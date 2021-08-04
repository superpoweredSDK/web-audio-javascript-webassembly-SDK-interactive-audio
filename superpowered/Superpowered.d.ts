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
}

