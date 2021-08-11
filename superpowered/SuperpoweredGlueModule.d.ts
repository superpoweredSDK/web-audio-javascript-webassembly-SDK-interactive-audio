import {Superpowered, SuperpoweredFloat32Buffer} from "./Superpowered";

export declare class SuperpoweredGlue {
  constructor();
  static fetch: (url: string) => Promise<Superpowered>;

  bufferToWASM(output: SuperpoweredFloat32Buffer, input: AudioBuffer): void;
  bufferToJS(input: SuperpoweredFloat32Buffer, output: AudioBuffer): void;
}
