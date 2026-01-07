declare module "murmurhash3js-revisited" {
  export const x86: {
    hash32(input: string, seed?: number): number;
    hash128(input: string, seed?: number): string;
  };
  
  export const x64: {
    hash128(input: string, seed?: number): string;
  };
}

