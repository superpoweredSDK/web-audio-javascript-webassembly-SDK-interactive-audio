export interface SuperpoweredTrackMessage {
    data: {
        SuperpoweredLoad: string;
    } | string;
}

export declare class SuperpoweredTrackLoader {
    constructor(node: AudioWorkletNode);

    onmessage: (message: SuperpoweredTrackMessage) => boolean;
}

