import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    // Semua file memakai satu emulator dan memanggil clearFirestore(), jadi tidak boleh paralel.
    fileParallelism: false
  }
});
