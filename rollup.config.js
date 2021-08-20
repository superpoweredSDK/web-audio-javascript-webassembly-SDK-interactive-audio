import pkg from './package.json';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default {
  input: 'index.js',
  plugins: [
    commonjs(),
    copy({
      targets: [
        { src: 'index.d.ts', dest: 'dist'},
        { src: 'superpowered/**/*.d.ts', dest: 'dist/superpowered'},
        { src: 'superpowered/**/*.wasm', dest: 'dist/superpowered'},
      ],
    }),
  ],
  output: [
    {
      file: pkg.main,
      format: 'cjs',
    },
    {
      file: pkg.module,
      format: 'esm',
    },
  ],
};
