// Type declarations for snarkjs
declare module 'snarkjs' {
  export namespace groth16 {
    export function fullProve(
      input: any,
      wasmFile: string,
      zkeyFileName: string,
      logger?: any
    ): Promise<{
      proof: any;
      publicSignals: string[];
    }>;

    export function verify(
      vk_verifier: any,
      publicSignals: string[],
      proof: any,
      logger?: any
    ): Promise<boolean>;
  }

  export namespace plonk {
    export function fullProve(
      input: any,
      wasmFile: string,
      zkeyFileName: string,
      logger?: any
    ): Promise<{
      proof: any;
      publicSignals: string[];
    }>;

    export function verify(
      vk_verifier: any,
      publicSignals: string[],
      proof: any,
      logger?: any
    ): Promise<boolean>;
  }

  export namespace zKey {
    export function exportVerificationKey(
      zkeyName: string,
      logger?: any
    ): Promise<any>;
  }
}
